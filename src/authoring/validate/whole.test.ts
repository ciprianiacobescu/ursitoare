import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import * as authoring from "../index.ts";
import type { Catalogue, FlowFormat } from "../index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadTestFlow } from "../../../test/support/catalogue/flows.ts";
import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { CaseGroup } from "../../../test/support/flow-cases/index.ts";
import { FLOW_ERROR_CODES, FLOW_WARNING_CODES } from "./codes.ts";
import type { jsonSchemaProblem, validateFlow, validateFlowText } from "./index.ts";

type Result = ReturnType<typeof validateFlow>;

const surface = authoring as unknown as Record<string, unknown>;

function fn<T>(name: string): T {
  const f = surface[name];
  assert.equal(typeof f, "function", `${name} is exported by src/authoring/index.ts`);
  return f as T;
}

function check(doc: unknown, catalogue: Catalogue): Result {
  const f = fn<typeof validateFlow>("validateFlow");
  let r: Result | undefined;
  assert.doesNotThrow(() => {
    r = f(doc, catalogue);
  });
  assert.ok(r);
  return r;
}

function checkText(text: string, format: FlowFormat, catalogue: Catalogue): Result {
  const f = fn<typeof validateFlowText>("validateFlowText");
  let r: Result | undefined;
  assert.doesNotThrow(() => {
    r = f(text, format, catalogue);
  });
  assert.ok(r);
  return r;
}

const CASES = new URL("../../../test/support/flow-cases/", import.meta.url);

function cases(group: CaseGroup) {
  assert.ok(existsSync(new URL(`${group}/`, CASES)), `${group} exists`);
  return flowCases(group);
}

function caseText(group: CaseGroup, name: string): string {
  assert.ok(existsSync(new URL(`${group}/${name}.yaml`, CASES)), `${group}/${name} exists`);
  const c = flowCases(group, name).find((x) => x.name === name);
  assert.ok(c, name);
  return c.text;
}

const codesOf = (issues: { code: string }[]): string[] => [...new Set(issues.map((i) => i.code))].sort();

test("C-7fc61336 RF-1 validates with one trifecta warning", () => {
  const r = check(loadTestFlow("rf-1-invoice-intake"), loadTestCatalogue());
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.layers_run, ["L1", "L2", "L3"]);
  assert.equal(r.warnings.length, 1);
  const w = r.warnings[0];
  assert.equal(w?.code, "W_LETHAL_TRIFECTA");
  assert.equal(w?.node, null);
  assert.equal(w?.path, "/nodes");
  assert.ok(w?.message.includes("invoices.get@1"));
  assert.ok(w?.message.includes("erp.create_payment@1"));
});

test("C-7fc61336 the RF-1 variants validate", () => {
  for (const name of ["rf-1-core", "rf-1-core-approval"]) {
    const r = check(loadTestFlow(name), loadTestCatalogue());
    assert.equal(r.ok, true, name);
    assert.deepEqual(r.errors, [], name);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"], name);
  }
});

test("C-a609469d layers gate", () => {
  const a = checkText(caseText("invalid", "l1-required-start"), "yaml", caseCatalogue());
  assert.deepEqual(a.layers_run, ["L1"]);
  assert.equal(a.ok, false);
  const b = checkText(caseText("invalid", "l2-unknown-block"), "yaml", caseCatalogue());
  assert.deepEqual(b.layers_run, ["L1", "L2"]);
  assert.equal(b.ok, false);
});

test("C-a609469d node key order does not change the result", () => {
  const flow = loadTestFlow("rf-1-invoice-intake");
  const reversed = { ...flow, nodes: Object.fromEntries(Object.entries(flow.nodes).reverse()) };
  const original = check(flow, loadTestCatalogue());
  assert.equal(original.ok, true);
  assert.deepEqual(check(reversed, loadTestCatalogue()), original);
});

test("C-a609469d non-object documents fail in L1", () => {
  for (const value of [null, 5, "x", [], true, {}]) {
    const r = check(value, loadTestCatalogue());
    assert.equal(r.ok, false, JSON.stringify(value));
    assert.ok(r.errors.length > 0);
    for (const e of r.errors) assert.equal(e.layer, "L1");
  }
});

