import assert from "node:assert/strict";
import { test } from "node:test";
import { canonicalEqual } from "../../format/src/canonical.ts";
import { print, PrintError } from "../src/print.ts";
import { diffCanonical, roundtrip } from "../src/roundtrip.ts";
import { transpile } from "../src/transpile.ts";
import { RF1, loadDoc } from "./helpers.ts";

const base = (nodes: Record<string, unknown>, start: string, extra: Record<string, unknown> = {}) => ({
  ursitoare: "0.1",
  flow: "t",
  version: "1.0.0",
  inputs: { type: "object", properties: { k: { type: "string" } }, required: ["k"] },
  start,
  nodes,
  ...extra,
});

test("negative control: the comparison does fail when the document differs", async () => {
  const doc: any = loadDoc(RF1);
  const r = await transpile(print(doc));
  assert.ok(canonicalEqual(doc, r.doc));
  const tampered = structuredClone(doc);
  tampered.nodes.pay.with.amount = "${{ nodes.normalize.output.currency }}";
  assert.ok(!canonicalEqual(tampered, r.doc));
  assert.deepEqual(diffCanonical(tampered, r.doc), ["nodes.pay.with.amount: \"${{ nodes.normalize.output.currency }}\" -> \"${{ nodes.normalize.output.amount }}\""]);
  const dropped = structuredClone(doc);
  delete dropped.nodes.notify_rejection.with.body;
  assert.ok(!canonicalEqual(dropped, r.doc));
});

test("node ids that are JS reserved words or clash with builder names get safe variable names", async () => {
  const doc = base(
    {
      default: { kind: "wait", duration: "PT1S", next: "f" },
      f: { kind: "wait", duration: "PT1S", next: "flow" },
      flow: { kind: "wait", duration: "PT1S", next: "new" },
      new: { kind: "wait", duration: "PT1S", next: "in" },
      in: { kind: "block", uses: "x@1", with: { a: "${{ nodes.default.output.v }}", b: "${{ nodes.f.output.v }}", c: "${{ nodes.flow.output.v }}", d: "${{ nodes.new.output.v }}" }, next: "end_a" },
      end_a: { kind: "end", status: "completed", output: { x: "${{ nodes.in.output.z }}" } },
    },
    "default",
  );
  const ts = print(doc);
  assert.ok(!/const (default|f|flow|new|in) =/.test(ts), ts);
  const r = await roundtrip(doc);
  assert.ok(r.ok, JSON.stringify(r));
});

test("references that cannot be written as handles stay strings (forward, self, malformed, blocked names)", async () => {
  const doc = base(
    {
      a: { kind: "block", uses: "x@1", with: { fwd: "${{ nodes.b.output.v }}", self: "${{ nodes.a.output.v }}", unknown: "${{ nodes.ghost.output.v }}", malformed: "${{ nodes.b.output }}", expr: "${{ 1 + 2 }}", open: "${{ inputs.k", blocked: "${{ inputs.toString }}", idx: "${{ inputs.k.0 }}", mixed: "text ${{ nodes.b.output.v }} and ${{ inputs.k }}", ws: "${{inputs.k}}", brace: "${ {{ x }}" }, next: "b" },
      b: { kind: "block", uses: "x@1", with: { ok: "${{ nodes.a.output.v }}" }, next: "c" },
      c: { kind: "end", status: "completed" },
    },
    "a",
  );
  const ts = print(doc);
  assert.ok(ts.includes(`"\${{ nodes.b.output.v }}"`), ts);
  assert.ok(ts.includes("a.out.v"), ts);
  const r = await roundtrip(doc);
  assert.ok(r.ok, JSON.stringify(r));
});

test("strings in non-value positions are never rewritten (instructions with ${{ }} and odd spacing survive byte for byte)", async () => {
  const doc = base(
    {
      a: { kind: "llm.extract", input: { t: "${{ inputs.k }}" }, instructions: "use ${{   inputs.k }} here\nand `ticks` and ${js}", output_schema: { type: "object", description: "${{inputs.k}}" }, next: "b" },
      b: { kind: "end", status: "completed" },
    },
    "a",
  );
  const r = await roundtrip(doc);
  assert.ok(r.ok, JSON.stringify(r));
  assert.deepEqual((await transpile(print(doc))).doc, (await transpile(print(doc))).doc);
  const out: any = (await transpile(print(doc))).doc;
  assert.equal(out.nodes.a.instructions, "use ${{   inputs.k }} here\nand `ticks` and ${js}");
});

