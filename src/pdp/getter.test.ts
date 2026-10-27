import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import type { Logger } from "../observability/index.ts";
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

function silentLogger(): Logger {
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

function defineGetter(target: object, key: string, get: () => unknown): void {
  Object.defineProperty(target, key, { configurable: true, enumerable: true, get });
}

function throwingGetter(): never {
  throw new Error("getter");
}

function principalWithThrowingType(): PolicyRequest {
  const request = baseRequest() as unknown as Record<string, unknown>;
  const principal: Record<string, unknown> = { id: "alice" };
  defineGetter(principal, "type", throwingGetter);
  request["principal"] = principal;
  return request as unknown as PolicyRequest;
}

function resourceWithThrowingId(): PolicyRequest {
  const request = baseRequest() as unknown as Record<string, unknown>;
  const resource: Record<string, unknown> = { type: "Doc" };
  defineGetter(resource, "id", throwingGetter);
  request["resource"] = resource;
  return request as unknown as PolicyRequest;
}

function entityWithThrowingField(field: "attrs" | "parents"): PolicyRequest {
  const request = baseRequest();
  const entity = request.entities.find((candidate) => candidate.uid.type === "Doc");
  assert.ok(entity !== undefined);
  defineGetter(entity, field, throwingGetter);
  return request;
}

function entityWithThrowingUidType(): PolicyRequest {
  const request = baseRequest();
  const entity = request.entities.find((candidate) => candidate.uid.type === "Doc");
  assert.ok(entity !== undefined);
  const uid: Record<string, unknown> = { id: "d1" };
  defineGetter(uid, "type", throwingGetter);
  (entity as unknown as Record<string, unknown>)["uid"] = uid;
  return request;
}

function requestWithThrowingEgressField(field: "method" | "host"): PolicyRequest {
  const request = baseRequest() as unknown as Record<string, unknown>;
  const egress: Record<string, unknown> = {};
  defineGetter(egress, field, throwingGetter);
  request["egress"] = egress;
  return request as unknown as PolicyRequest;
}

function requestWithThrowingContext(): PolicyRequest {
  const request = baseRequest();
  defineGetter(request.context, "n", throwingGetter);
  return request;
}

function principalChangingBetweenReads(): PolicyRequest {
  const request = baseRequest() as unknown as Record<string, unknown>;
  let reads = 0;
  defineGetter(request, "principal", () => {
    reads += 1;
    return reads === 1 ? { type: "User", id: "alice" } : { type: "User", id: "bob" };
  });
  return request as unknown as PolicyRequest;
}

function resourceChangingBetweenReads(): PolicyRequest {
  const request = baseRequest() as unknown as Record<string, unknown>;
  let reads = 0;
  defineGetter(request, "resource", () => {
    reads += 1;
    return reads === 1 ? { type: "Doc", id: "d1" } : { type: "Doc", id: "d2" };
  });
  return request as unknown as PolicyRequest;
}

function contextChangingBetweenReads(): PolicyRequest {
  const request = baseRequest();
  let reads = 0;
  defineGetter(request.context, "n", () => {
    reads += 1;
    return reads === 1 ? 0 : 5;
  });
  return request;
}

async function assertInvalid(pdp: Awaited<ReturnType<typeof makePdp>>, request: PolicyRequest): Promise<void> {
  const decision = await pdp.check(request);
  assert.equal(decision.decision, "deny");
  assert.deepEqual(decision.errors, ["PDP_REQUEST_INVALID"]);
  assert.deepEqual(decision.reasons, []);
}

test("C-8e384c2c a throwing getter inside a request field is a deny", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const requests = [
      principalWithThrowingType(),
      resourceWithThrowingId(),
      entityWithThrowingField("attrs"),
      entityWithThrowingField("parents"),
      entityWithThrowingUidType(),
      requestWithThrowingEgressField("method"),
      requestWithThrowingEgressField("host"),
      requestWithThrowingContext(),
    ];
    for (const request of requests) {
      await assertInvalid(pdp, request);
    }
  });
});

test("C-8e384c2c a getter that changes between reads is a deny", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    for (const request of [
      principalChangingBetweenReads(),
      resourceChangingBetweenReads(),
      contextChangingBetweenReads(),
    ]) {
      await assertInvalid(pdp, request);
    }
  });
});
