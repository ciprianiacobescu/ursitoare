import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { canonicalEqual } from "../../format/src/canonical.ts";
import { readFlowFile } from "../../format/src/io.ts";
import { HERE, RF1, TRIAGE, loadDoc } from "./helpers.ts";

const CLI = join(HERE, "..", "src", "cli.ts");
const run = (...args: string[]) => spawnSync(process.execPath, [CLI, ...args], { encoding: "utf8" });
const tmp = mkdtempSync(join(tmpdir(), "format-ts-"));

test("cli print -> transpile reproduces RF-1 (files in, files out)", () => {
  const ts = join(tmp, "rf1.ts");
  const yml = join(tmp, "rf1.yaml");
  assert.equal(run("print", RF1, "--out", ts).status, 0);
  assert.match(readFileSync(ts, "utf8"), /^import \{ flow \} from "@ursitoare\/flow";/);
  const t = run("transpile", ts, "--out", yml);
  assert.equal(t.status, 0, t.stderr);
  const back = readFlowFile(yml);
  assert.deepEqual(back.errors, []);
  assert.ok(canonicalEqual(back.doc, loadDoc(RF1)));
});

test("cli transpile --json reports ok/doc, and L0 errors with exit code 1", () => {
  const good = join(tmp, "good.ts");
  run("print", TRIAGE, "--out", good);
  const g = run("transpile", good, "--json");
  assert.equal(g.status, 0);
  const gj = JSON.parse(g.stdout);
  assert.equal(gj.ok, true);
  assert.ok(canonicalEqual(gj.doc, loadDoc(TRIAGE)));

  const bad = join(tmp, "bad.ts");
  writeFileSync(bad, `flow({ id: "x", version: "1.0.0", inputs: {} }, f => {\n  f.wait("a", { duration: "PT1S" });\n  f.wait("a", { duration: "PT1S" });\n});\n`);
  const b = run("transpile", bad, "--json");
  assert.equal(b.status, 1);
  const bj = JSON.parse(b.stdout);
  assert.equal(bj.ok, false);
  assert.equal(bj.errors[0].layer, "L0");
  assert.equal(bj.errors[0].code, "L0_BUILDER_MISUSE");
  assert.equal(bj.errors[0].line, 3);
  const plain = run("transpile", bad);
  assert.equal(plain.status, 1);
  assert.match(plain.stderr, /L0_BUILDER_MISUSE/);
});

test("cli roundtrip: OK for RF-1, exit 1 with a reason for a document the printer refuses, 2 on usage errors", () => {
  const ok = run("roundtrip", RF1);
  assert.equal(ok.status, 0);
  assert.match(ok.stdout, /round-trip OK/);
  const refused = join(tmp, "refused.yaml");
  writeFileSync(refused, `ursitoare: "0.1"\nflow: x\nversion: 1.0.0\ninputs: {type: object}\nstart: a\nnodes:\n  a: {kind: nope}\n`);
  const r = run("roundtrip", refused);
  assert.equal(r.status, 1);
  assert.match(r.stdout, /FAILED/);
  assert.equal(run().status, 2);
  assert.equal(run("transpile").status, 2);
  assert.equal(run("transpile", join(tmp, "missing.ts")).status, 2);
  assert.equal(run("frobnicate", RF1).status, 2);
});

test("design 4.5 sample shape works verbatim (cases after the decide, template statement, explicit f.next)", () => {
  const src = `import { flow } from "@ursitoare/flow";
flow({ id: "invoice-intake", version: "1.0.0", description: "...",
       inputs: { type: "object", properties: { invoice_id: { type: "string" } }, required: ["invoice_id"] } }, f => {
  const fetchInvoice = f.block("fetch_invoice", "invoices.get@1", { invoice_id: f.inputs.invoice_id });
  const extract = f.llmExtract("extract", { input: { text: fetchInvoice.out.raw_text }, instructions: "...", outputSchema: { type: "object" } });
  const cls = f.llmDecide("classify", { input: { a: extract.out.x }, instructions: "...", outcomes: ["auto_approve", "needs_review", "reject"] });
  f.cases(cls, { auto_approve: "pay", needs_review: "approval", reject: "notify_rejection" });
  f.template\`Invoice \${f.inputs.invoice_id} rejected\`;
  f.end("done", { status: "completed", output: { payment_id: fetchInvoice.out.payment_id } });
  f.next("fetch_invoice", "done");
});`;
  const file = join(tmp, "sample.ts");
  writeFileSync(file, src);
  const r = run("transpile", file, "--json");
  assert.equal(r.status, 0, r.stderr + r.stdout);
  const d = JSON.parse(r.stdout).doc;
  assert.equal(d.nodes.fetch_invoice.next, "done", "explicit f.next overrides the default");
  assert.equal(d.nodes.extract.next, "classify");
  assert.deepEqual(d.nodes.classify.cases, { auto_approve: "pay", needs_review: "approval", reject: "notify_rejection" });
  assert.equal(d.nodes.classify.next, undefined);
});
