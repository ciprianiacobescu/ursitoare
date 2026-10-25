import assert from "node:assert/strict";
import { test } from "node:test";
import { transpile } from "../src/transpile.ts";

const META = `{ id: "t", version: "1.0.0", inputs: { type: "object", properties: {}, required: [] } }`;
const wrap = (body: string, pre = "") => `import { flow } from "@ursitoare/flow";\n${pre}\nflow(${META}, f => {\n${body}\n});\n`;
const one = async (src: string, opts = {}) => {
  const r = await transpile(src, opts);
  return r;
};
const codes = (r: { errors: Array<{ code: string }> }) => r.errors.map((e) => e.code);

test("a minimal valid program transpiles", async () => {
  const r = await one(wrap(`f.end("done", { status: "completed" });`));
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.doc, { ursitoare: "0.1", flow: "t", version: "1.0.0", inputs: { type: "object", properties: {}, required: [] }, start: "done", nodes: { done: { kind: "end", status: "completed" } } });
});

test("types are stripped (annotations, interfaces, generics, as, import type, enums)", async () => {
  const r = await one(
    `import { flow } from "@ursitoare/flow";\nimport type { Foo } from "./types";\ninterface Opts { a: number }\nconst x: number = 1 as number;\nenum E { A = "a" }\nflow<any>(${META}, (f: any): void => {\n  f.end("done", { status: E.A === "a" ? "completed" : "failed", output: { n: x } });\n});`,
  );
  assert.deepEqual(r.errors, []);
  assert.deepEqual((r.doc as any).nodes.done, { kind: "end", status: "completed", output: { n: 1 } });
});

test("the import line is optional and `export default` is allowed", async () => {
  const r = await one(`export default flow(${META}, f => { f.end("done", { status: "completed" }); });`);
  assert.deepEqual(r.errors, []);
});

test("console.* is a no-op, not a ReferenceError", async () => {
  const r = await one(wrap(`console.log("hi"); f.end("done", { status: "completed" });`));
  assert.deepEqual(r.errors, []);
});

// ---- L0_SYNTAX
test("L0_SYNTAX: a syntax error reports the original line", async () => {
  const r = await one(`import { flow } from "@ursitoare/flow";\n\nflow({ id: "x" , f => {\n});\n`);
  assert.equal(r.doc, undefined);
  assert.equal(r.errors[0].code, "L0_SYNTAX");
  assert.equal(r.errors[0].layer, "L0");
  assert.equal(r.errors[0].line, 3);
});

test("L0_SYNTAX: top-level await is not available", async () => {
  const r = await one(wrap(`f.end("a", { status: "completed" });`, `await Promise.resolve(1);`));
  assert.deepEqual(codes(r), ["L0_SYNTAX"]);
});

// ---- L0_EVAL_ERROR
test("L0_EVAL_ERROR: a thrown error reports message and original line", async () => {
  const r = await one(wrap(`f.end("a", { status: "completed" });\nthrow new Error("boom");`));
  assert.deepEqual(codes(r), ["L0_EVAL_ERROR"]);
  assert.match(r.errors[0].message, /boom/);
  assert.equal(r.errors[0].line, 5);
});

test("L0_EVAL_ERROR: reading a missing property of an undefined value", async () => {
  const r = await one(wrap(`const x = f.end("a", { status: "completed" });\nconst y = (x as any).output.field;`));
  assert.deepEqual(codes(r), ["L0_EVAL_ERROR"]);
  assert.match(r.errors[0].message, /TypeError/);
});

test("L0_EVAL_ERROR: any import other than @ursitoare/flow", async () => {
  for (const imp of [`import fs from "fs";\nfs.x;`, `import "side-effect";`, `import { a } from "./other";\nconsole.log(a);`]) {
    const r = await one(imp + "\n" + wrap(`f.end("a", { status: "completed" });`));
    assert.deepEqual(codes(r), ["L0_EVAL_ERROR"], imp);
    assert.match(r.errors[0].message, /imports are not allowed/, imp);
  }
});

test("L0_EVAL_ERROR: dynamic import and require are unavailable", async () => {
  const a = await one(wrap(`f.end("a", { status: "completed" });`, `const m = require("fs");`));
  assert.deepEqual(codes(a), ["L0_EVAL_ERROR"]);
});

