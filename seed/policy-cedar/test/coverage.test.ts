// Mutation check: removing any single policy must change at least one scenario outcome.
// Proves the scenario suite actually exercises every policy (no dead or untested policy).
import { test } from "node:test";
import assert from "node:assert/strict";
import { loadPolicyMap } from "../src/cedar.ts";
import { fixtureDirectory } from "../src/directory.ts";
import { PolicyEngine } from "../src/engine.ts";
import { SCENARIOS } from "../src/scenarios.ts";

const run = (policies: Record<string, string>) =>
  SCENARIOS.map((s) => {
    const d = new PolicyEngine(fixtureDirectory({ rf1Reviewed: s.rf1Reviewed ?? false }), undefined, policies).check(s.req);
    return `${d.decision}|${d.reason}`;
  });

test("every policy is load-bearing in at least one scenario", () => {
  const all = loadPolicyMap();
  const baseline = run(all);
  const untested: string[] = [];
  for (const id of Object.keys(all)) {
    const { [id]: _drop, ...rest } = all;
    const mutated = run(rest);
    if (mutated.every((m, i) => m === baseline[i])) untested.push(id);
  }
  assert.deepEqual(untested, [], `policies no scenario depends on: ${untested.join(", ")}`);
});
