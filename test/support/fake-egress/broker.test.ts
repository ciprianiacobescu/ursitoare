import assert from "node:assert/strict";
import { createPublicKey, verify } from "node:crypto";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";

const T0 = new Date("2026-11-06T10:00:00.000Z");
const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const KID = /^kid_[0-9A-HJKMNP-TV-Z]{26}$/;
const JTI = /^jti_[0-9A-HJKMNP-TV-Z]{26}$/;
const T1 = "ttl_seconds must be between 1 and 3600";
const T2 = "Invalid request body";

interface Answer {
  status: number;
  text: string;
  allow: string | null;
}

interface Jwk {
  kty: string;
  crv: string;
  alg: string;
  use: string;
  kid: string;
  x: string;
}

function baseBody(): Record<string, unknown> {
  return { agent_id: "alice", service_id: S1, tenant_id: T_A, scope: "call", ttl_seconds: 60 };
}

function without(body: Record<string, unknown>, member: string): Record<string, unknown> {
  return Object.fromEntries(Object.entries(body).filter(([k]) => k !== member));
}

async function call(base: string, method: string, path: string, token: string | null, body?: string): Promise<Answer> {
  const headers: Record<string, string> = {};
  if (token !== null) headers["X-Mintkey-Service-Token"] = token;
  const init: RequestInit = { method, headers };
  if (body !== undefined) init.body = body;
  const res = await fetch(base + path, init);
  return { status: res.status, text: await res.text(), allow: res.headers.get("allow") };
}

function b64u(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

async function start(): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => T0 });
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