test("L0_EVAL_ERROR: Date and Math.random do not exist", async () => {
  const a = await one(wrap(`f.end("a", { status: "completed", output: { t: Date.now() } });`));
  assert.deepEqual(codes(a), ["L0_EVAL_ERROR"]);
  assert.match(a.errors[0].message, /Date/);
  const b = await one(wrap(`f.end("a", { status: "completed", output: { t: Math.random() } });`));
  assert.deepEqual(codes(b), ["L0_EVAL_ERROR"]);
  const c = await one(wrap(`f.end("a", { status: "completed", output: { t: new Date().getTime() } });`));
  assert.deepEqual(codes(c), ["L0_EVAL_ERROR"]);
});

test("L0_EVAL_ERROR: runaway recursion is a stack overflow, not a crash", async () => {
  const r = await one(wrap(`function g(n: number): number { return g(n + 1) + 1; }\ng(0);`));
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0].code, "L0_EVAL_ERROR");
  assert.equal((await one(wrap(`f.end("a", { status: "completed" });`))).errors.length, 0, "the engine survives");
});

test("L0_EVAL_ERROR (or timeout): a memory bomb is contained and the next run still works", async () => {
  const r = await one(wrap(`const a: any[] = [];\nwhile (true) a.push(new Array(100000).fill(1));`), { timeoutMs: 3000 });
  assert.equal(r.doc, undefined);
  assert.ok(["L0_EVAL_ERROR", "L0_TIMEOUT"].includes(r.errors[0].code), JSON.stringify(r.errors));
  const ok = await one(wrap(`f.end("a", { status: "completed" });`));
  assert.deepEqual(ok.errors, []);
});

// ---- L0_TIMEOUT
test("L0_TIMEOUT: an infinite loop is interrupted", async () => {
  const t0 = performance.now();
  const r = await one(wrap(`while (true) {}`), { timeoutMs: 300 });
  assert.deepEqual(codes(r), ["L0_TIMEOUT"]);
  assert.ok(performance.now() - t0 < 3000);
  assert.deepEqual((await one(wrap(`f.end("a", { status: "completed" });`))).errors, [], "the engine survives");
});

test("L0_TIMEOUT: an infinite loop outside flow() is interrupted too", async () => {
  const r = await one(`for (;;) {}`, { timeoutMs: 300 });
  assert.deepEqual(codes(r), ["L0_TIMEOUT"]);
});

// ---- L0_NO_FLOW
test("L0_NO_FLOW: the file never calls flow()", async () => {
  for (const src of [``, `const x = 1;`, `import { flow } from "@ursitoare/flow";\nconst g = () => flow;`]) {
    const r = await one(src);
    assert.deepEqual(codes(r), ["L0_NO_FLOW"], src);
  }
});

// ---- L0_BUILDER_MISUSE
const misuse = async (body: string, re: RegExp, pre = "") => {
  const r = await one(wrap(body, pre));
  assert.equal(r.doc, undefined, body);
  assert.ok(codes(r).includes("L0_BUILDER_MISUSE"), `${body}: ${JSON.stringify(r.errors)}`);
  assert.match(r.errors.find((e) => e.code === "L0_BUILDER_MISUSE")!.message, re, body);
  return r;
};

