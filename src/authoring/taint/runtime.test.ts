import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import type { BlockDef, Catalogue, DelegateTargetDef, Flow } from "../format/index.ts";
import { CatalogueDataError } from "../../../test/support/catalogue/errors.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { loadTestFlow, parseCatalogueFlow, TEST_FLOW_NAMES } from "../../../test/support/catalogue/flows.ts";
import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import * as authoring from "../index.ts";
import type { NodeTaint, TaintAnalysis } from "./analyze.ts";
import { analyzeTaint } from "./analyze.ts";
import type { Taint } from "./labels.ts";
import type { ProducedTaint, TaintOf } from "./runtime.ts";
import {
  nodeInputTaint,
  producedTaint,
  referenceTaint,
  valueTaint,
} from "./runtime.ts";

assert.equal(typeof producedTaint, "function");
assert.equal(typeof referenceTaint, "function");
assert.equal(typeof valueTaint, "function");
assert.equal(typeof nodeInputTaint, "function");

const N: Taint = [];
const E: Taint = ["extracted"];
const U: Taint = ["untrusted"];
const EU: Taint = ["extracted", "untrusted"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kindOf(node: unknown): string | undefined {
  return isRecord(node) && typeof node.kind === "string" ? node.kind : undefined;
}

function c40(): Catalogue {
  const base = loadTestCatalogue();
  return {
    block(ref: string): BlockDef | undefined {
      if (ref === "ur.block@1") {
        const def = base.block("erp.lookup_vendor@1");
        return def === undefined ? undefined : { ...def, untrusted_result: true };
      }
      if (ref === "pf.block@1") {
        const def = base.block("erp.lookup_vendor@1");
        return def === undefined
          ? undefined
          : { ...def, untrusted_fields: ["__proto__", "constructor.x", "", 5] as unknown as string[] };
      }
      return base.block(ref);
    },
    modelProfile: (ref: string) => base.modelProfile(ref),
    role: (name: string) => base.role(name),
    delegateTarget(target: string, workflow: string): DelegateTargetDef | undefined {
      if (target === "n8n" && workflow === "calc") {
        return { effect: "read", untrusted_result: false };
      }
      return base.delegateTarget(target, workflow);
    },
    flow: (ref: string, major: number) => base.flow(ref, major),
    delegateWorkflows: (target: string) => base.delegateWorkflows?.(target),
  };
}

function runProduced(node: unknown, input: Taint, catalogue: Catalogue): ProducedTaint {
  let result: ProducedTaint | undefined;
  assert.doesNotThrow(() => {
    result = producedTaint(node, input, catalogue);
  });
  assert.ok(result, "producedTaint returned a result");
  return result;
}

function expectProduced(
  label: string,
  node: unknown,
  input: Taint,
  expected: ProducedTaint,
  catalogue: Catalogue,
): ProducedTaint {
  const result = runProduced(node, input, catalogue);
  assert.deepEqual(result.output, expected.output, `${label}: output`);
  assert.deepEqual(result.fields, expected.fields, `${label}: fields`);
  assert.deepEqual(result.outcome, expected.outcome, `${label}: outcome`);
  return result;
}

test("C-94aebf73 Produced taint per node kind", () => {
  const catalogue = c40();

  expectProduced(
    "block invoices get no taint",
    { kind: "block", uses: "invoices.get@1" },
    N,
    { output: N, fields: { raw_text: U, vendor_name: U }, outcome: N },
    catalogue,
  );
  expectProduced(
    "block invoices get extracted",
    { kind: "block", uses: "invoices.get@1" },
    E,
    { output: E, fields: { raw_text: EU, vendor_name: EU }, outcome: E },
    catalogue,
  );
  expectProduced(
    "block untrusted result",
    { kind: "block", uses: "ur.block@1" },
    E,
    { output: EU, fields: {}, outcome: EU },
    catalogue,
  );
  expectProduced(
    "block trusted result",
    { kind: "block", uses: "erp.lookup_vendor@1" },
    U,
    { output: U, fields: {}, outcome: U },
    catalogue,
  );
  expectProduced(
    "block unknown ref",
    { kind: "block", uses: "nope@1" },
    N,
    { output: U, fields: {}, outcome: U },
    catalogue,
  );
  expectProduced(
    "block non string uses",
    { kind: "block", uses: 7 },
    N,
    { output: U, fields: {}, outcome: U },
    catalogue,
  );

  const pf = runProduced({ kind: "block", uses: "pf.block@1" }, N, catalogue);
  assert.deepEqual(pf.output, N, "pf.block output");
  assert.deepEqual(pf.outcome, N, "pf.block outcome");
  assert.deepEqual(Object.keys(pf.fields), ["__proto__", "constructor"], "pf.block field names");
  assert.ok(Object.hasOwn(pf.fields, "__proto__"), "pf.block owns __proto__");
  assert.ok(Object.hasOwn(pf.fields, "constructor"), "pf.block owns constructor");
  assert.equal(Object.getPrototypeOf(pf.fields), Object.prototype, "pf.block fields prototype");
  assert.deepEqual(pf.fields["__proto__"], U, "pf.block __proto__ taint");
  assert.deepEqual(pf.fields["constructor"], U, "pf.block constructor taint");

  for (const [label, input] of [
    ["untrusted", U],
    ["none", N],
    ["extracted", E],
  ] as const) {
    expectProduced(`code ${label}`, { kind: "code" }, input, {
      output: input,
      fields: {},
      outcome: input,
    }, catalogue);
  }

  for (const kind of ["switch", "end", "wait", "human.form", "llm.generate"]) {
    expectProduced(`${kind} extracted`, { kind }, E, { output: E, fields: {}, outcome: E }, catalogue);
  }

  expectProduced(
    "human approval untrusted",
    { kind: "human.approval" },
    U,
    { output: U, fields: {}, outcome: N },
    catalogue,
  );
  expectProduced(
    "llm decide untrusted",
    { kind: "llm.decide" },
    U,
    { output: U, fields: { outcome: N }, outcome: N },
    catalogue,
  );

  for (const [label, input] of [
    ["none", N],
    ["untrusted", U],
    ["extracted untrusted", EU],
  ] as const) {
    expectProduced(`llm extract ${label}`, { kind: "llm.extract" }, input, {
      output: E,
      fields: {},
      outcome: E,
    }, catalogue);
  }

  expectProduced(
    "agent trusted tool",
    { kind: "agent", tools: ["kb.search@1"] },
    E,
    { output: E, fields: {}, outcome: E },
    catalogue,
  );
  for (const [label, node] of [
    ["untrusted tool", { kind: "agent", tools: ["kb.search@1", "http.get@1"] }],
    ["no tools", { kind: "agent" }],
    ["unknown tool", { kind: "agent", tools: ["nope@1"] }],
  ] as const) {
    expectProduced(`agent ${label}`, node, N, { output: U, fields: {}, outcome: U }, catalogue);
  }

  expectProduced(
    "foreach trusted uses",
    { kind: "foreach", uses: "kb.search@1" },
    E,
    { output: E, fields: {}, outcome: E },
    catalogue,
  );
  for (const [label, node] of [
    ["untrusted uses", { kind: "foreach", uses: "http.get@1" }],
    ["no uses", { kind: "foreach" }],
  ] as const) {
    expectProduced(`foreach ${label}`, node, N, { output: U, fields: {}, outcome: U }, catalogue);
  }

  expectProduced(
    "subflow extracted",
    { kind: "subflow" },
    E,
    { output: EU, fields: {}, outcome: EU },
    catalogue,
  );

  expectProduced(
    "delegate trusted target",
    { kind: "delegate", target: "n8n", workflow: "calc" },
    E,
    { output: E, fields: {}, outcome: E },
    catalogue,
  );
  for (const [label, node] of [
    ["untrusted target", { kind: "delegate", target: "n8n", workflow: "archive-invoice" }],
    ["unknown workflow", { kind: "delegate", target: "n8n", workflow: "zzz" }],
    ["no target", { kind: "delegate" }],
  ] as const) {
    expectProduced(`delegate ${label}`, node, N, { output: U, fields: {}, outcome: U }, catalogue);
  }

  for (const [label, node] of [
    ["unknown kind", { kind: "mystery" }],
    ["number node", 5],
    ["null node", null],
    ["array node", []],
  ] as const) {
    expectProduced(label, node, E, { output: U, fields: {}, outcome: U }, catalogue);
  }

  const thrown = new Error("boom");
  const throwing: Catalogue = {
    ...catalogue,
    block(): BlockDef | undefined {
      throw thrown;
    },
  };
  let caught: unknown;
  try {
    producedTaint({ kind: "block", uses: "invoices.get@1" }, N, throwing);
  } catch (error) {
    caught = error;
  }
  assert.equal(caught, thrown, "the catalogue error object is rethrown");

  const surface = authoring as unknown as Record<string, unknown>;
  for (const name of ["producedTaint", "referenceTaint", "valueTaint", "nodeInputTaint"]) {
    assert.equal(typeof surface[name], "function", `authoring.${name}`);
  }
});

test("C-88707743 Static results equal the shared rule over the corpus", () => {
  interface Document {
    name: string;
    flow: Flow;
  }

  const catalogue = caseCatalogue();
  const documents: Document[] = [];
  const unparsed: string[] = [];
  const parsedByGroup: Record<string, number> = { invalid: 0, valid: 0, warnings: 0 };

  for (const group of ["invalid", "valid", "warnings"] as const) {
    for (const c of flowCases(group)) {
      const name = `${group}/${c.name}`;
      try {
        const flow = parseCatalogueFlow(c.text, name);
        documents.push({ name, flow });
        parsedByGroup[group] = (parsedByGroup[group] ?? 0) + 1;
      } catch (error) {
        if (error instanceof CatalogueDataError && error.code === "CATALOGUE_FLOW_PARSE") {
          unparsed.push(name);
          continue;
        }
        throw error;
      }
    }
  }
  for (const name of TEST_FLOW_NAMES) {
    documents.push({ name, flow: loadTestFlow(name) });
  }

  assert.equal(documents.length, 157, "document count");
  assert.deepEqual(parsedByGroup, { invalid: 112, valid: 29, warnings: 13 }, "parsed cases per group");
  assert.deepEqual(
    [...unparsed].sort(),
    ["invalid/l1-parse-custom-tag", "invalid/l1-parse-duplicate-key", "invalid/l1-parse-invalid-yaml"],
    "unparsed cases",
  );

  let nodeCount = 0;
  for (const document of documents) {
    const analysis: TaintAnalysis = analyzeTaint(document.flow, catalogue);
    const flowNodes = document.flow.nodes as unknown as Record<string, unknown>;
    for (const id of Object.keys(analysis.nodes)) {
      const staticNode: NodeTaint | undefined = analysis.nodes[id];
      assert.ok(staticNode, `${document.name}: node ${id}: analysis entry`);
      const node = flowNodes[id];
      let produced: ProducedTaint | undefined;
      assert.doesNotThrow(() => {
        produced = producedTaint(node, staticNode.input, catalogue);
      }, `${document.name}: node ${id}: producedTaint`);
      assert.ok(produced, `${document.name}: node ${id}: produced`);
      nodeCount += 1;

      assert.deepEqual(produced.output, staticNode.output, `${document.name}: node ${id}: output`);
      assert.deepEqual(produced.fields, staticNode.fields, `${document.name}: node ${id}: fields`);
      const kind = kindOf(node);
      const expectedOutcome: Taint = kind === "llm.decide" || kind === "human.approval" ? N : staticNode.output;
      assert.deepEqual(produced.outcome, expectedOutcome, `${document.name}: node ${id}: outcome`);
    }
  }

  assert.equal(nodeCount, 631, "node count");
});

test("C-5d24d025 analyzeTaint and the shared rules agree on the RF-1 nodes", () => {
  const catalogue = loadTestCatalogue();
  const expectedCounts: Record<string, number> = {
    "rf-1-invoice-intake": 11,
    "rf-1-core": 9,
    "rf-1-core-approval": 10,
  };

  let total = 0;
  for (const name of TEST_FLOW_NAMES) {
    const flow = loadTestFlow(name);
    const analysis = analyzeTaint(flow, catalogue);
    const flowNodes = flow.nodes as unknown as Record<string, unknown>;

    const taintOf: TaintOf = (id: string): ProducedTaint | undefined => {
      const node = analysis.nodes[id];
      if (node === undefined) return undefined;
      const kind = kindOf(flowNodes[id]);
      return {
        output: node.output,
        fields: node.fields,
        outcome: kind === "llm.decide" || kind === "human.approval" ? N : node.output,
      };
    };

    const ids = Object.keys(analysis.nodes);
    assert.equal(ids.length, expectedCounts[name], `${name}: node count`);
    total += ids.length;

    for (const id of ids) {
      const staticNode: NodeTaint | undefined = analysis.nodes[id];
      assert.ok(staticNode, `${name}: ${id}: analysis entry`);
      const node = flowNodes[id];
      let produced: ProducedTaint | undefined;
      assert.doesNotThrow(() => {
        produced = producedTaint(node, staticNode.input, catalogue);
      }, `${name}: ${id}: producedTaint`);
      assert.ok(produced, `${name}: ${id}: produced`);
      assert.deepEqual(produced.output, staticNode.output, `${name}: ${id}: output`);
      assert.deepEqual(produced.fields, staticNode.fields, `${name}: ${id}: fields`);
      const derived = taintOf(id);
      assert.ok(derived, `${name}: ${id}: taintOf`);
      assert.deepEqual(produced.outcome, derived.outcome, `${name}: ${id}: outcome`);
    }
  }

  assert.equal(total, 30, "RF-1 node total");

  const intake = analyzeTaint(loadTestFlow("rf-1-invoice-intake"), catalogue);
  assert.deepEqual(intake.nodes["pay"]?.input, ["extracted"], "rf-1-invoice-intake pay input");
});

const FROZEN_TAINT_TESTS: ReadonlyArray<readonly [string, readonly string[]]> = [
  [
    "analyze.test.ts",
    [
      "C-feb77bd3 RF-1 labels and edges",
      "C-7e5f540a Code does not launder and fields are precise",
      "C-382d778d Cycles self-references and order",
    ],
  ],
  [
    "capabilities.test.ts",
    [
      "C-6792eb26 RF-1 and one-block flags",
      "C-5e5ffb19 agents hooks subflows context and order",
      "C-238ff645 unknown sites fail closed and catalogue errors propagate",
      "C-9c5fbf5b malformed hook structures are unknown sites",
    ],
  ],
  [
    "closed.test.ts",
    ["C-96450187 unknown and malformed input fails closed", "C-0309b412 size limits"],
  ],
  [
    "hooks.test.ts",
    ["C-be8bdbfa Hook references widening and flow rules", "C-218f2fa6 Malformed hook structures fail closed"],
  ],
  [
    "labels.test.ts",
    ["C-375163e0 join is a union in canonical order", "C-9dbb1d4e normalize relabel and include"],
  ],
  [
    "sources.test.ts",
    ["C-9543ab61 sources of untrusted data and the closed outcome", "C-6b3829ee context sources are untrusted unless approved"],
  ],
  ["surface.test.ts", ["C-a609be4d names are exported by the authoring surface"]],
];

test("C-9dec3a38 the frozen taint tests are present and unchanged", () => {
  let found = 0;
  for (const [file, titles] of FROZEN_TAINT_TESTS) {
    const text = readFileSync(new URL(file, import.meta.url), "utf8");
    for (const title of titles) {
      assert.ok(text.includes(`test("${title}"`), `${file}: ${title}`);
      found += 1;
    }
  }
  assert.equal(found, 16, "frozen test count");

  const produced = runProduced({ kind: "code" }, E, c40());
  assert.deepEqual(produced.output, E, "the shared rule is implemented for the frozen suite");
});
