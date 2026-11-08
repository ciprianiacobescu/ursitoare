import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";
import { putCredential } from "./vault-client.ts";

const T0 = new Date("2026-11-06T10:00:00.000Z");
const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const T_B = "4b8a2c1e-0000-8000-8000-000000000002";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S1 = sid(1);
const S2 = sid(2);
const S3 = sid(3);
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const D_ABC = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const NOT_ADDRESSED = '{"error":"service not addressed"}';
const MISMATCH = '{"error":"scope mismatch"}';
const MISSING = "unauthorized: missing Bearer token\n";
const BAD_SIG = "unauthorized: signature_invalid\n";
const VAULT_ERROR = "bad gateway: vault error\n";

interface Reply {
  status: number;
  body: string;
}

interface Rig {
  fake: FakeEgress;
  clock: { now: Date };
  hits: string[];
  close(): Promise<void>;
}

async function rig(): Promise<Rig> {
  const clock = { now: T0 };
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => clock.now });
  });
  assert.ok(fake !== undefined, "fake started");
  const started = fake;
  const hits: string[] = [];
  const upstream = http.createServer((req, res) => {
    hits.push(req.url ?? "");
    req.resume();
    res.end("ok");
  });
  await new Promise<void>((resolve) => upstream.listen(0, "127.0.0.1", resolve));
  started.addUpstream("tools.fake.test", `http://127.0.0.1:${(upstream.address() as AddressInfo).port}`);
  let status = -1;
  await assert.doesNotReject(async () => {
    status = (
      await putCredential(started.vaultUrl, started.vaultAdmin, {
        tenantId: T_A,
        serviceId: S1,
        authScheme: 1,
        value: Buffer.from("kv-secret-7f3a"),
        headerName: "x-fake-tools-key",
        callerActorId: "carol",
        targetUrl: "http://tools.fake.test",
      })
    ).grpcStatus;
  });
  assert.equal(status, 0);
  return {
    fake: started,
    clock,
    hits,
    close: async (): Promise<void> => {
      await started.close();
      upstream.closeAllConnections();
      await new Promise<void>((resolve) => upstream.close(() => resolve()));
    },
  };
}