test("L0_BUILDER_MISUSE: duplicate node id (with the line of the second call)", async () => {
  const r = await misuse(`f.wait("a", { duration: "PT1S" });\nf.wait("a", { duration: "PT1S" });`, /duplicate node id "a"/);
  assert.equal(r.errors[0].line, 5);
});
test("L0_BUILDER_MISUSE: flow() called twice", async () => {
  const r = await one(wrap(`f.end("a", { status: "completed" });`) + `flow(${META}, f => { f.end("b", { status: "completed" }); });`);
  assert.ok(codes(r).includes("L0_BUILDER_MISUSE"));
});
test("L0_BUILDER_MISUSE: node id must be a string", async () => {
  await misuse(`f.end(42 as any, { status: "completed" });`, /first argument must be the node id/);
});
test("L0_BUILDER_MISUSE: a node handle used as a value", async () => {
  await misuse(`const a = f.wait("a", { duration: "PT1S" });\nf.end("b", { status: "completed", output: { x: a } });`, /node handle cannot be used as a value/);
});
test("L0_BUILDER_MISUSE: f.cases on a node without cases, f.next on end / decide", async () => {
  await misuse(`const a = f.wait("a", { duration: "PT1S" });\nf.cases(a, { x: "b" });`, /has no cases/);
  await misuse(`const e = f.end("e", { status: "completed" });\nf.next(e, "x");`, /ends the flow/);
  await misuse(`const d = f.llmDecide("d", { outcomes: ["a", "b"] });\nf.next(d, "x");`, /use f.cases/);
});
test("L0_BUILDER_MISUSE: f.cases / f.next twice, unknown node, string or handle accepted", async () => {
  await misuse(`const d = f.llmDecide("d", { outcomes: ["a", "b"] });\nf.cases(d, { a: "x", b: "y" });\nf.cases(d, { a: "x", b: "y" });`, /already set/);
  await misuse(`const w = f.wait("w", { duration: "PT1S" });\nf.next(w, "x");\nf.next(w, "y");`, /already set/);
  await misuse(`f.next("ghost", "x");`, /no node "ghost"/);
});
test("L0_BUILDER_MISUSE: values JSON cannot hold", async () => {
  await misuse(`f.end("a", { status: "completed", output: { x: () => 1 } });`, /function cannot be used as a value/);
  await misuse(`f.end("a", { status: "completed", output: { x: NaN } });`, /not a JSON number/);
  await misuse(`f.end("a", { status: "completed", output: { x: [undefined] } });`, /undefined cannot be a list element/);
  await misuse(`f.end("a", { status: "completed", output: { x: new Map() } });`, /only plain objects/);
});
test("L0_BUILDER_MISUSE: a non-object options argument and too many arguments", async () => {
  await misuse(`f.end("a", "completed" as any);`, /options object/);
  await misuse(`f.block("a", "x@1", {}, {} as any);`, /too many arguments/);
});
test("L0_BUILDER_MISUSE: async builder function", async () => {
  const r = await one(`flow(${META}, async f => { f.end("a", { status: "completed" }); });`);
  assert.ok(codes(r).includes("L0_BUILDER_MISUSE"), JSON.stringify(r.errors));
});
test("L0_BUILDER_MISUSE: builder used after flow() returned", async () => {
  const r = await one(`let g: any;\nflow(${META}, f => { g = f; f.end("a", { status: "completed" }); });\ng.end("b", { status: "completed" });`);
  assert.ok(codes(r).includes("L0_BUILDER_MISUSE"));
});
test("L0_BUILDER_MISUSE: a misuse swallowed by try/catch is still reported", async () => {
  const r = await one(wrap(`try { f.wait("a", { duration: "PT1S" }); f.wait("a", { duration: "PT1S" }); } catch (e) {}\nf.end("e", { status: "completed" });`));
  assert.equal(r.doc, undefined);
  assert.ok(codes(r).includes("L0_BUILDER_MISUSE"));
});
test("L0_BUILDER_MISUSE: wrong flow() arguments", async () => {
  assert.ok(codes(await one(`flow(1 as any, () => {});`)).includes("L0_BUILDER_MISUSE"));
  assert.ok(codes(await one(`flow(${META});`)).includes("L0_BUILDER_MISUSE"));
  assert.ok(codes(await one(`flow(${META}, 5 as any);`)).includes("L0_BUILDER_MISUSE"));
});

// ---- what is NOT an L0 error: content problems pass through to the validator layers
test("content mistakes are not L0 errors: unknown options, missing fields and bad values pass through unchanged", async () => {
  const r = await one(wrap(`f.llmExtract("x", { input: {}, retries: 3, instructions: 5 as any });\nf.end("e", { status: "weird", next: "x" });`));
  assert.deepEqual(r.errors, []);
  const nodes = (r.doc as any).nodes;
  assert.deepEqual(nodes.x, { kind: "llm.extract", input: {}, instructions: 5, retries: 3, next: "e" });
  assert.deepEqual(nodes.e, { kind: "end", status: "weird", next: "x" });
});

