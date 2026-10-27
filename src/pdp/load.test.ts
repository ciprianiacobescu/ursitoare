import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { PdpError, createPdp } from "./index.ts";
import type { PdpErrorCode } from "./index.ts";
import type { PolicyLayer, PolicySource } from "./types.ts";

const SCHEMA = `entity Role;
entity User in [Role];
entity Tool { effect: String };
entity Doc { owner: User, locked: Bool };
action read, write, send appliesTo {
  principal: User, resource: Doc, context: { n: Long, tool: Tool, amount?: decimal } };
`;

const PLATFORM: PolicySource = {
  id: "platform.cedar",
  layer: "platform",
  text: '@id("p-forbid-locked") forbid (principal, action, resource) when { resource.locked };',
};

const TENANT: PolicySource = {
  id: "tenant.cedar",
  layer: "tenant",
  text: `@id("t-read-own") permit (principal, action == Action::"read", resource) when { resource.owner == principal };
@id("t-write-admin") permit (principal in Role::"admin", action == Action::"write", resource);
@id("t-send-tool") permit (principal, action == Action::"send", resource) when { context.tool.effect == "send" };
@id("t-forbid-big") forbid (principal, action == Action::"write", resource) when { context.n * 9223372036854775807 > 100 };`,
};

const TEST_SET: readonly PolicySource[] = [PLATFORM, TENANT];

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function options(policies: PolicySource[]) {
  return {
    schema: SCHEMA,
    policies,
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  };
}

async function rejectsWith(
  promise: Promise<unknown>,
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

test("C-df8b4318 the test set loads", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await createPdp(options([...TEST_SET]));
    assert.deepEqual(pdp.actions, ["read", "send", "write"]);
    assert.deepEqual(pdp.policies, [
      { id: "p-forbid-locked", layer: "platform" },
      { id: "t-forbid-big", layer: "tenant" },
      { id: "t-read-own", layer: "tenant" },
      { id: "t-send-tool", layer: "tenant" },
      { id: "t-write-admin", layer: "tenant" },
    ]);
  });
});

test("C-67cd4eae the message never holds policy text", async () => {
  const source: PolicySource = {
    id: "secret-src",
    layer: "tenant",
    text: '@id("bad") permit (principal, action == Action::"read", resource) when { context.n == "ZZ-SECRET-MARKER" };',
  };
  await assert.rejects(createPdp(options([source])), (error: unknown) => {
    assert.ok(error instanceof PdpError, "the rejection is a PdpError");
    assert.equal(error.code, "PDP_POLICY_INVALID");
    assert.ok(error.message.includes("bad"), "the message names the policy id");
    assert.ok(!error.message.includes("ZZ-SECRET-MARKER"), "the message does not hold policy text");
    return true;
  });
});

test("C-67e34552 a policy without id and a template are refused", async () => {
  await rejectsWith(
    createPdp(
      options([{ id: "no-id", layer: "tenant", text: "permit (principal, action, resource);" }]),
    ),
    "PDP_POLICY_INVALID",
    { stage: "id", ids: ["no-id"] },
  );
  await rejectsWith(
    createPdp(
      options([
        {
          id: "tpl",
          layer: "tenant",
          text: '@id("tpl-1") permit (principal == ?principal, action, resource);',
        },
      ]),
    ),
    "PDP_POLICY_INVALID",
    { stage: "template", ids: ["tpl"] },
  );
});

test("C-805d95d1 a bad schema is refused", async () => {
  await rejectsWith(createPdp({ ...options([]), schema: "entity ;" }), "PDP_SCHEMA_INVALID", {});
  await rejectsWith(
    createPdp({ ...options([]), schema: `namespace N {\n${SCHEMA}}\n` }),
    "PDP_SCHEMA_INVALID",
    { reason: "namespace" },
  );
});

test("C-3e84c79f bad options are refused", async () => {
  await rejectsWith(
    createPdp({ ...options([]), policies: "not-an-array" as unknown as PolicySource[] }),
    "PDP_OPTIONS_INVALID",
    { reason: "policies" },
  );
  await rejectsWith(
    createPdp(options([{ id: "bad id", layer: "tenant", text: "" }])),
    "PDP_OPTIONS_INVALID",
    { reason: "source_id" },
  );
  await rejectsWith(
    createPdp(
      options([{ id: "src", layer: "other" as unknown as PolicyLayer, text: "" }]),
    ),
    "PDP_OPTIONS_INVALID",
    { reason: "layer" },
  );
  await rejectsWith(
    createPdp(
      options([{ id: "src", layer: "tenant", text: 1 as unknown as string }]),
    ),
    "PDP_OPTIONS_INVALID",
    { reason: "text" },
  );
});

test("C-a1ac8630 a tenant policy cannot reuse a platform id", async () => {
  await rejectsWith(
    createPdp(
      options([
        PLATFORM,
        {
          id: "tenant-dup",
          layer: "tenant",
          text: '@id("p-forbid-locked") permit (principal, action, resource);',
        },
      ]),
    ),
    "PDP_DUPLICATE_ID",
    { ids: ["p-forbid-locked"] },
  );
});

test("C-f0412753 a repeat inside one source and a repeated source id", async () => {
  await rejectsWith(
    createPdp(
      options([
        {
          id: "one-src",
          layer: "tenant",
          text: `@id("dup") permit (principal, action, resource);
@id("dup") permit (principal, action, resource);`,
        },
      ]),
    ),
    "PDP_DUPLICATE_ID",
    { ids: ["dup"], stage: "policy" },
  );
  await rejectsWith(
    createPdp(
      options([
        { id: "s1", layer: "tenant", text: "" },
        { id: "s1", layer: "platform", text: "" },
      ]),
    ),
    "PDP_DUPLICATE_ID",
    { ids: ["s1"], stage: "source" },
  );
});