async function issue(fake: FakeEgress, serviceId: string, tenantId: string = T_A): Promise<string> {
  const res = await fetch(`${fake.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: { "x-mintkey-service-token": fake.brokerServiceToken, "content-type": "application/json" },
    body: JSON.stringify({ agent_id: "alice", service_id: serviceId, tenant_id: tenantId, scope: "call", ttl_seconds: 60 }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

function call(
  fake: FakeEgress,
  method: string,
  path: string,
  headers: http.OutgoingHttpHeaders = {},
  body?: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(fake.proxyUrl);
    const req = http.request({ host: url.hostname, port: url.port, method, path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => {
        resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") });
      });
    });
    req.on("error", reject);
    req.end(body);
  });
}

const get = (fake: FakeEgress, path: string, authorization?: string): Promise<Reply> =>
  call(fake, "GET", path, authorization === undefined ? {} : { authorization });

const b64 = (value: unknown): string => Buffer.from(JSON.stringify(value)).toString("base64url");
const parts = (token: string): [string, string, string] => {
  const [h = "", p = "", s = ""] = token.split(".");
  return [h, p, s];
};
const claims = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(parts(token)[1], "base64url").toString("utf8")) as Record<string, unknown>;
const header = (token: string): Record<string, unknown> =>
  JSON.parse(Buffer.from(parts(token)[0], "base64url").toString("utf8")) as Record<string, unknown>;

function badSignature(token: string): string {
  const [h, p, s] = parts(token);
  const at = s.length - 2;
  return `${h}.${p}.${s.slice(0, at)}${s[at] === "A" ? "B" : "A"}${s.slice(at + 1)}`;
}

test("C-b724a651 the proxy answers the 401 rows P1 to P9 and P16 and records nothing", async () => {
  const r = await rig();
  try {
    const tok = await issue(r.fake, S1);
    const [h, p, s] = parts(tok);
    const events = r.fake.events();
    const other = generateKeyPairSync("ed25519");
    const forged = sign(null, Buffer.from(`${h}.${p}`), other.privateKey).toString("base64url");
    const missing: (string | undefined)[] = [undefined, "Basic abc", "Bearer ", `bearer ${tok}`];
    for (const auth of missing) {
      assert.deepEqual(await get(r.fake, `/${S1}/x`, auth), { status: 401, body: MISSING }, `auth ${String(auth)}`);
    }
    const bad = [
      badSignature(tok),
      `${h}.${b64({ ...claims(tok), sub: "mallory" })}.${s}`,
      `${b64({ ...header(tok), kid: "kid_X" })}.${p}.${s}`,
      `${b64({ ...header(tok), alg: "none" })}.${p}.`,
      `${h}.${p}.${forged}`,
      `${h}.${p}`,
    ];
    for (const token of bad) {
      assert.deepEqual(await get(r.fake, `/${S1}/x`, `Bearer ${token}`), { status: 401, body: BAD_SIG });
    }
    assert.deepEqual(r.fake.requests(), []);
    assert.deepEqual(r.fake.events(), events);
    assert.deepEqual(r.hits, []);
  } finally {
    await r.close();
  }
});

test("C-b724a651 the proxy refuses addressing, audience and credential rows P10 to P15", async () => {
  const r = await rig();
  try {
    const tok = await issue(r.fake, S1);
    const tokB = await issue(r.fake, S1, T_B);
    const tok3 = await issue(r.fake, S3);
    const jti = r.fake.issued()[0]?.jti;
    const bearer = (t: string): string => `Bearer ${t}`;
    const before = r.fake.events();

    assert.deepEqual(await get(r.fake, `/v1/${S1}/x`, bearer(tok)), { status: 403, body: NOT_ADDRESSED });
    assert.deepEqual(await get(r.fake, "/", bearer(tok)), { status: 403, body: NOT_ADDRESSED });
    assert.deepEqual(await get(r.fake, `/${S1.toUpperCase()}/x`, bearer(tok)), { status: 403, body: NOT_ADDRESSED });
    assert.deepEqual(await call(r.fake, "POST", `/${S2}/x`, { authorization: bearer(tok) }, "abc"), {
      status: 403,
      body: MISMATCH,
    });
    assert.deepEqual(await get(r.fake, `/${S1}/x`, bearer(tokB)), { status: 502, body: VAULT_ERROR });
    assert.deepEqual(await get(r.fake, `/${S3}/x`, bearer(tok3)), { status: 502, body: VAULT_ERROR });

    const rejected = (serviceId: string, method: string, path: string, status: number, digest: string): object => ({
      serviceId,
      method,
      host: "",
      path,
      query: "",
      headers: {},
      bodySha256: digest,
      status,
      outcome: "rejected",
    });
    assert.deepEqual(r.fake.requests(), [
      rejected("v1", "GET", `/${S1}/x`, 403, D_EMPTY),
      rejected("", "GET", "/", 403, D_EMPTY),
      rejected(S1.toUpperCase(), "GET", "/x", 403, D_EMPTY),
      rejected(S2, "POST", "/x", 403, D_ABC),
      rejected(S1, "GET", "/x", 502, D_EMPTY),
      rejected(S3, "GET", "/x", 502, D_EMPTY),
    ]);

    const event = (urlServiceId: string): object => ({
      emitter: "proxy",
      event_type: "proxy.aud_mismatch_rejected",
      tenant_id: T_A,
      actor_type: "agent",
      actor_id: "alice",
      target_type: "service",
      target_id: S1,
      payload: { jti, aud: S1, url_service_id: urlServiceId, mode: "strict" },
    });
    assert.deepEqual(r.fake.events().slice(before.length), [event(""), event(""), event(""), event(S2)]);
    assert.deepEqual(r.hits, []);
  } finally {
    await r.close();
  }
});

test("C-b724a651 the proxy checks expiry with a 30 second leeway on the injected clock", async () => {
  const r = await rig();
  try {
    const tok = await issue(r.fake, S1);
    const exp = Number(claims(tok)["exp"]);
    assert.equal(exp, 1793959260);
    const at = (seconds: number): void => {
      r.clock.now = new Date((exp + seconds) * 1000);
    };
    at(29);
    assert.equal((await get(r.fake, `/${S1}/x`, `Bearer ${tok}`)).status, 200);
    at(30);
    assert.equal((await get(r.fake, `/${S1}/x`, `Bearer ${tok}`)).status, 200);
    const events = r.fake.events();
    at(31);
    assert.deepEqual(await get(r.fake, `/${S1}/x`, `Bearer ${tok}`), {
      status: 401,
      body: "unauthorized: token_expired\n",
    });
    assert.deepEqual(await get(r.fake, `/${S1}/x`, `Bearer ${badSignature(tok)}`), { status: 401, body: BAD_SIG });
    assert.equal(r.hits.length, 2);
    assert.deepEqual(r.fake.events(), events);
    assert.equal(r.fake.requests().length, 2);
  } finally {
    await r.close();
  }
});