// ---- builder semantics
test("default sequencing: next = the following node-creating call; f.cases / f.next / f.template do not count", async () => {
  const r = await one(
    wrap(`const a = f.wait("a", { duration: "PT1S" });
const d = f.llmDecide("d", { input: {}, instructions: "i", outcomes: ["x", "y"] });
f.cases(d, { x: "e", y: "e" });
f.template\`ignored \${f.inputs.k}\`;
f.wait("b", { duration: "PT1S" });
f.wait("c", { duration: "PT1S" });
f.next("b", "e");
f.end("e", { status: "completed" });
f.wait("z", { duration: "PT1S" });`),
  );
  assert.deepEqual(r.errors, []);
  const n = (r.doc as any).nodes;
  assert.equal(n.a.next, "d");
  assert.equal(n.d.next, undefined);
  assert.deepEqual(n.d.cases, { x: "e", y: "e" });
  assert.equal(n.b.next, "e", "explicit f.next wins over the default (which would be c)");
  assert.equal(n.c.next, "e");
  assert.equal(n.e.next, undefined, "end never gets next");
  assert.equal(n.z.next, undefined, "the last node gets nothing");
  assert.equal((r.doc as any).start, "a");
});

test("explicit f.start, and handles are accepted wherever an id is", async () => {
  const r = await one(
    wrap(`const e = f.end("e", { status: "completed" });
const w = f.wait("w", { duration: "PT1S" });
f.next(w, e);
f.start(w);
const s = f.switch("s", { on: f.inputs.k, default: e });
f.cases(s, { a: w });
const h = f.humanForm("h", { assigneeRole: "r", formSchema: {}, timeout: "PT1H", onTimeout: e });`),
  );
  assert.deepEqual(r.errors, []);
  const d = r.doc as any;
  assert.equal(d.start, "w");
  assert.equal(d.nodes.w.next, "e");
  assert.equal(d.nodes.s.default, "e");
  assert.deepEqual(d.nodes.s.cases, { a: "w" });
  assert.equal(d.nodes.h.on_timeout, "e");
});

test("references: spelling is preserved (outcome vs output.outcome), deep paths, item, nested literals", async () => {
  const r = await one(
    wrap(`const d = f.llmDecide("d", { input: {}, instructions: "i", outcomes: ["x", "y"] });
f.cases(d, { x: "e", y: "e" });
f.foreach("loop", { items: f.inputs.list.deep, uses: "b@1", with: { a: f.item, b: f.item.name.first, c: [f.item.k, "lit"], d: { e: d.outcome, g: d.out.outcome, h: d.out.rationale } }, maxParallel: 2 });
f.end("e", { status: "completed", output: { text: f.template\`a \${d.outcome} b \${d.out.rationale} \${3}\`, plain: \`x \${f.inputs.q}\`, only: f.inputs.q, lit: "\${{ not a ref }}" } });`),
  );
  assert.deepEqual(r.errors, []);
  const n = (r.doc as any).nodes;
  assert.equal(n.loop.items, "${{ inputs.list.deep }}");
  assert.deepEqual(n.loop.with, { a: "${{ item }}", b: "${{ item.name.first }}", c: ["${{ item.k }}", "lit"], d: { e: "${{ nodes.d.outcome }}", g: "${{ nodes.d.output.outcome }}", h: "${{ nodes.d.output.rationale }}" } });
  assert.equal(n.loop.max_parallel, 2);
  assert.deepEqual(n.e.output, { text: "a ${{ nodes.d.outcome }} b ${{ nodes.d.output.rationale }} 3", plain: "x ${{ inputs.q }}", only: "${{ inputs.q }}", lit: "${{ not a ref }}" });
});

test("a reference with no path stays as written, so the validator rejects it exactly as it would in YAML", async () => {
  const r = await one(wrap(`const a = f.wait("a", { duration: "PT1S" });\nf.end("e", { status: "completed", output: { bad: a.out, bare: f.inputs } });`));
  assert.deepEqual(r.errors, []);
  assert.deepEqual((r.doc as any).nodes.e.output, { bad: "${{ nodes.a.output }}", bare: "${{ inputs }}" });
});

