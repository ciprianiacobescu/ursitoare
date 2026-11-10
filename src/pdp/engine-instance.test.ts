import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { sampleRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import type { Decision, PolicyRequest, PolicySource } from "./types.ts";
import {
  createPolicyEngine,
  type PolicyEngine,
  type PolicyEngineOptions,
} from "./policy-engine.ts";

const tempDirs: string[] = [];

const PERMIT: PolicySource = {
  id: "t/a",
  layer: "tenant",
  text: '@id("t-audit")\npermit (principal, action == Action::"read_audit", resource);',
};

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

async function makeSrcDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(dir);
  return dir;
}

interface EngineExtra {
  tenantPolicies?: readonly PolicySource[];
  instanceId?: string;
}

function options(srcDir: string, extra: EngineExtra): PolicyEngineOptions {
  const opts: PolicyEngineOptions & { instanceId?: string } = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
  if (extra.tenantPolicies !== undefined) {
    opts.tenantPolicies = extra.tenantPolicies;
  }
  if (extra.instanceId !== undefined) {
    opts.instanceId = extra.instanceId;
  }
  return opts;
}

async function engineWith(srcDir: string, extra: EngineExtra): Promise<PolicyEngine> {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await createPolicyEngine(options(srcDir, extra));
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  return engine;
}

async function decisionOf(engine: PolicyEngine, request: PolicyRequest): Promise<Decision> {
  let decision: Decision | undefined;
  await assert.doesNotReject(async () => {
    decision = await engine.check(request);
  }, "check");
  assert.ok(decision !== undefined, "no decision");
  return decision;
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-5c1171f6 an instance id replaces the preparsed set of that id", async () => {
  const srcDir = await makeSrcDir();
  let request: PolicyRequest | undefined;
  assert.doesNotThrow(() => {
    request = sampleRequest("read_audit");
  }, "sampleRequest");
  assert.ok(request !== undefined, "no request");
  const probe = request;

  const e0 = await engineWith(srcDir, { tenantPolicies: [PERMIT] });
  const e1 = await engineWith(srcDir, { tenantPolicies: [PERMIT], instanceId: "x/live" });
  const e3 = await engineWith(srcDir, { tenantPolicies: [PERMIT], instanceId: "x/other" });

  const before = await decisionOf(e1, probe);
  assert.equal(before.decision, "allow");
  assert.deepEqual(before.reasons, ["t-audit"]);
  assert.deepEqual(before.errors, []);

  const e2 = await engineWith(srcDir, { instanceId: "x/live" });

  const replaced = await decisionOf(e1, probe);
  assert.equal(replaced.decision, "deny");
  assert.deepEqual(replaced.reasons, []);
  assert.deepEqual(replaced.errors, []);

  const replacement = await decisionOf(e2, probe);
  assert.equal(replacement.decision, "deny");
  assert.deepEqual(replacement.reasons, []);
  assert.deepEqual(replacement.errors, []);

  const other = await decisionOf(e3, probe);
  assert.equal(other.decision, "allow");
  assert.deepEqual(other.reasons, ["t-audit"]);
  assert.deepEqual(other.errors, []);

  const none = await decisionOf(e0, probe);
  assert.equal(none.decision, "allow");
  assert.deepEqual(none.reasons, ["t-audit"]);
  assert.deepEqual(none.errors, []);

  assert.equal(e1.policySetVersion, e0.policySetVersion);
  assert.notEqual(e1.policySetVersion, e2.policySetVersion);
});
