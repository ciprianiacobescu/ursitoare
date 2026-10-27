import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { createPdp, entityRef } from "./index.ts";
import type { Egress, PolicyRequest, PolicySource } from "./types.ts";

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

const BODY_DIGEST = "ab".repeat(32);

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

function sendRequest(): PolicyRequest {
  const request = baseRequest();
  request.action = "send";
  return request;
}

function validEgress(): Egress {
  return {
    method: "POST",
    host: "api.example.test",
    path: "/v1/send",
    bodyDigest: BODY_DIGEST,
    serviceId: "svc_mail",
    ttlSeconds: 60,
  };
}

test("C-44202a58 a permit is an exact copy of the egress", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const request = sendRequest();
    const egress = { ...validEgress(), x: "extra" };
    request.egress = egress;

    const decision = await pdp.check(request);
    assert.equal(decision.decision, "allow");
    assert.deepEqual(decision.permit, {
      method: "POST",
      host: "api.example.test",
      path: "/v1/send",
      bodyDigest: BODY_DIGEST,
      serviceId: "svc_mail",
      ttlSeconds: 60,
    });
    assert.notEqual(decision.permit, egress);
    assert.ok(decision.permit !== undefined);
    assert.equal(Object.prototype.hasOwnProperty.call(decision.permit, "x"), false);

    egress.host = "changed.example.test";
    assert.equal(decision.permit.host, "api.example.test");
  });
});

test("C-344619fe C-44202a58 no permit without allow or without egress", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();

    const denied = sendRequest();
    denied.egress = validEgress();
    denied.entities = denied.entities.map((entity) =>
      entity.uid.type === "Doc"
        ? { ...entity, attrs: { ...entity.attrs, locked: true } }
        : entity,
    );
    const deniedDecision = await pdp.check(denied);
    assert.equal(deniedDecision.decision, "deny");
    assert.equal(deniedDecision.permit, undefined);

    const withoutEgress = sendRequest();
    const withoutEgressDecision = await pdp.check(withoutEgress);
    assert.equal(withoutEgressDecision.decision, "allow");
    assert.equal(withoutEgressDecision.permit, undefined);

    const withEgress = sendRequest();
    withEgress.egress = validEgress();
    const withEgressDecision = await pdp.check(withEgress);
    assert.equal(withEgressDecision.decision, "allow");
    assert.deepEqual(withEgressDecision.permit, validEgress());
  });
});

test("C-97a803d9 an invalid egress denies", async () => {
  await assert.doesNotReject(async () => {
    const pdp = await makePdp();
    const invalid: readonly Egress[] = [
      { ...validEgress(), method: "post" },
      { ...validEgress(), host: "Evil.test" },
      { ...validEgress(), path: "v1" },
      { ...validEgress(), path: "/a\r\nHost: x" },
      { ...validEgress(), bodyDigest: "a".repeat(63) },
      { ...validEgress(), ttlSeconds: 0 },
      { ...validEgress(), ttlSeconds: 3601 },
      { ...validEgress(), ttlSeconds: 1.5 },
    ];

    for (const egress of invalid) {
      const request = sendRequest();
      request.egress = egress;
      const decision = await pdp.check(request);
      assert.equal(decision.decision, "deny");
      assert.deepEqual(decision.errors, ["PDP_REQUEST_INVALID"]);
      assert.equal(decision.permit, undefined);
    }

    const maxTtl = sendRequest();
    maxTtl.egress = { ...validEgress(), ttlSeconds: 3600 };
    const maxTtlDecision = await pdp.check(maxTtl);
    assert.equal(maxTtlDecision.decision, "allow");
    assert.deepEqual(maxTtlDecision.permit, { ...validEgress(), ttlSeconds: 3600 });

    const loopback = sendRequest();
    loopback.egress = { ...validEgress(), host: "127.0.0.1:39080" };
    const loopbackDecision = await pdp.check(loopback);
    assert.equal(loopbackDecision.decision, "allow");
    assert.deepEqual(loopbackDecision.permit, { ...validEgress(), host: "127.0.0.1:39080" });
  });
});
