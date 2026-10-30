import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { invokeToolRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import {
  createPolicyEngine,
  type PolicyEngine,
  type PolicyEngineOptions,
} from "./policy-engine.ts";
import type { Decision, PolicyRequest, PolicySource } from "./types.ts";

const tempDirs: string[] = [];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

const PERMIT_SOURCE: PolicySource = {
  id: "t-src",
  layer: "tenant",
  text: '@id("t-all") permit (principal, action, resource);',
};

async function engineWith(tenantPolicies: readonly PolicySource[]): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(srcDir);
  const options: PolicyEngineOptions = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
  if (tenantPolicies.length > 0) {
    options.tenantPolicies = tenantPolicies;
  }
  return createPolicyEngine(options);
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function checkOf(
  engine: PolicyEngine,
  request: PolicyRequest,
): Promise<Decision | undefined> {
  let decision: Decision | undefined;
  await assert.doesNotReject(async () => {
    decision = await engine.check(request);
  }, "check");
  return decision;
}

test("C-b820255a C-2fd6be49 untrusted taint denies write send and pay and read stays allowed", async () => {
  let permitAll: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    permitAll = await engineWith([PERMIT_SOURCE]);
  }, "createPolicyEngine");
  assert.ok(permitAll !== undefined, "no permit-all engine");

  let noPermit: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    noPermit = await engineWith([]);
  }, "createPolicyEngine without tenant policies");
  assert.ok(noPermit !== undefined, "no engine without tenant policies");

  const withPermit = permitAll;
  const withoutPermit = noPermit;

  for (const effect of ["write", "send", "pay"]) {
    const decision = await checkOf(
      withPermit,
      invokeToolRequest({ effect, taint: ["untrusted"], blockKind: "code" }),
    );
    assert.ok(decision !== undefined, `no decision for effect ${effect}`);
    assert.equal(decision.decision, "deny", `effect ${effect} is not denied`);
    assert.deepEqual(
      decision.reasons,
      ["platform-forbid-untrusted-egress"],
      `effect ${effect} has the wrong reasons`,
    );
    assert.deepEqual(decision.errors, [], `effect ${effect} has errors`);
  }

  const readOnPermitAll = await checkOf(
    withPermit,
    invokeToolRequest({ effect: "read", taint: ["untrusted"], blockKind: "code" }),
  );
  assert.ok(readOnPermitAll !== undefined, "no read decision on the permit-all engine");
  assert.equal(readOnPermitAll.decision, "allow", "read is not allowed on the permit-all engine");
  assert.deepEqual(readOnPermitAll.reasons, ["t-all"], "read does not carry t-all");
  assert.deepEqual(readOnPermitAll.errors, [], "read has errors");

  const readWithoutPermit = await checkOf(
    withoutPermit,
    invokeToolRequest({ effect: "read", taint: ["untrusted"], blockKind: "code" }),
  );
  assert.ok(readWithoutPermit !== undefined, "no read decision without tenant policies");
  assert.equal(readWithoutPermit.decision, "deny", "read is not denied without tenant policies");
  assert.deepEqual(
    readWithoutPermit.reasons,
    [],
    "read without tenant policies has reasons",
  );
  assert.deepEqual(readWithoutPermit.errors, [], "read without tenant policies has errors");
});

test("C-212b8288 a write is allowed without untrusted taint and denied with it", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith([PERMIT_SOURCE]);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const permitAll = engine;

  const allowedOne = await checkOf(
    permitAll,
    invokeToolRequest({ effect: "write", taint: [], blockKind: "code" }),
  );
  assert.ok(allowedOne !== undefined, "no decision for empty taint");
  assert.equal(allowedOne.decision, "allow", "empty taint is not allowed");
  assert.deepEqual(allowedOne.errors, [], "empty taint has errors");

  const allowedTwo = await checkOf(
    permitAll,
    invokeToolRequest({ effect: "write", taint: ["extracted"], blockKind: "code" }),
  );
  assert.ok(allowedTwo !== undefined, "no decision for extracted taint");
  assert.equal(allowedTwo.decision, "allow", "extracted taint is not allowed");
  assert.deepEqual(allowedTwo.errors, [], "extracted taint has errors");

  const denied = await checkOf(
    permitAll,
    invokeToolRequest({
      effect: "write",
      taint: ["extracted", "untrusted"],
      blockKind: "code",
    }),
  );
  assert.ok(denied !== undefined, "no decision for untrusted taint");
  assert.equal(denied.decision, "deny", "untrusted taint is not denied");
  assert.deepEqual(
    denied.reasons,
    ["platform-forbid-untrusted-egress"],
    "untrusted taint has the wrong reasons",
  );
  assert.deepEqual(denied.errors, [], "untrusted taint has errors");
});
