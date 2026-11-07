import assert from "node:assert/strict";
import { test } from "node:test";

import { CatalogueDataError } from "../../../test/support/catalogue/errors.ts";
import { loadTestFlow, parseCatalogueFlow, TEST_FLOW_NAMES } from "../../../test/support/catalogue/flows.ts";
import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { InclusionReport } from "../../../test/support/taint-runs/inclusion.ts";
import { flowPaths, inclusionReport } from "../../../test/support/taint-runs/inclusion.ts";
import type { Flow } from "../format/index.ts";
import type { ProducedTaint } from "./runtime.ts";

assert.equal(typeof inclusionReport, "function");
assert.equal(typeof flowPaths, "function");

const RF1 = ["rf-1-invoice-intake", "rf-1-core", "rf-1-core-approval"] as const;
const FOREACH_CUT = [
  "valid/foreach-bare-item-primitive-array",
  "valid/foreach-block-items-and-results",
  "valid/foreach-subflow",
];

function documents(): { name: string; flow: Flow }[] {
  const out: { name: string; flow: Flow }[] = [];
  for (const group of ["valid", "warnings"] as const) {
    for (const c of flowCases(group)) {
      const name = `${group}/${c.name}`;
      try {
        out.push({ name, flow: parseCatalogueFlow(c.text, name) });
      } catch (error) {
        if (error instanceof CatalogueDataError && error.code === "CATALOGUE_FLOW_PARSE") continue;
        throw error;
      }
    }
  }
  for (const name of TEST_FLOW_NAMES) out.push({ name, flow: loadTestFlow(name) });
  return out;
}

test("C-43a9daa4 every report has no violations and the foreach cut is exact", () => {
  const catalogue = caseCatalogue();
  const docs = documents();
  assert.ok(docs.length >= 40, "documents built");
  for (const { name, flow } of docs) {
    let report: InclusionReport | undefined;
    assert.doesNotThrow(() => {
      report = inclusionReport(flow, catalogue);
    }, name);
    assert.ok(report, `${name}: report`);
    assert.ok(report.paths >= 1, `${name}: paths`);
    assert.deepEqual(report.violations, [], `${name}: violations`);
    assert.deepEqual(report.cut, FOREACH_CUT.includes(name) ? ["each"] : [], `${name}: cut`);
  }
});

test("C-43a9daa4 checked lists every node id of the RF-1 flows", () => {
  const catalogue = caseCatalogue();
  const counts: Record<string, number> = {
    "rf-1-invoice-intake": 11,
    "rf-1-core": 9,
    "rf-1-core-approval": 10,
  };
  for (const name of RF1) {
    const flow = loadTestFlow(name);
    let report: InclusionReport | undefined;
    assert.doesNotThrow(() => {
      report = inclusionReport(flow, catalogue);
    }, name);
    assert.ok(report, `${name}: report`);
    assert.equal(report.checked.length, counts[name], `${name}: count`);
    assert.deepEqual(report.checked, Object.keys(flow.nodes).sort(), `${name}: checked`);
  }
});

test("C-43a9daa4 a stub producer that is all untrusted is reported as a violation", () => {
  const catalogue = caseCatalogue();
  const flow = loadTestFlow("rf-1-core");
  const stub = (): ProducedTaint => ({ output: ["untrusted"], fields: {}, outcome: ["untrusted"] });
  let report: InclusionReport | undefined;
  assert.doesNotThrow(() => {
    report = inclusionReport(flow, catalogue, stub);
  });
  assert.ok(report, "report");
  assert.ok(report.violations.length >= 1, "at least one violation");
  assert.ok(
    report.violations.some((v) => v.endsWith("at fetch_invoice: output static [] runtime [untrusted]")),
    "fetch_invoice output violation",
  );
});
