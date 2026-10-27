// Architecture test of the browser gate: the e2e stack tests run unconditionally on the fake profile.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { REPO_ROOT } from "./sources.ts";

const E2E_STACK_TEST = join(REPO_ROOT, "e2e", "test_e2e_stack.py");

test("C-e23019c4: the e2e stack browser gate has no skip or xfail call, marker or guard", () => {
  const text = readFileSync(E2E_STACK_TEST, "utf8");

  for (const forbidden of [
    /pytest\.skip\b/,
    /pytest\.xfail\b/,
    /@pytest\.mark\.skip\b/,
    /@pytest\.mark\.skipif\b/,
    /@pytest\.mark\.xfail\b/,
    /_require_fake_profile/,
  ]) {
    assert.doesNotMatch(text, forbidden);
  }

  for (const name of [
    "test_health_reports_database_ok",
    "test_control_paths_are_not_on_the_engine_port",
    "test_injected_fault_fails_the_route",
    "test_fresh_state_clears_faults",
    "test_fresh_state_is_a_noop_on_the_stack_profile",
    "test_fresh_state_reports_an_unreachable_control_url",
  ]) {
    assert.match(text, new RegExp(`def ${name}\\(`));
  }

  for (const id of ["C-0828b57f", "C-67438cd6", "C-ef0357b4"]) {
    assert.match(text, new RegExp(`@pytest\\.mark\\.l4\\("${id}"\\)`));
  }

  assert.match(text, /e2e_profile: str/);
});