test("undefined object members are dropped; key order and result are deterministic", async () => {
  const src = wrap(`f.end("e", { status: "completed", output: { a: 1, b: undefined, c: null, d: [1, "2", true] } });`);
  const a = await one(src);
  const b = await one(src);
  assert.deepEqual((a.doc as any).nodes.e.output, { a: 1, c: null, d: [1, "2", true] });
  assert.equal(JSON.stringify(a.doc), JSON.stringify(b.doc));
});

test("meta: description, extra top-level keys pass through, ursitoare can be overridden", async () => {
  const r = await one(`flow({ id: "t", version: "1.0.0", description: "d", inputs: {}, ursitoare: "9", extra: 1 }, f => { f.end("e", { status: "completed" }); });`);
  assert.deepEqual(r.errors, []);
  const d = r.doc as any;
  assert.deepEqual(Object.keys(d), ["ursitoare", "flow", "version", "description", "inputs", "start", "nodes", "extra"]);
  assert.equal(d.ursitoare, "9");
});

test("snake_case option spellings are accepted too (same document as camelCase)", async () => {
  const a = await one(wrap(`f.llmExtract("x", { input: {}, instructions: "i", outputSchema: { type: "object" }, modelProfile: "fast" });`));
  const b = await one(wrap(`f.llmExtract("x", { input: {}, instructions: "i", output_schema: { type: "object" }, model_profile: "fast" });`));
  assert.deepEqual(a.doc, b.doc);
});

test("a source over the size limit is rejected, not evaluated", async () => {
  const r = await transpile("x".repeat(100), { maxSourceChars: 50 });
  assert.deepEqual(codes(r), ["L0_SYNTAX"]);
});

test("the sandbox is fresh for every call (no state leaks between transpiles)", async () => {
  const a = await one(`(globalThis as any).leak = 1;\n` + wrap(`f.end("a", { status: "completed" });`));
  assert.deepEqual(a.errors, []);
  const b = await one(wrap(`f.end("a", { status: "completed", output: { v: typeof (globalThis as any).leak } });`));
  assert.equal((b.doc as any).nodes.a.output.v, "undefined");
});

test("tolerated spellings: cases/next given as options behave like f.cases/f.next; both ways at once is a misuse", async () => {
  const a = await one(wrap(`f.llmDecide("d", { input: {}, instructions: "i", outcomes: ["a", "b"], cases: { a: "e", b: "e" } });\nf.llmExtract("x", { input: {}, instructions: "i", outputSchema: { type: "object" }, next: "e" });\nf.end("e", { status: "completed" });`));
  assert.deepEqual(a.errors, []);
  const n = (a.doc as any).nodes;
  assert.deepEqual(n.d.cases, { a: "e", b: "e" });
  assert.equal(n.x.next, "e");
  await misuse(`const d = f.llmDecide("d", { outcomes: ["a", "b"], cases: { a: "e", b: "e" } });\nf.cases(d, { a: "e", b: "e" });`, /already set/);
});

test("values nest to 110 levels; deeper is a clear misuse, not a crash", async () => {
  let deep: any = { type: "string" };
  for (let i = 0; i < 55; i++) deep = { type: "object", properties: { a: deep } };
  const ok = await transpile(`flow({ id: "x", version: "1.0.0", inputs: ${JSON.stringify(deep)} }, f => { f.end("e", { status: "completed" }); });`);
  assert.deepEqual(ok.errors, []);
  const bad = await one(wrap(`f.end("e", { status: "completed", output: ${"[".repeat(130)}1${"]".repeat(130)} as any });`));
  assert.deepEqual(codes(bad), ["L0_BUILDER_MISUSE"]);
  assert.match(bad.errors[0].message, /deeper than 120/);
});

test("a flow with 2000 nodes transpiles well inside the budget", async () => {
  const body = Array.from({ length: 2000 }, (_, i) => `f.wait("n${i}", { duration: "PT1S" });`).join("\n") + `\nf.end("e", { status: "completed" });`;
  const t0 = performance.now();
  const r = await one(wrap(body));
  assert.deepEqual(r.errors, []);
  assert.equal(Object.keys((r.doc as any).nodes).length, 2001);
  assert.ok(performance.now() - t0 < 1500);
});
