import assert from "node:assert/strict";
import { test } from "node:test";

import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { issuedPermit, recordingFetch } from "../../test/support/gateway-kit.ts";
import { startEchoUpstream, startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { EchoUpstream, FakeEgress, ForwardedRequest } from "../../test/support/fake-egress/index.ts";
import { createGateway } from "./client.ts";
import { GatewayError } from "./types.ts";
import type {
  BrokerToken,
  CallTag,
  Gateway,
  GatewayErrorCode,
  OutboundRequest,
} from "./types.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const TB = "93baa9da-a394-803d-800c-bf45c3375469";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const JWT = "jwt-" + "secret-" + "8a1c";
const D_BODY = "0e9900c914ed43a1be38e237e918e29501562e302390f970957dd30a83a41966";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";

const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };
const TAG_2: CallTag = { ...TAG, attempt: 2 };

const BODY = new TextEncoder().encode('{"vendor_name":"ACME"}');

const REQ: OutboundRequest = {
  method: "POST",
  origin: "https://tools.fake.test",
  path: "/v1/lookup?id=7",
  headers: { "x-caller": "2" },
  body: BODY,
};

const CFG: EgressConfig = {
  brokerUrl: "http://broker.internal:8081",
  proxyUrl: "http://kong.internal:8000/v1/call",
  brokerToken: new Secret(BROKER_TOKEN),
  agentId: "ursitoare-engine",
  vault: null,
};

function tokenAnswer(expiresAt = 1793959260, jwt = JWT): Response {
  return new Response(JSON.stringify({ token: jwt, expires_at: expiresAt }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

function silentLogger() {
  return createLogger({
    level: "silent",
    destination: { write(_line: string): void {} },
  });
}

function mutableClock(start: string): { clock: Clock; set(iso: string): void } {
  let now = new Date(start);
  return {
    clock: { now: (): Date => new Date(now.getTime()) },
    set(iso: string): void {
      now = new Date(iso);
    },
  };
}

function errorIs(code: GatewayErrorCode, details: Record<string, string> = {}) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

function requestWith(change: Partial<OutboundRequest>): OutboundRequest {
  return { ...REQ, ...change };
}

async function setup(
  answers: (Response | Error)[],
  clock: Clock,
): Promise<{ gateway: Gateway; calls: { url: string; init: RequestInit }[]; p: Awaited<ReturnType<typeof issuedPermit>>; token: BrokerToken }> {
  const recorded = recordingFetch(answers);
  const gateway = createGateway(CFG, { clock, logger: silentLogger(), fetch: recorded.fetch });
  const p = await issuedPermit();
  const token = await gateway.requestToken(p, TAG);
  return { gateway, calls: recorded.calls, p, token };
}

async function startFake(): Promise<{ fake: FakeEgress; echo: EchoUpstream }> {
  let fake: FakeEgress | undefined;
  let echo: EchoUpstream | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => new Date("2026-11-06T10:00:00.000Z") });
    echo = await startEchoUpstream();
  });
  assert.ok(fake !== undefined, "fake started");
  assert.ok(echo !== undefined, "echo started");
  fake.addUpstream("tools.fake.test", echo.origin);
  fake.addCredentialless(S1, TA, "http://tools.fake.test");
  return { fake, echo };
}

function fakeConfig(fake: FakeEgress): EgressConfig {
  return {
    brokerUrl: fake.brokerUrl,
    proxyUrl: fake.proxyUrl,
    brokerToken: new Secret(fake.brokerServiceToken),
    agentId: "ursitoare-engine",
    vault: null,
  };
}

function fakeGateway(fake: FakeEgress): Gateway {
  return createGateway(fakeConfig(fake), {
    clock: { now: (): Date => new Date("2026-11-06T10:00:00.000Z") },
    logger: silentLogger(),
  });
}

interface EchoSeen {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  bodySha256: string;
}

test("C-720131d6 send forwards the permitted request through the proxy and spends the token", async () => {
  await assert.doesNotReject(async () => {
    const clock = mutableClock("2026-11-06T10:00:00.000Z");
    const { gateway, calls, p, token } = await setup(
      [tokenAnswer(), new Response("ok", { status: 200, headers: { "x-up": "1" } })],
      clock.clock,
    );

    await assert.rejects(
      gateway.send(p, requestWith({ method: "PUT" }), token, TAG),
      errorIs("GATEWAY_PERMIT_MISMATCH", { field: "method" }),
    );
    await assert.rejects(
      gateway.send(p, requestWith({ headers: { ...REQ.headers, cookie: "a=b" } }), token, TAG),
      errorIs("GATEWAY_INVALID", { reason: "header" }),
    );
    assert.equal(calls.length, 1, "the refused calls left the token unspent and sent nothing");

    const answer = await gateway.send(p, REQ, token, TAG);
    assert.equal(answer.status, 200);
    assert.equal(answer.headers["x-up"], "1");
    assert.equal(new TextDecoder().decode(answer.body), "ok");

    assert.equal(calls.length, 2);
    const call = calls[1];
    assert.ok(call !== undefined);
    assert.equal(
      call.url,
      "http://kong.internal:8000/v1/call/0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01/v1/lookup?id=7",
    );
    assert.deepEqual(Object.keys(call.init).sort(), ["body", "headers", "method", "redirect", "signal"]);
    assert.equal(call.init.method, "POST");
    assert.deepEqual(call.init.headers, {
      "x-caller": "2",
      authorization: `Bearer ${JWT}`,
      "x-ursitoare-call": "r_1:lookup:1",
    });
    assert.equal(call.init.body, BODY);
    assert.equal(call.init.redirect, "manual");
    assert.ok(call.init.signal instanceof AbortSignal);
    assert.deepEqual(REQ.headers, { "x-caller": "2" }, "the caller's headers are not mutated");

    await assert.rejects(gateway.send(p, REQ, token, TAG), errorIs("GATEWAY_INVALID", { reason: "token_used" }));
    assert.equal(calls.length, 2, "a spent token sends nothing");
  });
});

