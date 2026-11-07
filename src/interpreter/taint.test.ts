import assert from "node:assert/strict";
import { test } from "node:test";

import type { BlockDef, Catalogue, ProducedTaint, Taint } from "../authoring/index.ts";
import { producedTaint } from "../authoring/index.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import * as interpreter from "./index.ts";
import { blocksCatalogue, createRunTaints } from "./taint.ts";
import type { RunTaints } from "./taint.ts";

assert.equal(typeof blocksCatalogue, "function");
assert.equal(typeof createRunTaints, "function");

const E: Taint = ["extracted"];
const U: Taint = ["untrusted"];
const P1: ProducedTaint = { output: E, fields: { t: U }, outcome: E };
const P2: ProducedTaint = { output: U, fields: {}, outcome: U };
const P3: ProducedTaint = { output: E, fields: { x: U }, outcome: E };

function builtCatalogue(definition: BlockDef): Catalogue {
  let result: Catalogue | undefined;
  assert.doesNotThrow(() => {
    result = blocksCatalogue({ "erp.lookup_vendor@1": definition });
  });
  assert.ok(result, "blocksCatalogue returned a catalogue");
  return result;
}

function newRunTaints(): RunTaints {
  let result: RunTaints | undefined;
  assert.doesNotThrow(() => {
    result = createRunTaints();
  });
  assert.ok(result, "createRunTaints returned an instance");
  return result;
}

test("C-53a36cae blocksCatalogue and createRunTaints", () => {
  const D = loadTestCatalogue().block("erp.lookup_vendor@1");
  assert.ok(D, "the test catalogue defines erp.lookup_vendor@1");
  const catalogue = builtCatalogue(D);

  assert.equal(catalogue.block("erp.lookup_vendor@1"), D, "a known block is the map value");
  for (const ref of ["x@1", "toString", "constructor", "__proto__", "hasOwnProperty"]) {
    assert.equal(catalogue.block(ref), undefined, `block ${ref} is undefined`);
  }
  assert.equal(catalogue.modelProfile("m"), undefined, "no model profile");
  assert.equal(catalogue.role("r"), undefined, "no role");
  assert.equal(catalogue.delegateTarget("n8n", "calc"), undefined, "no delegate target");
  assert.equal(catalogue.flow("f", 1), undefined, "no flow signature");
  assert.equal("delegateWorkflows" in catalogue, false, "no delegateWorkflows member");

  const node = { kind: "block", uses: "erp.lookup_vendor@1" };
  let viaBlocks: ProducedTaint | undefined;
  assert.doesNotThrow(() => {
    viaBlocks = producedTaint(node, E, catalogue);
  });
  assert.ok(viaBlocks, "producedTaint returned a result");
  assert.deepEqual(
    viaBlocks,
    producedTaint(node, E, loadTestCatalogue()),
    "both catalogues give the same produced taint",
  );

  const first = newRunTaints();
  const second = newRunTaints();

  assert.equal(first.taintOf("n"), undefined, "an empty instance has no taint");
  first.record("n", P1);
  assert.equal(first.taintOf("n"), P1, "records p1");
  first.record("n", P2);
  assert.equal(first.taintOf("n"), P2, "replaces an earlier value with p2");
  first.record("__proto__", P3);
  assert.equal(first.taintOf("__proto__"), P3, "records __proto__ by own key");
  assert.equal(first.taintOf("toString"), undefined, "reads own keys only");
  assert.equal(second.taintOf("n"), undefined, "the second instance is separate");

  const surface = interpreter as unknown as Record<string, unknown>;
  assert.equal(typeof surface["blocksCatalogue"], "function", "blocksCatalogue is exported");
  assert.equal(typeof surface["createRunTaints"], "function", "createRunTaints is exported");
});
