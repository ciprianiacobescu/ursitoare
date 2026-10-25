import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { ALL_ERROR_CODES, ERROR_CODES, WARNING_CODES } from "../src/codes.ts";
import { parseFlowText } from "../src/io.ts";
import { validate } from "../src/validate.ts";
import { FORMAT_DIR, RF1, catalogue, codes, fixtures, loadDoc, validateFile } from "./helpers.ts";

const invalid = fixtures("invalid");
const valid = fixtures("valid");
const warnings = fixtures("warnings");

describe("RF-1 (normative example)", () => {
  it("passes L1, L2 and L3 with zero errors", () => {
    const r = validateFile(RF1);
    assert.deepEqual(r.errors, []);
    assert.equal(r.ok, true);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
  });
  it("only warns about the lethal trifecta (untrusted read + private read + send/pay)", () => {
    assert.deepEqual(codes(validateFile(RF1).warnings), ["W_LETHAL_TRIFECTA"]);
  });
  it("is accepted as JSON too", () => {
    const doc = loadDoc(RF1);
    const p = parseFlowText(JSON.stringify(doc), "json");
    assert.deepEqual(validate(p.doc, catalogue).errors, []);
  });
  it("is stable under node reordering and repeated runs (deterministic)", () => {
    const doc = loadDoc(RF1);
    const rev = { ...doc, nodes: Object.fromEntries(Object.entries(doc.nodes).reverse()) };
    assert.deepEqual(validate(rev, catalogue), validate(doc, catalogue));
    assert.deepEqual(validate(doc, catalogue), validate(doc, catalogue));
  });
});

describe("invalid fixtures: each states its expected code(s); the exact code set must match", () => {
  it("there are at least 25 invalid fixtures", () => assert.ok(invalid.length >= 25, `${invalid.length}`));
  for (const f of invalid) {
    it(`${f.name} -> ${f.expect.join(", ")}`, () => {
      assert.ok(f.expect.length > 0, "fixture must declare '# expect:'");
      const r = validateFile(f.path);
      assert.equal(r.ok, false);
      assert.deepEqual(codes(r.errors), f.expect, r.errors.map((e) => `${e.code} ${e.path}: ${e.message}`).join("\n"));
      // layer gating: errors never come from more than one layer, and later layers are not run
      const layers = new Set(r.errors.map((e) => e.layer));
      assert.equal(layers.size, 1, `errors from several layers: ${[...layers]}`);
      const layer = [...layers][0];
      assert.equal(r.layers_run.at(-1), layer);
      for (const e of r.errors) {
        assert.ok(e.code.startsWith(e.layer + "_"), `${e.code} is not in layer ${e.layer}`);
        assert.equal(typeof e.message, "string");
        assert.ok(e.message.length > 0);
        assert.ok(e.node === null || typeof e.node === "string");
        assert.equal(typeof e.path, "string");
      }
    });
  }
});

describe("error-code coverage", () => {
  const covered = new Set(invalid.flatMap((f) => f.expect));
  it("every documented error code has at least one invalid fixture", () => {
    const missing = ALL_ERROR_CODES.filter((c) => !covered.has(c));
    assert.deepEqual(missing, []);
  });
  it("every code asserted by a fixture is documented", () => {
    assert.deepEqual([...covered].filter((c) => !ALL_ERROR_CODES.includes(c)), []);
  });
  it("every documented warning code has a fixture", () => {
    const w = new Set([...warnings, ...valid].flatMap((f) => f.expectWarnings));
    assert.deepEqual(WARNING_CODES.filter((c) => !w.has(c)), []);
  });
  it("the validator source emits no undocumented code", () => {
    const src = ["validate.ts", "io.ts"].map((f) => readFileSync(join(FORMAT_DIR, "src", f), "utf8")).join("\n");
    const used = new Set([...src.matchAll(/"((?:L[123]_|W_)[A-Z_]+)"/g)].map((m) => m[1]));
    const known = new Set<string>([...ALL_ERROR_CODES, ...WARNING_CODES]);
    assert.deepEqual([...used].filter((c) => !known.has(c)), []);
    assert.deepEqual([...known].filter((c) => !used.has(c)), [], "documented but never emitted");
  });
  it("codes are grouped under their layer prefix", () => {
    for (const [layer, cs] of Object.entries(ERROR_CODES)) for (const c of cs) assert.ok(c.startsWith(layer + "_"));
  });
});

