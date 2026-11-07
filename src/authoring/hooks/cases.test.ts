import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { hookCases } from "../../../test/support/hook-cases/index.ts";
import type { HookCase, HookCaseGroup } from "../../../test/support/hook-cases/index.ts";
import { validateFlowText } from "../validate/index.ts";
import type { ValidationResult } from "../validate/index.ts";

const catalogue = loadTestCatalogue();

const INVALID_ROWS: Record<string, string> = {
  "h-schema-unknown-field": "H_SCHEMA lookup /nodes/lookup/pre/0/frobnicate",
  "h-schema-post-on-end": "H_SCHEMA done /nodes/done/post",
  "h-block-missing-input": "H_BLOCK pay /nodes/pay/post/0/with",
  "h-route-target-missing": "H_ROUTE_TARGET lookup /nodes/lookup/post/0/routes/0",
  "h-route-human": "H_ROUTE_HUMAN gate /nodes/gate/post/0/routes",
  "h-route-effect-x3": "H_ROUTE_EFFECT lookup /nodes/lookup/post/0/routes/0",
  "h-retry-scope-pay": "H_RETRY_SCOPE pay /nodes/pay/post/0/allow_effect_retry",
  "h-cycle": "H_CYCLE null /nodes",
  "h-dominance": "H_DOMINANCE done /nodes/done/output/payment_id",
};

function load(group: HookCaseGroup): HookCase[] {
  let cases: HookCase[] = [];
  assert.doesNotThrow(() => {
    cases = hookCases(group);
  });
  return cases;
}

function check(text: string): ValidationResult {
  return validateFlowText(text, "yaml", catalogue);
}

test("C-b5fb44bc: the 9 invalid case files each give one H error with their code, node and path", () => {
  const cases = load("invalid");
  assert.deepEqual(cases.map((c) => c.name).sort(), Object.keys(INVALID_ROWS).sort());
  const union = new Set<string>();
  for (const c of cases) {
    assert.equal(c.group, "invalid");
    assert.equal(c.format, "yaml");
    const result = check(c.text);
    assert.equal(result.ok, false, c.name);
    assert.deepEqual(result.layers_run, ["L1", "L2", "L3", "H"], c.name);
    assert.equal(result.errors.length, 1, c.name);
    const error = result.errors[0];
    assert.ok(error !== undefined);
    assert.equal(error.layer, "H", c.name);
    assert.deepEqual(c.expect, [error.code], c.name);
    assert.equal(`${error.code} ${error.node} ${error.path}`, INVALID_ROWS[c.name], c.name);
    for (const code of c.expect) union.add(code);
  }
  assert.deepEqual([...union].sort(), [
    "H_BLOCK",
    "H_CYCLE",
    "H_DOMINANCE",
    "H_RETRY_SCOPE",
    "H_ROUTE_EFFECT",
    "H_ROUTE_HUMAN",
    "H_ROUTE_TARGET",
    "H_SCHEMA",
  ]);
  const cycle = cases.find((c) => c.name === "h-cycle");
  assert.ok(cycle !== undefined);
  assert.ok(check(cycle.text).errors[0]?.message.includes("gate -> pay -> gate"));
});

test("C-b5fb44bc: the 2 valid case files give no issue over four layers", () => {
  const cases = load("valid");
  assert.deepEqual(
    cases.map((c) => c.name),
    ["hooks-onion", "hooks-retry-read"],
  );
  for (const c of cases) {
    assert.deepEqual(c.expect, [], c.name);
    assert.deepEqual(c.expectWarnings, [], c.name);
    const result = check(c.text);
    assert.equal(result.ok, true, c.name);
    assert.deepEqual(result.errors, [], c.name);
    assert.deepEqual(result.warnings, [], c.name);
    assert.deepEqual(result.layers_run, ["L1", "L2", "L3", "H"], c.name);
  }
});

test("C-b5fb44bc: hooks-no-match gives ok true and the one W_NO_MATCH warning", () => {
  const cases = load("warnings");
  assert.deepEqual(
    cases.map((c) => c.name),
    ["hooks-no-match"],
  );
  const c = cases[0];
  assert.ok(c !== undefined);
  assert.deepEqual(c.expectWarnings, ["W_NO_MATCH"]);
  const result = check(c.text);
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(
    result.warnings.map((w) => [w.code, w.layer, w.node, w.path]),
    [["W_NO_MATCH", "H", null, "/hooks/0"]],
  );
  assert.deepEqual(
    result.warnings.map((w) => w.code),
    c.expectWarnings,
  );
});
