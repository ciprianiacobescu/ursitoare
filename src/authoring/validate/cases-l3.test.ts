import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { FlowCase } from "../../../test/support/flow-cases/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlowText } from "./validate.ts";

const L3_DIR = new URL("../../../test/support/flow-cases/invalid/", import.meta.url);

function l3Cases(): FlowCase[] {
  assert.ok(existsSync(new URL("l3-ref-unknown-node.yaml", L3_DIR)), "the l3 case files exist");
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("invalid", "l3-");
  });
  return cases.filter((c) => !c.name.startsWith("l3-taint-"));
}

function validateCase(c: FlowCase): ValidationResult {
  let result: ValidationResult | undefined;
  assert.doesNotThrow(() => {
    result = validateFlowText(c.text, c.format, caseCatalogue());
  });
  assert.ok(result, c.name);
  return result;
}

test("C-7dd08673 The l3 case files are listed with their expected codes", () => {
  const cases = l3Cases();
  assert.ok(cases.length >= 35, `at least 35 l3 case files, got ${cases.length}`);
  for (const c of cases) {
    assert.equal(c.group, "invalid");
    assert.ok(c.name.startsWith("l3-"), c.name);
    assert.ok(!c.name.startsWith("l3-taint-"), c.name);
    assert.ok(c.expect.length > 0, `${c.name} expects a code`);
    for (const code of c.expect) {
      assert.ok(code.startsWith("L3_"), `${c.name}: ${code}`);
    }
  }
});

test("C-7dd08673 Each l3 case yields exactly its codes in layer L3", () => {
  const cases = l3Cases();
  assert.ok(cases.length > 0);
  for (const c of cases) {
    const r = validateCase(c);
    assert.equal(r.ok, false, c.name);
    const codes = [...new Set(r.errors.map((e) => e.code))].sort();
    assert.deepEqual(codes, c.expect, c.name);
    assert.equal(r.layers_run.at(-1), "L3", c.name);
    for (const e of r.errors) {
      assert.equal(e.layer, "L3", c.name);
      assert.ok(e.code.startsWith("L3_"), c.name);
      assert.notEqual(e.message, "", c.name);
      assert.ok(e.node === null || typeof e.node === "string", c.name);
      assert.equal(typeof e.path, "string", c.name);
    }
  }
});