describe("valid fixtures (false-failure guard): zero errors, exact warnings", () => {
  for (const f of valid) {
    it(f.name, () => {
      const r = validateFile(f.path);
      assert.deepEqual(r.errors.map((e) => `${e.code} ${e.path}: ${e.message}`), []);
      assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
      assert.deepEqual(codes(r.warnings), f.expectWarnings);
    });
  }
});

describe("warnings are warnings, never errors", () => {
  for (const f of warnings) {
    it(`${f.name} -> ${f.expectWarnings.join(", ") || "no warning"}`, () => {
      const r = validateFile(f.path);
      assert.deepEqual(r.errors.map((e) => e.code), []);
      assert.deepEqual(codes(r.warnings), f.expectWarnings);
    });
  }
});

describe("taint", () => {
  const send = (body: string) => ({
    ursitoare: "0.1", flow: "t", version: "1.0.0",
    inputs: { type: "object", properties: { url: { type: "string" } }, required: ["url"] },
    start: "fetch",
    nodes: {
      fetch: { kind: "block", uses: "docs.fetch@1", with: { url: "${{ inputs.url }}" }, next: "extract" },
      extract: { kind: "llm.extract", input: { text: "${{ nodes.fetch.output.content }}" }, instructions: "Extract the summary.", output_schema: { type: "object", properties: { summary: { type: "string" } }, required: ["summary"] }, next: "send" },
      send: { kind: "block", uses: "mail.send@1", with: { to: "a@example.com", subject: "s", body }, next: "done" },
      done: { kind: "end", status: "completed" },
    },
  });
  it("raw docs.fetch@1.content into mail.send@1.body is an error", () => {
    const r = validate(send("${{ nodes.fetch.output.content }}"), catalogue);
    assert.deepEqual(codes(r.errors), ["L3_TAINT_TO_CONSEQUENTIAL"]);
    assert.equal(r.errors[0].node, "send");
    assert.equal(r.errors[0].path, "/nodes/send/with/body");
  });
  it("the same data via llm.extract passes", () => {
    const r = validate(send("${{ nodes.extract.output.summary }}"), catalogue);
    assert.deepEqual(r.errors, []);
  });
  it("untrusted content inside a template is still an error", () => {
    assert.deepEqual(codes(validate(send("x ${{ nodes.fetch.output.content }} y"), catalogue).errors), ["L3_TAINT_TO_CONSEQUENTIAL"]);
  });
});

describe("dominance", () => {
  it("a reference across only one branch of a decide is an error; the same producer upstream is fine", () => {
    const [oneBranch] = invalid.filter((f) => f.name === "l3-not-dominating-one-branch");
    const r = validateFile(oneBranch.path);
    assert.deepEqual(codes(r.errors), ["L3_REF_NOT_DOMINATING"]);
    assert.match(r.errors[0].message, /alert/);
    const [upstream] = valid.filter((f) => f.name === "dominance-before-branch-ok");
    assert.deepEqual(validateFile(upstream.path).errors, []);
  });
  it("RF-1: pay dominates done even though approval can also lead to pay", () => {
    assert.deepEqual(validateFile(RF1).errors, []);
  });
  it("RF-1 mutation: reading pay's output from the rejected end is an error", () => {
    const doc = loadDoc(RF1);
    doc.nodes.rejected.output = { payment_id: "${{ nodes.pay.output.payment_id }}" };
    assert.deepEqual(codes(validate(doc, catalogue).errors), ["L3_REF_NOT_DOMINATING"]);
  });
  it("RF-1 mutation: approval output is not available on the timeout branch", () => {
    const doc = loadDoc(RF1);
    doc.nodes.notify_rejection.with.body = "${{ nodes.approval.output.comment }}";
    // notify_rejection is reachable from classify.reject (no approval at all) -> not dominating
    assert.deepEqual(codes(validate(doc, catalogue).errors), ["L3_REF_NOT_DOMINATING"]);
  });
});

