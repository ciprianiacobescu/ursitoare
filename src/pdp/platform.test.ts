import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { sampleRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { PLATFORM_POLICY_IDS, PLATFORM_SOURCE } from "./platform.ts";
import { createPolicyEngine, type PolicyEngine, type PolicyEngineOptions } from "./policy-engine.ts";
import type { Decision, PolicyRequest } from "./types.ts";

const tempDirs: string[] = [];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

async function engineWith(tenantPolicies: boolean): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(srcDir);
  const options: PolicyEngineOptions = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
  if (tenantPolicies) {
    options.tenantPolicies = [
      {
        id: "t-src",
        layer: "tenant",
        text: '@id("t-all") permit (principal, action, resource);',
      },
    ];
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

test("C-370a5607 the platform source holds the four sorted policy ids", () => {
  assert.equal(PLATFORM_SOURCE.id, "pdp/platform");
  assert.equal(PLATFORM_SOURCE.layer, "platform");
  assert.deepEqual(PLATFORM_POLICY_IDS, [
    "platform-cross-tenant-forbid",
    "platform-forbid-agent-consequential",
    "platform-forbid-untrusted-egress",
    "platform-read-self",
  ]);
});

test("C-370a5607 C-28aa9a7d an empty engine lists the platform policies and read_self is allowed without any role", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith(false);
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  const pdp = engine;

  const platformEntries = pdp.policies.filter((policy) => policy.layer === "platform");
  assert.deepEqual(
    platformEntries,
    PLATFORM_POLICY_IDS.map((id) => ({ id, layer: "platform" })),
    "the platform policies of the engine are wrong",
  );

  let allowedDecision: Decision | undefined;
  await assert.doesNotReject(async () => {
    allowedDecision = await checkOf(pdp, sampleRequest("read_self"));
  }, "read_self check");
  assert.ok(allowedDecision !== undefined, "no read_self decision");
  assert.equal(allowedDecision.decision, "allow", "read_self is not allowed");
  assert.deepEqual(allowedDecision.reasons, ["platform-read-self"], "read_self has the wrong reasons");
  assert.deepEqual(allowedDecision.errors, [], "read_self has errors");

  let deniedDecision: Decision | undefined;
  await assert.doesNotReject(async () => {
    deniedDecision = await checkOf(pdp, sampleRequest("author_flow"));
  }, "author_flow check");
  assert.ok(deniedDecision !== undefined, "no author_flow decision");
  assert.equal(deniedDecision.decision, "deny", "author_flow is not denied");
  assert.deepEqual(deniedDecision.reasons, [], "author_flow has reasons");
  assert.deepEqual(deniedDecision.errors, [], "author_flow has errors");
});
