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

test("C-86a46101 an unknown action", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    for (const action of ["delete", ""]) {
      const request = baseRequest();
      request.action = action;
      const decision = await pdp.check(request);
      assert.equal(decision.decision, "deny");
      assert.deepEqual(decision.errors, ["PDP_UNKNOWN_ACTION"]);
      assert.deepEqual(decision.reasons, []);
    }
  });
});

test("C-513b047f the principal, the resource and uniqueness", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();

    const missingPrincipal = baseRequest();
    missingPrincipal.entities = missingPrincipal.entities.filter(
      (entity) => entity.uid.type !== "User",
    );

    const missingResource = baseRequest();
    missingResource.entities = missingResource.entities.filter(
      (entity) => entity.uid.type !== "Doc",
    );

    for (const request of [missingPrincipal, missingResource]) {
      const decision = await pdp.check(request);
      assert.equal(decision.decision, "deny");
      assert.deepEqual(decision.errors, ["PDP_ENTITY_MISSING"]);
      assert.deepEqual(decision.reasons, []);
    }

    const repeatedResource = baseRequest();
    repeatedResource.entities = [
      ...repeatedResource.entities,
      { uid: { type: "Doc", id: "d1" }, attrs: {}, parents: [] },
    ];
    const repeated = await pdp.check(repeatedResource);
    assert.equal(repeated.decision, "deny");
    assert.deepEqual(repeated.errors, ["PDP_REQUEST_INVALID"]);
    assert.deepEqual(repeated.reasons, []);
  });
});

test("C-8e384c2c a request that is not a request", async () => {
  const pdp = await makePdp();

  const nullRequest = pdp.check(null as unknown as PolicyRequest);
  await assert.doesNotReject(() => nullRequest);
  const nullDecision = await nullRequest;
  assert.equal(nullDecision.decision, "deny");
  assert.deepEqual(nullDecision.errors, ["PDP_REQUEST_INVALID"]);
  assert.deepEqual(nullDecision.reasons, []);

  const throwingContext = baseRequest();
  Object.defineProperty(throwingContext.context, "boom", {
    enumerable: true,
    get(): never {
      throw new Error("boom");
    },
  });
  const getterDecision = await pdp.check(throwingContext);
  assert.equal(getterDecision.decision, "deny");
  assert.deepEqual(getterDecision.errors, ["PDP_REQUEST_INVALID"]);
  assert.deepEqual(getterDecision.reasons, []);
});

test("C-5ddb14ef the limit is 24", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();

    const atLimit = baseRequest();
    for (let index = 1; index <= 21; index += 1) {
      atLimit.entities.push({
        uid: { type: "Role", id: `r${index}` },
        attrs: {},
        parents: [],
      });
    }
    assert.equal(atLimit.entities.length, 24);
    const allowed = await pdp.check(atLimit);
    assert.equal(allowed.decision, "allow");
    assert.deepEqual(allowed.reasons, ["t-read-own"]);
    assert.deepEqual(allowed.errors, []);

    const overLimit = baseRequest();
    for (let index = 1; index <= 22; index += 1) {
      overLimit.entities.push({
        uid: { type: "Role", id: `r${index}` },
        attrs: {},
        parents: [],
      });
    }
    assert.equal(overLimit.entities.length, 25);
    const denied = await pdp.check(overLimit);
    assert.equal(denied.decision, "deny");
    assert.deepEqual(denied.errors, ["PDP_SLICE_TOO_LARGE"]);
    assert.deepEqual(denied.reasons, []);
  });
});

test("C-2d7c0fab the array length is counted", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const request = baseRequest();
    request.entities = Array.from({ length: 25 }, () => ({
      uid: { type: "User", id: "alice" },
      attrs: {},
      parents: [],
    }));
    const decision = await pdp.check(request);
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.errors, ["PDP_SLICE_TOO_LARGE"]);
    assert.deepEqual(decision.reasons, []);
  });
});

test("C-b4a29f2d a huge attribute", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const request = baseRequest();
    request.entities = request.entities.map((entity) =>
      entity.uid.type === "Tool"
        ? { ...entity, attrs: { ...entity.attrs, effect: "x".repeat(300_000) } }
        : entity,
    );
    const decision = await pdp.check(request);
    assert.equal(decision.decision, "deny");
    assert.deepEqual(decision.errors, ["PDP_REQUEST_TOO_LARGE"]);
    assert.deepEqual(decision.reasons, []);
  });
});