describe("layering", () => {
  it("L2 does not run when L1 fails; L3 does not run when L2 fails", () => {
    const [l1] = invalid.filter((f) => f.name === "l1-required-start");
    assert.deepEqual(validateFile(l1.path).layers_run, ["L1"]);
    const [l2] = invalid.filter((f) => f.name === "l2-unknown-block");
    assert.deepEqual(validateFile(l2.path).layers_run, ["L1", "L2"]);
  });
  it("non-object documents give L1 errors and never throw", () => {
    for (const d of [null, 5, "x", [], [1, 2], true, {}]) {
      const r = validate(d, catalogue);
      assert.equal(r.ok, false);
      assert.ok(r.errors.length > 0);
      assert.ok(r.errors.every((e) => e.layer === "L1"));
    }
  });
});

describe("robustness: mutated RF-1 never crashes the validator", () => {
  // deterministic xorshift PRNG
  let seed = 123456789;
  const rnd = () => ((seed ^= seed << 13), (seed ^= seed >>> 17), (seed ^= seed << 5), ((seed >>> 0) % 100000) / 100000);
  const junk = [null, 0, -1, 1.5, true, "", "x", "${{ nodes.pay.output.nope }}", "${{", [], {}, [1, "a"], { a: { b: null } }, "inputs.invoice_id", "constructor", "__proto__"];
  function paths(v: any, p: (string | number)[] = [], out: (string | number)[][] = []) {
    out.push(p);
    if (v && typeof v === "object") for (const k of Object.keys(v)) paths(v[k], [...p, k], out);
    return out;
  }
  it("5000 random mutations: no INTERNAL_ERROR, no exception, well-formed result", () => {
    const base = loadDoc(RF1);
    for (let i = 0; i < 5000; i++) {
      const d = structuredClone(base);
      const all = paths(d).filter((p) => p.length > 0);
      const n = 1 + Math.floor(rnd() * 3);
      for (let j = 0; j < n; j++) {
        const p = all[Math.floor(rnd() * all.length)];
        let t: any = d;
        for (const k of p.slice(0, -1)) t = t?.[k];
        if (t === undefined || t === null || typeof t !== "object") continue;
        const last = p[p.length - 1];
        if (rnd() < 0.3) delete t[last];
        else t[last] = structuredClone(junk[Math.floor(rnd() * junk.length)]);
      }
      const r = validate(d, catalogue);
      assert.ok(!r.errors.some((e) => e.code === "INTERNAL_ERROR"), JSON.stringify(r.errors.find((e) => e.code === "INTERNAL_ERROR")) + "\n" + JSON.stringify(d));
      assert.equal(r.ok, r.errors.length === 0);
      assert.ok(r.layers_run.length >= 1);
    }
  });
});

describe("fixture directory sanity", () => {
  it("no stray files", () => {
    for (const d of ["invalid", "valid", "warnings"])
      for (const f of readdirSync(join(FORMAT_DIR, "test", "fixtures", d))) assert.ok(f.endsWith(".yaml"), f);
  });
});

describe("durations: schema pattern and rubric parser agree", () => {
  it("same accept/reject decision for a table of durations", async () => {
    const { durationSeconds } = await import("../src/rubric.ts");
    const table = ["PT48H", "P2D", "PT30M", "PT0.5H", "P1DT12H", "P1W", "P1M", "P1Y", "PT90S", "PT1H30M", "P", "PT", "P1H", "PT1D", "48h", "PT-1H", "P1.D", "pt1h", "PT1H ", " PT1H", "P1DT", "PT1H1D"];
    for (const d of table) {
      const doc = loadDoc(RF1);
      doc.nodes.approval.timeout = d;
      const accepted = validate(doc, catalogue).errors.every((e) => e.code !== "L1_PATTERN");
      assert.equal(accepted, durationSeconds(d) !== null, `${JSON.stringify(d)}`);
    }
  });
});