test("code sources: multi-line, backticks, ${...}, backslashes, CRLF, trailing backslash, no trailing newline", async () => {
  const sources = [
    "return { a: 1 };",
    "return {\n  a: 1\n};\n",
    "const s = `x ${input.a}`;\nreturn { s };\n",
    "const re = /\\d+\\n/;\nreturn { ok: re.test(String(input.a)), s: 'a\\nb' };\n",
    "return {\r\n a: 1\r\n};\r\n",
    "const x = 1; // ends with backslash \\",
    "line1\nline2\\",
    "return { t: '\\u2028' + '\\t' };\n",
    "\n\n  return {};\n\n",
  ];
  for (const source of sources) {
    const doc = base({ c: { kind: "code", language: "js", input: {}, source, output_schema: { type: "object" }, next: "e" }, e: { kind: "end", status: "completed" } }, "c");
    const r = await roundtrip(doc);
    assert.ok(r.ok, `${JSON.stringify(source)}: ${JSON.stringify(r.errors)} ${r.diff.join("|")}\n${r.ts}`);
    assert.equal(((await transpile(print(doc))).doc as any).nodes.c.source, source);
  }
});

test("templates: backslashes, backticks, ${, newlines, tabs and unicode survive", async () => {
  const texts = ["a\\b", "tick ` here", "cost ${x} then", "line\nbreak\ttab", "dollar $ then ${{ inputs.k }} $", "emoji \u{1F600} and é and   sep", "${{ inputs.k }}${{ inputs.k }}", "  ${{ inputs.k }}  "];
  for (const t of texts) {
    const doc = base({ e: { kind: "end", status: "completed", output: { v: t } } }, "e");
    const r = await roundtrip(doc);
    assert.ok(r.ok, `${JSON.stringify(t)}: ${JSON.stringify(r.errors)} ${r.diff.join("|")}\n${r.ts}`);
  }
});

test("switch/cases keys that are numbers, booleans, reserved or odd survive; case order is preserved", async () => {
  const doc = base(
    {
      s: { kind: "switch", on: "${{ inputs.k }}", cases: { "1": "e", "-5": "e", "2.5": "e", true: "e", default: "e", "a b": "e", __proto__: "e", constructor: "e" }, default: "e" },
      e: { kind: "end", status: "completed" },
    },
    "s",
  );
  // build the __proto__ key as an own property (an object literal would set the prototype instead)
  Object.defineProperty((doc.nodes as any).s.cases, "__proto__", { value: "e", enumerable: true, writable: true, configurable: true });
  const r = await roundtrip(doc);
  assert.ok(r.ok, JSON.stringify(r) + r.ts);
});

test("walk order: chains follow next; joins and shared targets get explicit f.next; unreachable nodes are still printed", async () => {
  const doc = base(
    {
      a: { kind: "wait", duration: "PT1S", next: "c" },
      b: { kind: "wait", duration: "PT1S", next: "d" },
      c: { kind: "wait", duration: "PT1S", next: "d" },
      d: { kind: "end", status: "completed" },
      orphan: { kind: "end", status: "failed" },
    },
    "a",
  );
  const ts = print(doc);
  assert.match(ts, /f\.next\(/, "the join at d needs an explicit f.next");
  assert.ok((await roundtrip(doc)).ok, ts);
  assert.ok(ts.includes('"orphan"'));
});

test("the printer refuses what the builder cannot reproduce, with a PrintError", () => {
  assert.throws(() => print(base({ a: { kind: "block", uses: "x@1", with: {}, retries: 3 } }, "a")), PrintError);
  assert.throws(() => print({ ...base({}, "a"), start: undefined }), PrintError);
  assert.throws(() => print(base({ a: { kind: "nope" } }, "a")), PrintError);
  assert.throws(() => print(null), PrintError);
  assert.throws(() => print({ ursitoare: "0.1" }), PrintError);
  assert.throws(() => print(base({ a: { kind: "llm.extract", input: {}, instructions: "i", outputSchema: {} } }, "a")), PrintError);
});

test("printed output is readable: handles for outputs, templates for mixed text, one node per call", () => {
  const ts = print(loadDoc(RF1));
  assert.ok(ts.startsWith('import { flow } from "@ursitoare/flow";'));
  assert.ok(ts.includes("fetchInvoice.out.raw_text"));
  assert.ok(ts.includes("f.template`Invoice ${f.inputs.invoice_id} rejected`"));
  assert.ok(ts.includes("classify.outcome") === false, "RF-1 never reads classify.outcome");
  assert.equal((ts.match(/f\.next\(/g) ?? []).length, 0, "RF-1 needs no explicit f.next in walk order");
  assert.equal((ts.match(/f\.cases\(/g) ?? []).length, 2);
});
