import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { sampleRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { ACTION_NAMES, type ActionName } from "./actions.ts";
import { createPolicyEngine, type PolicyEngine, type PolicyEngineOptions } from "./policy-engine.ts";
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

for (const name of ACTION_NAMES as readonly ActionName[]) {
  test(`C-11f08103 ${name} is allowed on the same tenant and denied across tenants on a permit-all engine`, async () => {
    let engine: PolicyEngine | undefined;
    await assert.doesNotReject(async () => {
      engine = await engineWith([PERMIT_SOURCE]);
    }, "createPolicyEngine");
    assert.ok(engine !== undefined, "no engine");
    const pdp = engine;

    let request: PolicyRequest | undefined;
    assert.doesNotThrow(() => {
      request = sampleRequest(name);
    }, "sampleRequest");
    const sameTenant = await checkOf(pdp, request as PolicyRequest);
    assert.ok(sameTenant !== undefined, "no same-tenant decision");
    assert.equal(sameTenant.decision, "allow");
    assert.deepEqual(sameTenant.errors, []);
    assert.ok(sameTenant.reasons.includes("t-all"), "t-all is not a reason");

    let across: PolicyRequest | undefined;
    assert.doesNotThrow(() => {
      across = sampleRequest(name, { principalTenant: "tenant_a", resourceTenant: "tenant_b" });
    }, "sampleRequest across tenants");
    const crossTenant = await checkOf(pdp, across as PolicyRequest);
    assert.ok(crossTenant !== undefined, "no cross-tenant decision");
    assert.equal(crossTenant.decision, "deny");
    assert.deepEqual(crossTenant.reasons, ["platform-cross-tenant-forbid"]);
    assert.deepEqual(crossTenant.errors, []);
  });
}

test("C-b66e39a6 a cross-tenant read_self is denied by the platform without tenant policies", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith([]);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  let request: PolicyRequest | undefined;
  assert.doesNotThrow(() => {
    request = sampleRequest("read_self", { principalTenant: "tenant_b", resourceTenant: "tenant_a" });
  }, "sampleRequest");
  const decision = await checkOf(pdp, request as PolicyRequest);
  assert.ok(decision !== undefined, "no decision");
  assert.equal(decision.decision, "deny");
  assert.deepEqual(decision.reasons, ["platform-cross-tenant-forbid"]);
  assert.deepEqual(decision.errors, []);
});