test("C-7dd08673 each invalid case yields exactly its codes", () => {
  const all = cases("invalid");
  assert.equal(all.length, 115);
  const seen = new Set<string>();
  for (const c of all) {
    const r = checkText(c.text, c.format, caseCatalogue());
    assert.equal(r.ok, false, c.name);
    assert.deepEqual(codesOf(r.errors), c.expect, c.name);
    const layer = r.errors[0]?.layer;
    assert.ok(layer, c.name);
    for (const e of r.errors) {
      assert.equal(e.layer, layer, c.name);
      assert.ok(e.code.startsWith(`${layer}_`), c.name);
      assert.ok(e.message.length > 0, c.name);
      assert.ok(e.node === null || typeof e.node === "string", c.name);
      assert.equal(typeof e.path, "string", c.name);
    }
    assert.equal(r.layers_run[r.layers_run.length - 1], layer, c.name);
    for (const code of c.expect) seen.add(code);
  }
  assert.deepEqual([...seen].sort(), [...FLOW_ERROR_CODES].sort());
  assert.equal(FLOW_ERROR_CODES.length, 47);
});

test("C-9d912054 valid cases have no issue", () => {
  const all = cases("valid");
  assert.equal(all.length, 29);
  for (const c of all) {
    const r = checkText(c.text, c.format, caseCatalogue());
    assert.deepEqual(r.errors, [], c.name);
    assert.deepEqual(r.warnings, [], c.name);
    assert.deepEqual(r.layers_run, ["L1", "L2", "L3"], c.name);
  }
});

test("C-9d912054 warning cases warn exactly as expected", () => {
  const all = cases("warnings");
  assert.equal(all.length, 13);
  const seen = new Set<string>();
  for (const c of all) {
    const r = checkText(c.text, c.format, caseCatalogue());
    assert.deepEqual(r.errors, [], c.name);
    assert.deepEqual(codesOf(r.warnings), c.expectWarnings, c.name);
    for (const code of c.expectWarnings) seen.add(code);
  }
  assert.deepEqual([...seen].sort(), [...FLOW_WARNING_CODES].sort());
});

test("C-9c15634e parse failures become one L1_PARSE", () => {
  const expected: [string, string][] = [
    ["l1-parse-custom-tag", "FORMAT_UNSUPPORTED_TAG: "],
    ["l1-parse-duplicate-key", "FORMAT_DUPLICATE_KEY: "],
    ["l1-parse-invalid-yaml", "FORMAT_YAML_SYNTAX: "],
  ];
  for (const [name, prefix] of expected) {
    const r = checkText(caseText("invalid", name), "yaml", caseCatalogue());
    assert.equal(r.ok, false, name);
    assert.deepEqual(r.layers_run, ["L1"], name);
    assert.equal(r.errors.length, 1, name);
    assert.equal(r.errors[0]?.code, "L1_PARSE");
    assert.equal(r.errors[0]?.node, null);
    assert.ok(r.errors[0]?.message.startsWith(prefix), name);
  }
  const json = checkText("{", "json", caseCatalogue());
  assert.equal(json.errors[0]?.code, "L1_PARSE");
  assert.ok(json.errors[0]?.message.startsWith("FORMAT_JSON_SYNTAX: "));
});

test("C-9c15634e the JSON form of RF-1 matches the YAML form", () => {
  const flow = loadTestFlow("rf-1-invoice-intake");
  const fromJson = checkText(JSON.stringify(flow), "json", loadTestCatalogue());
  const fromDoc = check(flow, loadTestCatalogue());
  assert.equal(fromDoc.ok, true);
  assert.deepEqual(fromJson.errors, fromDoc.errors);
  assert.deepEqual(fromJson.warnings, fromDoc.warnings);
  assert.equal(fromJson.warnings.length, 1);
});

test("C-c6bddbec a throwing catalogue is one INTERNAL_ERROR", () => {
  const base = loadTestCatalogue();
  const boom: Catalogue = {
    block: () => {
      throw new Error("boom");
    },
    modelProfile: (ref) => base.modelProfile(ref),
    role: (name) => base.role(name),
    delegateTarget: (t, w) => base.delegateTarget(t, w),
    flow: (ref, major) => base.flow(ref, major),
  };
  const r = check(loadTestFlow("rf-1-invoice-intake"), boom);
  assert.equal(r.ok, false);
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0]?.layer, "L2");
  assert.equal(r.errors[0]?.code, "INTERNAL_ERROR");
  assert.ok(r.errors[0]?.message.startsWith("validator crashed: boom"));
});

