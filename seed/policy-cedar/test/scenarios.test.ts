import { test } from "node:test";
import assert from "node:assert/strict";
import { fixtureDirectory } from "../src/directory.ts";
import { PolicyEngine } from "../src/engine.ts";
import { SCENARIOS } from "../src/scenarios.ts";

const engines = new Map<boolean, PolicyEngine>();
const engineFor = (reviewed: boolean) => {
  if (!engines.has(reviewed)) engines.set(reviewed, new PolicyEngine(fixtureDirectory({ rf1Reviewed: reviewed })));
  return engines.get(reviewed)!;
};

test("scenario count >= 14", () => assert.ok(SCENARIOS.length >= 14, `${SCENARIOS.length}`));
test("scenario ids unique", () => assert.equal(new Set(SCENARIOS.map((s) => s.id)).size, SCENARIOS.length));

for (const s of SCENARIOS) {
  test(`${s.id} [${s.group}] ${s.title}`, () => {
    const d = engineFor(s.rf1Reviewed ?? false).check(s.req);
    assert.equal(d.decision, s.expect, `decision ${d.decision} reason=${d.reason}`);
    assert.ok(d.reason.includes(s.reason), `reason '${d.reason}' should include '${s.reason}'`);
    assert.deepEqual(d.errors, [], "no Cedar evaluation errors expected");
  });
}
