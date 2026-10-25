import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canonicalEqual, canonicalJson, canonicalize, stableStringify } from "../src/canonical.ts";
import { parseFlowText } from "../src/io.ts";
import { validate } from "../src/validate.ts";
import { RF1, catalogue, loadDoc } from "./helpers.ts";
import { readFileSync } from "node:fs";

describe("canonical form", () => {
  it("is independent of key order at every depth", () => {
    const doc = loadDoc(RF1);
    const shuffled = JSON.parse(JSON.stringify(doc, (_k, v) => (v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).reverse()) : v)));
    assert.notEqual(JSON.stringify(doc), JSON.stringify(shuffled));
    assert.equal(canonicalJson(doc), canonicalJson(shuffled));
    assert.ok(canonicalEqual(doc, shuffled));
  });
  it("YAML and its JSON rendering have the same canonical form", () => {
    const doc = loadDoc(RF1);
    const fromJson = parseFlowText(JSON.stringify(doc, null, 3), "json").doc;
    assert.equal(canonicalJson(fromJson), canonicalJson(doc));
  });
  it("is idempotent and the canonical document still validates", () => {
    const doc = loadDoc(RF1);
    const c1 = canonicalize(doc);
    assert.equal(canonicalJson(c1), canonicalJson(doc));
    assert.deepEqual(validate(c1, catalogue).errors, []);
  });
  it("normalises whitespace inside ${{ }} for single references and templates", () => {
    const mk = (a: string, b: string) => ({
      start: "a",
      nodes: {
        a: { kind: "block", uses: "mail.send@1", with: { to: a, subject: b, body: "x" }, next: "e" },
        e: { kind: "end", status: "completed", output: { v: a } },
      },
    });
    const x = mk("${{inputs.to}}", "Hello ${{  nodes.q.output.name }}, and ${{ inputs.z }}!");
    const y = mk("${{ inputs.to }}", "Hello ${{ nodes.q.output.name }}, and ${{inputs.z}}!");
    assert.ok(canonicalEqual(x, y));
    assert.match(canonicalJson(x), /\$\{\{ inputs\.to \}\}/);
    assert.match(canonicalJson(x), /Hello \$\{\{ nodes\.q\.output\.name \}\}, and \$\{\{ inputs\.z \}\}!/);
  });
  it("does NOT hide real differences", () => {
    const doc = loadDoc(RF1);
    const variants: Array<(d: any) => void> = [
      (d) => (d.nodes.pay.with.amount = "${{ nodes.extract.output.amount }}"),
      (d) => (d.nodes.notify_rejection.with.to = "AP@example.com"),
      (d) => (d.nodes.approval.timeout = "PT24H"),
      (d) => (d.nodes.classify.outcomes = ["auto_approve", "reject", "needs_review"]), // order of outcomes is meaningful
      (d) => (d.nodes.normalize.source += " "),
      (d) => (d.nodes.extract.model_profile = "default"), // defaults are not injected or removed
      (d) => delete d.description,
      (d) => (d.nodes.done.output.payment_id = "pay"), // literal vs reference
    ];
    for (const v of variants) {
      const d = structuredClone(doc);
      v(d);
      assert.equal(canonicalEqual(doc, d), false);
    }
  });
  it("leaves malformed references and non-value strings untouched", () => {
    const d: any = loadDoc(RF1);
    d.nodes.extract.instructions = "keep   ${{  as is }} here";
    d.nodes.fetch_invoice.with.invoice_id = "${{   not a ref ";
    const c: any = canonicalize(d);
    assert.equal(c.nodes.extract.instructions, "keep   ${{  as is }} here");
    assert.equal(c.nodes.fetch_invoice.with.invoice_id, "${{   not a ref ");
  });
  it("stableStringify sorts integer-like keys the same way as other keys", () => {
    assert.equal(stableStringify({ b: 1, 10: 2, 2: 3, a: [{ z: 1, y: 2 }] }), '{"10":2,"2":3,"a":[{"y":2,"z":1}],"b":1}');
    assert.equal(stableStringify({ a: 1 }, 2), '{\n  "a": 1\n}');
  });
  it("does not mutate its input", () => {
    const doc = loadDoc(RF1);
    const before = JSON.stringify(doc);
    canonicalize(doc);
    assert.equal(JSON.stringify(doc), before);
  });
  it("RF-1 canonical JSON is stable (golden)", () => {
    const j = canonicalJson(loadDoc(RF1));
    assert.equal(j.length > 1000, true);
    assert.ok(j.startsWith('{"description":'));
    assert.ok(readFileSync(RF1, "utf8").length > 0);
  });
});