test("C-c6bddbec a 5001 node flow hits the taint limit", () => {
  const switchCases: Record<string, string> = {};
  const nodes: Record<string, unknown> = {};
  for (let i = 0; i < 5000; i++) {
    switchCases[`k${i}`] = `e${i}`;
    nodes[`e${i}`] = { kind: "end", status: "completed" };
  }
  nodes["s"] = { kind: "switch", on: "${{ inputs.k }}", cases: switchCases, default: "e0" };
  const doc = {
    ursitoare: "0.1",
    flow: "big",
    version: "1.0.0",
    inputs: { type: "object", properties: { k: { type: "string" } }, required: ["k"] },
    start: "s",
    nodes,
  };
  const r = check(doc, loadTestCatalogue());
  assert.equal(r.ok, false);
  const e = r.errors.find((x) => x.code === "INTERNAL_ERROR");
  assert.ok(e);
  assert.equal(e.layer, "L3");
  assert.ok(e.message.startsWith("taint analysis limit exceeded: nodes 5001"));
});

test("C-c6bddbec a self-referencing input schema does not crash", () => {
  const doc = {
    ursitoare: "0.1",
    flow: "recursive",
    version: "1.0.0",
    inputs: {
      type: "object",
      properties: { x: { anyOf: [{ $ref: "#/properties/x" }] } },
      required: ["x"],
    },
    start: "fetch",
    nodes: {
      fetch: { kind: "block", uses: "docs.fetch@1", with: { url: "${{ inputs.x }}" }, next: "done" },
      done: { kind: "end", status: "completed" },
    },
  };
  const r = check(doc, loadTestCatalogue());
  assert.ok(!r.errors.some((e) => e.code === "INTERNAL_ERROR"));
  assert.equal(r.ok, r.errors.length === 0);
});

type Path = (string | number)[];

function collectPaths(value: unknown, prefix: Path, out: Path[]): void {
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const path = [...prefix, Array.isArray(value) ? Number(key) : key];
    out.push(path);
    collectPaths(child, path, out);
  }
}

function xorshift(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s;
  };
}

function mutate(root: unknown, next: () => number): void {
  const paths: Path[] = [];
  collectPaths(root, [], paths);
  const path = paths[next() % paths.length];
  if (path === undefined) return;
  let parent = root as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) parent = parent[key] as Record<string | number, unknown>;
  const last = path[path.length - 1] as string | number;
  const choices: unknown[] = [undefined, null, 0, "", {}, [], "${{", "__proto__"];
  const pick = choices[next() % choices.length];
  if (pick === undefined) {
    if (Array.isArray(parent)) parent.splice(Number(last), 1);
    else Reflect.deleteProperty(parent, last);
  } else {
    parent[last] = pick;
  }
}

test("C-c6bddbec 1000 random mutations never crash", () => {
  const next = xorshift(2463534242);
  const catalogue = loadTestCatalogue();
  const base = JSON.stringify(loadTestFlow("rf-1-invoice-intake"));
  for (let i = 0; i < 1000; i++) {
    const doc: unknown = JSON.parse(base);
    const edits = 1 + (next() % 3);
    for (let e = 0; e < edits; e++) mutate(doc, next);
    const r = check(doc, catalogue);
    assert.ok(!r.errors.some((x) => x.code === "INTERNAL_ERROR"), `mutation ${i}`);
    assert.equal(r.ok, r.errors.length === 0);
  }
});

test("C-3a87587c jsonSchemaProblem accepts and refuses schemas", () => {
  const f = fn<typeof jsonSchemaProblem>("jsonSchemaProblem");
  assert.equal(f({ type: "object", properties: { a: { type: "string" } }, required: ["a"] }), null);
  assert.equal(f({ x: { $ref: "https://example.com/s.json" }, "x-vendor": 1 }), null);
  for (const bad of [{ type: "nope" }, { $schema: "http://json-schema.org/draft-07/schema#" }, [], null, true]) {
    const p = f(bad);
    assert.equal(typeof p, "string");
    assert.ok(p && p.length > 0 && !p.includes("\n"));
  }
  for (const bad of [[], null, true]) assert.equal(f(bad), "schema must be a JSON object");
});