test("C-5004676d issue succeeds and is recorded", async () => {
  const fake = await start();
  try {
    const res = await call(fake.brokerUrl, "POST", "/v1/issue", fake.brokerServiceToken, JSON.stringify(baseBody()));
    assert.equal(res.status, 200);
    const answer = JSON.parse(res.text) as { token: string; expires_at: number };
    assert.equal(answer.expires_at, 1793959260);

    const [h, p, s] = answer.token.split(".") as [string, string, string];
    const header = JSON.parse(b64u(h).toString("utf8")) as Record<string, unknown>;
    assert.deepEqual(Object.keys(header).sort(), ["alg", "kid", "typ"]);
    assert.equal(header["alg"], "EdDSA");
    assert.equal(header["typ"], "JWT");
    assert.match(String(header["kid"]), KID);
    const claims = JSON.parse(b64u(p).toString("utf8")) as Record<string, unknown>;
    assert.match(String(claims["jti"]), JTI);
    const jti = String(claims["jti"]);
    assert.deepEqual(claims, {
      aud: [S1],
      exp: 1793959260,
      iat: 1793959200,
      iss: "mintkey/broker",
      jti,
      scope: "call",
      service_id: S1,
      sub: "alice",
      tenant_id: T_A,
      tnt: T_A,
    });

    const jwksRes = await call(fake.brokerUrl, "GET", "/.well-known/jwks.json", null);
    assert.equal(jwksRes.status, 200);
    const jwks = JSON.parse(jwksRes.text) as { keys: Jwk[] };
    assert.equal(jwks.keys.length, 1);
    const jwk = jwks.keys[0] as Jwk;
    assert.deepEqual(Object.keys(jwk).sort(), ["alg", "crv", "kid", "kty", "use", "x"]);
    assert.equal(jwk.kty, "OKP");
    assert.equal(jwk.crv, "Ed25519");
    assert.equal(jwk.alg, "EdDSA");
    assert.equal(jwk.use, "sig");
    assert.equal(jwk.kid, header["kid"]);
    const key = createPublicKey({ key: { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, format: "jwk" });
    assert.equal(verify(null, Buffer.from(`${h}.${p}`), key, b64u(s)), true);
    const forged = Buffer.from(JSON.stringify({ ...claims, sub: "mallory" })).toString("base64url");
    assert.equal(verify(null, Buffer.from(`${h}.${forged}`), key, b64u(s)), false);

    assert.deepEqual(fake.issued(), [
      { jti, serviceId: S1, tenantId: T_A, agentId: "alice", ttlSeconds: 60, issuedAt: 1793959200, expiresAt: 1793959260 },
    ]);
    assert.deepEqual(fake.events(), [
      {
        emitter: "broker",
        event_type: "token.issued",
        tenant_id: T_A,
        actor_type: "agent",
        actor_id: "alice",
        target_type: "service",
        target_id: S1,
        payload: { scope: "call", jti, exp_ts: 1793959260, agent_id: "alice" },
      },
    ]);

    const health = await call(fake.brokerUrl, "GET", "/v1/health", null);
    assert.equal(health.status, 200);
    assert.equal(health.text, '{"status":"ok"}');

    const resolve401 = await call(fake.brokerUrl, "POST", "/v1/api-keys/resolve", null, "{}");
    assert.equal(resolve401.status, 401);
    const resolve404 = await call(fake.brokerUrl, "POST", "/v1/api-keys/resolve", fake.brokerServiceToken, "{}");
    assert.equal(resolve404.status, 404);
    assert.equal(resolve404.text, '{"mintkey:code":"not_found","title":"not found"}');
  } finally {
    await fake.close();
  }
});

function validation(title: string): string {
  return JSON.stringify({ "mintkey:code": "validation_failed", title });
}

test("C-10de5fbe issue refuses bad requests and bounds the TTL", async () => {
  const fake = await start();
  try {
    const unauth = '{"mintkey:code":"unauthenticated","title":"unauthenticated"}';
    const send = (body: string, token: string | null = fake.brokerServiceToken): Promise<Answer> =>
      call(fake.brokerUrl, "POST", "/v1/issue", token, body);
    const base = baseBody();
    const rows: { body: string; token?: string | null; status: number; text?: string; ttl?: number }[] = [
      { body: JSON.stringify(base), token: null, status: 401, text: unauth },
      { body: JSON.stringify(base), token: "nope", status: 401, text: unauth },
      { body: JSON.stringify(without(base, "ttl_seconds")), status: 200, ttl: 600 },
      { body: JSON.stringify({ ...base, ttl_seconds: 0 }), status: 200, ttl: 600 },
      { body: JSON.stringify({ ...base, ttl_seconds: null }), status: 200, ttl: 600 },
      { body: JSON.stringify({ ...base, ttl_seconds: 1 }), status: 200, ttl: 1 },
      { body: JSON.stringify({ ...base, ttl_seconds: 3600 }), status: 200, ttl: 3600 },
      { body: JSON.stringify({ ...base, ttl_seconds: 3601 }), status: 400, text: validation(T1) },
      { body: JSON.stringify({ ...base, ttl_seconds: -1 }), status: 400, text: validation(T1) },
      { body: JSON.stringify({ ...base, ttl_seconds: 1.5 }), status: 400, text: validation(T2) },
      { body: JSON.stringify({ ...base, ttl_seconds: "60" }), status: 400, text: validation(T2) },
      { body: JSON.stringify({ ...base, agent_id: "" }), status: 400, text: validation("agent_id is invalid") },
      { body: JSON.stringify({ ...base, agent_id: "a".repeat(128) }), status: 200, ttl: 60 },
      { body: JSON.stringify({ ...base, agent_id: "a".repeat(129) }), status: 400, text: validation("agent_id is invalid") },
      { body: JSON.stringify({ ...base, service_id: "svc_1" }), status: 400, text: validation("service_id is invalid") },
      { body: JSON.stringify({ ...base, service_id: S1.toUpperCase() }), status: 400, text: validation("service_id is invalid") },
      { body: JSON.stringify(without(base, "tenant_id")), status: 400, text: validation("tenant_id is invalid") },
      { body: JSON.stringify({ ...base, scope: "read:atlas" }), status: 400, text: validation("scope is invalid") },
      { body: JSON.stringify(without(base, "scope")), status: 400, text: validation("scope is invalid") },
      { body: JSON.stringify({ ...base, extra: 1 }), status: 200, ttl: 60 },
      { body: "{", status: 400, text: validation(T2) },
      { body: "[]", status: 400, text: validation(T2) },
    ];
    const accepted: number[] = [];
    for (const [i, row] of rows.entries()) {
      const res = await send(row.body, row.token === undefined ? fake.brokerServiceToken : row.token);
      assert.equal(res.status, row.status, `row ${i + 1} status`);
      if (row.text !== undefined) assert.equal(res.text, row.text, `row ${i + 1} body`);
      if (row.ttl !== undefined) {
        const answer = JSON.parse(res.text) as { expires_at: number };
        assert.equal(answer.expires_at, 1793959200 + row.ttl, `row ${i + 1} expires_at`);
        accepted.push(row.ttl);
      }
    }
    assert.deepEqual(accepted, [600, 600, 600, 1, 3600, 60, 60]);

    const get = await call(fake.brokerUrl, "GET", "/v1/issue", fake.brokerServiceToken);
    assert.equal(get.status, 405);
    assert.equal(get.text, '{"mintkey:code":"method_not_allowed","title":"method not allowed"}');
    assert.equal(get.allow, "POST");
    const nope = await call(fake.brokerUrl, "POST", "/v1/nope", fake.brokerServiceToken, "{}");
    assert.equal(nope.status, 404);
    assert.equal(nope.text, '{"mintkey:code":"not_found","title":"not found"}');

    assert.deepEqual(
      fake.issued().map((t) => t.ttlSeconds),
      [600, 600, 600, 1, 3600, 60, 60],
    );
    assert.deepEqual(
      fake.events().map((e) => e.event_type),
      Array<string>(7).fill("token.issued"),
    );
  } finally {
    await fake.close();
  }
});
