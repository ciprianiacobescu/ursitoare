import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { createPdp, entityRef } from "./index.ts";
import type { PolicyRequest, PolicySource } from "./types.ts";

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

function makePdp() {
  return createPdp({
    schema: SCHEMA,
    policies: [...TEST_SET],
    clock: fixedClock("2026-10-25T09:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function baseRequest(): PolicyRequest {
  return {
    principal: { type: "User", id: "alice" },
    action: "read",
    resource: { type: "Doc", id: "d1" },
    context: { n: 0, tool: entityRef("Tool", "mail") },
    entities: [
      { uid: { type: "User", id: "alice" }, attrs: {}, parents: [{ type: "Role", id: "admin" }] },
      {
        uid: { type: "Doc", id: "d1" },
        attrs: { owner: entityRef("User", "alice"), locked: false },
        parents: [],
      },
      { uid: { type: "Tool", id: "mail" }, attrs: { effect: "send" }, parents: [] },
    ],
  };
}

function writeRequest(n: number): PolicyRequest {
  const request = baseRequest();
  request.action = "write";
  request.context = { n, tool: entityRef("Tool", "mail") };
  return request;
}

function sendRequest(includeTool: boolean): PolicyRequest {
  const request = baseRequest();
  request.action = "send";
  request.context = { n: 0, tool: entityRef("Tool", "mail") };
  if (!includeTool) {
    request.entities = request.entities.filter((entity) => entity.uid.type !== "Tool");
  }
  return request;
}

test("C-de410d69 a forbid that errors is not skipped", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const decision = await pdp.check(writeRequest(2));
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.reasons, ["t-write-admin"]);
    assert.deepEqual(decision.errors, ["PDP_EVALUATION_ERROR:t-forbid-big"]);
  });
});

test("C-5da4120c a missing entity is an error", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();

    const missing = await pdp.check(sendRequest(false));
    assert.equal(missing.decision, "deny");
    assert.deepEqual(missing.reasons, []);
    assert.deepEqual(missing.errors, ["PDP_EVALUATION_ERROR:t-send-tool"]);

    const present = await pdp.check(sendRequest(true));
    assert.equal(present.decision, "allow");
    assert.deepEqual(present.reasons, ["t-send-tool"]);
    assert.deepEqual(present.errors, []);
  });
});

test("C-03fddafe a rejected request is a deny with a fixed code", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();

    const undeclaredAttribute = baseRequest();
    undeclaredAttribute.context = { ...undeclaredAttribute.context, zzz: 1 };

    const undeclaredEntity = baseRequest();
    undeclaredEntity.entities = [
      ...undeclaredEntity.entities,
      { uid: { type: "Zed", id: "z1" }, attrs: {}, parents: [] },
    ];

    const wrongAttributeType = baseRequest();
    wrongAttributeType.context = { ...wrongAttributeType.context, n: 1.5 };

    for (const request of [undeclaredAttribute, undeclaredEntity, wrongAttributeType]) {
      const decision = await pdp.check(request);
      assert.equal(decision.decision, "deny");
      assert.deepEqual(decision.errors, ["PDP_REQUEST_INVALID"]);
      assert.deepEqual(decision.reasons, []);
    }
  });
});
