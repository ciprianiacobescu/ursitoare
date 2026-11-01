import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { test } from "node:test";

import { caseCatalogue, flowCases } from "../../../test/support/flow-cases/index.ts";
import type { FlowCase } from "../../../test/support/flow-cases/index.ts";
import type { ValidationResult } from "./types.ts";
import { validateFlowText } from "./validate.ts";

const L1_DIR = new URL("../../../test/support/flow-cases/invalid/", import.meta.url);

function l1Cases(): FlowCase[] {
  assert.ok(existsSync(new URL("l1-required-start.yaml", L1_DIR)), "the l1 case files exist");
  let cases: FlowCase[] = [];
  assert.doesNotThrow(() => {
    cases = flowCases("invalid", "l1-");
  });
  return cases;
}

test("C-7dd08673 The l1 case files are listed with their expected codes", () => {
  const cases = l1Cases();
  assert.ok(cases.length >= 40, `at least 40 l1 case files, got ${cases.length}`);
  for (const c of cases) {
    assert.equal(c.group, "invalid");
    assert.ok(c.name.startsWith("l1-"), c.name);
    assert.ok(c.expect.length > 0, `${c.name} expects a code`);
    for (const code of c.expect) {
      assert.ok(code.startsWith("L1_"), `${c.name}: ${code}`);
    }
  }
});

test("C-7dd08673 Each l1 case yields exactly its codes in layer L1", () => {
  const cases = l1Cases();
  assert.ok(cases.length > 0);
  for (const c of cases) {
    let r: ValidationResult | undefined;
    assert.doesNotThrow(() => {
      r = validateFlowText(c.text, c.format, caseCatalogue());
    });
    assert.ok(r, c.name);
    assert.equal(r.ok, false, c.name);
    const codes = [...new Set(r.errors.map((e) => e.code))].sort();
    assert.deepEqual(codes, c.expect, c.name);
    assert.equal(r.layers_run.at(-1), "L1", c.name);
    for (const e of r.errors) {
      assert.equal(e.layer, "L1", c.name);
      assert.ok(e.code.startsWith("L1_"), c.name);
      assert.notEqual(e.message, "", c.name);
      assert.ok(e.node === null || typeof e.node === "string", c.name);
      assert.equal(typeof e.path, "string", c.name);
    }
  }
});
