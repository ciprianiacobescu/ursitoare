import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { issuedPermit } from "../../test/support/gateway-kit.ts";
import { isIssuedPermit } from "./permit.ts";
import type { Egress, PolicyRequest, PolicySource } from "./types.ts";
import { createPdp } from "./index.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const BODY_DIGEST = "0e9900c914ed43a1be38e237e918e29501562e302390f970957dd30a83a41966";

const BASE: Egress = {
  method: "POST",
  host: "tools.fake.test",
  path: "/v1/lookup?id=7",
  bodyDigest: BODY_DIGEST,
  serviceId: S1,
  ttlSeconds: 60,
};

const LOCAL_SCHEMA = `entity User { allow: Bool };
entity Doc;
action send appliesTo { principal: User, resource: Doc, context: {} };
`;

const LOCAL_POLICY: PolicySource = {
  id: "tenant.cedar",
  layer: "tenant",
  text: `@id("allow-send") permit (principal, action == Action::"send", resource) when { principal.allow };`,
};

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: {
      write(_line: string): void {},
    },
  });
}

function makeLocalPdp() {
  return createPdp({
    schema: LOCAL_SCHEMA,
    policies: [LOCAL_POLICY],
    clock: fixedClock("2026-11-06T10:00:00Z"),
    ids: sequentialIds(),
    logger: silentLogger(),
  });
}

function localRequest(entityId: string, allow: boolean, egress?: Egress): PolicyRequest {
  return {
    principal: { type: "User", id: entityId },
    action: "send",
    resource: { type: "Doc", id: "d1" },
    context: {},
    entities: [
      { uid: { type: "User", id: entityId }, attrs: { allow }, parents: [] },
      { uid: { type: "Doc", id: "d1" }, attrs: {}, parents: [] },
    ],
    ...(egress === undefined ? {} : { egress }),
  };
}

test("C-4846a8b6 issuedPermit returns the frozen base permit", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();
    assert.equal(isIssuedPermit(p), true);
    assert.deepEqual(p, BASE);
    assert.ok(Object.isFrozen(p));
    assert.deepEqual(Object.keys(p), ["method", "host", "path", "bodyDigest", "serviceId", "ttlSeconds"]);
  });
});

test("C-4846a8b6 isIssuedPermit refuses values that are not this process's permit", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();
    const alien: unknown[] = [
      { ...p },
      structuredClone(p),
      JSON.parse(JSON.stringify(p)) as unknown,
      Object.freeze({ ...BASE }),
      null,
      undefined,
      0,
      "x",
      [],
      {},
      () => p,
    ];
    for (const value of alien) {
      assert.equal(isIssuedPermit(value), false);
    }
  });
});

test("C-4846a8b6 a second engine's permit is accepted and non permit decisions carry none", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();
    const q = await issuedPermit({ ttlSeconds: 30 });
    assert.equal(isIssuedPermit(p), true);
    assert.equal(isIssuedPermit(q), true);
    assert.notEqual(p, q);
    assert.deepEqual(q, { ...BASE, ttlSeconds: 30 });

    const pdp = await makeLocalPdp();
    const denied = await pdp.check(localRequest("bob", false, { ...BASE }));
    assert.equal(denied.decision, "deny");
    assert.equal(denied.permit, undefined);

    const egressless = await pdp.check(localRequest("alice", true));
    assert.equal(egressless.decision, "allow");
    assert.equal(egressless.permit, undefined);

    const allowed = await pdp.check(localRequest("alice", true, { ...BASE }));
    assert.equal(allowed.decision, "allow");
    assert.ok(allowed.permit !== undefined);
    assert.equal(isIssuedPermit(allowed.permit), true);
    assert.deepEqual(allowed.permit, BASE);
  });
});