test("C-720131d6 send honours the token's expiry second and forwards a query path with a null body", async () => {
  await assert.doesNotReject(async () => {
    const clock = mutableClock("2026-11-06T10:00:00.000Z");
    const { gateway, calls, p, token } = await setup(
      [tokenAnswer(), new Response("ok", { status: 200 }), tokenAnswer(), new Response("ok", { status: 200 })],
      clock.clock,
    );

    clock.set("2026-11-06T10:00:59.000Z");
    const atTheExpiry = await gateway.send(p, REQ, token, TAG);
    assert.equal(atTheExpiry.status, 200);

    const path = "/a?x=../y";
    const getPermit = await issuedPermit({ method: "GET", path, bodyDigest: D_EMPTY });
    const getToken = await gateway.requestToken(getPermit, TAG);
    const answer = await gateway.send(
      getPermit,
      { method: "GET", origin: "https://tools.fake.test", path, headers: {}, body: null },
      getToken,
      TAG,
    );
    assert.equal(answer.status, 200);
    const call = calls[calls.length - 1];
    assert.ok(call !== undefined);
    assert.ok(call.url.endsWith(`/${S1}${path}`), "the query path reaches the proxy unchanged");
    assert.equal(call.init.body, null);
  });
});

test("C-720131d6 send forwards through the fake egress and the echo sees the permitted request", async () => {
  const { fake, echo } = await startFake();
  try {
    await assert.doesNotReject(async () => {
      const gateway = fakeGateway(fake);
      const p = await issuedPermit();
      const token = await gateway.requestToken(p, TAG);
      assert.deepEqual(token, { serviceId: S1, expiresAt: 1793959260 });

      const issued = fake.issued();
      assert.equal(issued.length, 1);
      const entry = issued[0];
      assert.ok(entry !== undefined);
      assert.match(entry.jti, /^jti_/);
      assert.equal(entry.serviceId, S1);
      assert.equal(entry.tenantId, TA);
      assert.equal(entry.agentId, "ursitoare-engine");
      assert.equal(entry.ttlSeconds, 60);
      assert.equal(entry.issuedAt, 1793959200);
      assert.equal(entry.expiresAt, 1793959260);

      const request = requestWith({ headers: { "content-type": "application/json", "x-caller": "2" } });
      const answer = await gateway.send(p, request, token, TAG);
      assert.equal(answer.status, 200);
      const seen = JSON.parse(new TextDecoder().decode(answer.body)) as EchoSeen;
      assert.equal(seen.method, "POST");
      assert.equal(seen.path, "/v1/lookup");
      assert.equal(seen.query, "id=7");
      assert.equal(seen.bodySha256, D_BODY);
      assert.equal(seen.headers["x-caller"], "2");
      assert.equal(seen.headers["x-ursitoare-call"], "r_1:lookup:1");
      assert.equal(seen.headers["host"], "tools.fake.test");
      assert.equal(seen.headers["authorization"], undefined);

      const records = fake.requests();
      assert.equal(records.length, 1);
      const record = records[0];
      assert.ok(record !== undefined);
      assert.equal(record.serviceId, S1);
      assert.equal(record.path, "/v1/lookup");
      assert.equal(record.query, "id=7");
      assert.equal(record.status, 200);
      assert.equal(record.outcome, "allowed");

      await assert.rejects(gateway.send(p, request, token, TAG), errorIs("GATEWAY_INVALID", { reason: "token_used" }));
      assert.equal(fake.requests().length, 1, "a spent token sends nothing");
    });
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-720131d6 send returns a redirect from the proxy unchanged and never follows it", async () => {
  const { fake, echo } = await startFake();
  try {
    await assert.doesNotReject(async () => {
      const gateway = fakeGateway(fake);
      const p = await issuedPermit({ method: "GET", path: "/redirect", bodyDigest: D_EMPTY });
      const token = await gateway.requestToken(p, TAG_2);
      const answer = await gateway.send(
        p,
        { method: "GET", origin: "https://tools.fake.test", path: "/redirect", headers: {}, body: null },
        token,
        TAG_2,
      );

      assert.equal(answer.status, 302);
      assert.equal(answer.headers["location"], "/landing?from=echo");
      assert.equal(answer.body.length, 0);

      const paths = fake.requests().map((record: ForwardedRequest) => record.path);
      assert.deepEqual(paths, ["/redirect"]);
    });
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-720131d6 send returns the proxy's 502 for a tenant with no stored credential", async () => {
  const { fake, echo } = await startFake();
  try {
    await assert.doesNotReject(async () => {
      const gateway = fakeGateway(fake);
      const p = await issuedPermit();
      const tagB: CallTag = { ...TAG, tenantId: "tenant_b" };
      const token = await gateway.requestToken(p, tagB);
      const request = requestWith({ headers: { "content-type": "application/json", "x-caller": "2" } });
      const answer = await gateway.send(p, request, token, tagB);

      assert.equal(answer.status, 502);
      assert.equal(new TextDecoder().decode(answer.body), "bad gateway: vault error\n");

      const issued = fake.issued();
      const lastIssued = issued[issued.length - 1];
      assert.ok(lastIssued !== undefined);
      assert.equal(lastIssued.tenantId, TB);

      const records = fake.requests();
      const lastRecord = records[records.length - 1];
      assert.ok(lastRecord !== undefined);
      assert.equal(lastRecord.outcome, "rejected");
      assert.equal(lastRecord.status, 502);
    });
  } finally {
    await fake.close();
    await echo.close();
  }
});
