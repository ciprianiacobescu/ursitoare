import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import { sampleRequest } from "../../test/support/policy-samples.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { ACTION_NAMES } from "./actions.ts";
import type { ToolArgType } from "./cedar-schema.ts";
import { PdpError, type PdpErrorCode } from "./errors.ts";
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

async function makeSrcDir(fragments: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(dir);
  for (const [name, text] of Object.entries(fragments)) {
    const file = join(dir, name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text, "utf8");
  }
  return dir;
}

interface EngineFixture {
  fragments?: Record<string, string>;
  tenantPolicies?: PolicySource[];
  toolArgs?: Record<string, ToolArgType>;
}

async function engineWith(fixture: EngineFixture): Promise<PolicyEngine> {
  const srcDir = await makeSrcDir(fixture.fragments ?? {});
  const options: PolicyEngineOptions = {
    srcDir,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
  if (fixture.tenantPolicies !== undefined) {
    options.tenantPolicies = fixture.tenantPolicies;
  }
  if (fixture.toolArgs !== undefined) {
    options.toolArgs = fixture.toolArgs;
  }
  return createPolicyEngine(options);
}

async function rejectsWith(
  promise: Promise<PolicyEngine>,
  code: PdpErrorCode,
  details: Readonly<Record<string, string | readonly string[]>>,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof PdpError, "the rejection is a PdpError");
    assert.equal(error.code, code);
    for (const [key, value] of Object.entries(details)) {
      assert.deepEqual(error.details[key], value, `details.${key}`);
    }
    return true;
  });
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-36178217 the engine composes the platform fragment and tenant layers", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith({
      fragments: {
        "m/policy/a.cedar": '@id("m-a") permit (principal, action == Action::"read_flow", resource);',
      },
      tenantPolicies: [
        { id: "t-src", layer: "tenant", text: '@id("t-1") permit (principal, action == Action::"read_audit", resource);' },
      ],
    });
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  assert.deepEqual(engine.actions, ACTION_NAMES);
  const wanted = ["m-a", "platform-cross-tenant-forbid", "t-1"];
  assert.deepEqual(
    engine.policies
      .filter((policy) => wanted.includes(policy.id))
      .map((policy) => ({ id: policy.id, layer: policy.layer })),
    [
      { id: "m-a", layer: "platform" },
      { id: "platform-cross-tenant-forbid", layer: "platform" },
      { id: "t-1", layer: "tenant" },
    ],
  );
});

test("C-6cd26bce the tenant layer is empty by default", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith({});
  }, "createPolicyEngine");
  const pdp = engine;
  assert.ok(pdp !== undefined, "no engine");
  assert.ok(!pdp.policies.some((policy) => policy.layer === "tenant"), "a tenant policy exists");
  let request: PolicyRequest | undefined;
  assert.doesNotThrow(() => {
    request = sampleRequest("read_flow");
  }, "sampleRequest");
  const probe = request;
  assert.ok(probe !== undefined, "no request");
  let decision: Decision | undefined;
  await assert.doesNotReject(async () => {
    decision = await pdp.check(probe);
  }, "check");
  assert.ok(decision !== undefined, "no decision");
  assert.equal(decision.decision, "deny");
  assert.deepEqual(decision.reasons, []);
  assert.deepEqual(decision.errors, []);
});

test("C-1073bcc2 a fragment cannot reuse another policy id", async () => {
  const clamp = engineWith({
    fragments: {
      "m/policy/clash.cedar": '@id("platform-cross-tenant-forbid") permit (principal, action, resource);',
    },
  });
  await rejectsWith(clamp, "PDP_DUPLICATE_ID", { ids: ["platform-cross-tenant-forbid"] });
  const clash = engineWith({
    fragments: {
      "m/policy/one.cedar": '@id("dup") permit (principal, action, resource);',
      "m/policy/two.cedar": '@id("dup") permit (principal, action == Action::"read_flow", resource);',
    },
  });
  await rejectsWith(clash, "PDP_DUPLICATE_ID", { ids: ["dup"] });
});

test("C-22bfe218 a tenant policy cannot claim another layer or be anything else", async () => {
  const claimed = engineWith({
    fragments: {},
    tenantPolicies: [
      { id: "t-x", layer: "platform", text: '@id("t-2") permit (principal, action, resource);' },
    ],
  });
  await rejectsWith(claimed, "PDP_OPTIONS_INVALID", { reason: "layer" });
  const notAnArray = engineWith({
    fragments: {},
    tenantPolicies: "x" as unknown as PolicySource[],
  });
  await rejectsWith(notAnArray, "PDP_OPTIONS_INVALID", { reason: "policies" });
});

test("C-9b0d61e0 an invalid fragment is named not quoted", async () => {
  const unparsable = engineWith({
    fragments: { "m/policy/bad.cedar": "permit (principal," },
  });
  await rejectsWith(unparsable, "PDP_POLICY_INVALID", {
    stage: "parse",
    ids: ["m/policy/bad.cedar"],
  });
  const invalid = engineWith({
    fragments: {
      "m/policy/named.cedar": '@id("m-bad") permit (principal, action == Action::"reed", resource);',
    },
  });
  await rejectsWith(invalid, "PDP_POLICY_INVALID", { stage: "validate", ids: ["m-bad"] });
  const caught = await invalid.then(
    () => undefined,
    (error: unknown) => error,
  );
  assert.ok(caught instanceof Error, "the rejection is an error");
  assert.ok(!caught.message.includes("reed"), "the message quotes policy text");
});

test("C-013146c2 a fragment guards the resource type it reads", async () => {
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith({
      fragments: {
        "x/policy/own.cedar":
          '@id("x-own") permit (principal, action == Action::"edit_flow", resource is Flow) when { principal in resource.owner_team };',
      },
    });
  }, "createPolicyEngine");
  assert.ok(engine !== undefined, "no engine");
  assert.ok(
    engine.policies.some((policy) => policy.id === "x-own" && policy.layer === "platform"),
    "x-own is not loaded",
  );
  const unguarded = engineWith({
    fragments: {
      "x/policy/own.cedar":
        '@id("x-bad") permit (principal, action == Action::"edit_flow", resource) when { principal in resource.owner_team };',
    },
  });
  await rejectsWith(unguarded, "PDP_POLICY_INVALID", { ids: ["x-bad"] });
});

test("C-1b1cc447 tool arguments reach the policies and the policy set version", async () => {
  const fragment = {
    "m/policy/amount.cedar":
      '@id("m-amt") permit (principal, action == Action::"invoke_tool", resource) when { context.args has amount && context.args.amount.greaterThan(decimal("1.0000")) };',
  };
  let engine: PolicyEngine | undefined;
  await assert.doesNotReject(async () => {
    engine = await engineWith({ fragments: fragment, toolArgs: { amount: "decimal" } });
  }, "createPolicyEngine with toolArgs");
  assert.ok(engine !== undefined, "no engine");
  const rejected = engineWith({ fragments: fragment });
  await rejectsWith(rejected, "PDP_POLICY_INVALID", { ids: ["m-amt"] });
  const plain = engineWith({});
  const extended = engineWith({ toolArgs: { amount: "decimal" } });
  let plainVersion = "";
  let extendedVersion = "";
  await assert.doesNotReject(async () => {
    [plainVersion, extendedVersion] = await Promise.all([plain, extended]).then(
      ([first, second]) => [first.policySetVersion, second.policySetVersion],
    );
  }, "createPolicyEngine without the fragment");
  assert.notEqual(plainVersion, extendedVersion, "the policy set versions are equal");
  assert.ok(plainVersion !== "", "the plain version is empty");
});
