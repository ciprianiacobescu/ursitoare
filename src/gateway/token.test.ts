import assert from "node:assert/strict";
import { inspect } from "node:util";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import { createLogger } from "../observability/index.ts";
import { issuedPermit, recordingFetch } from "../../test/support/gateway-kit.ts";
import { createGateway } from "./client.ts";
import { GatewayError } from "./types.ts";
import type { CallTag, Gateway, GatewayErrorCode } from "./types.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const JWT = "jwt-" + "secret-" + "8a1c";

const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };

const CFG: EgressConfig = {
  brokerUrl: "http://broker.internal:8081",
  proxyUrl: "http://kong.internal:8000/v1/call",
  brokerToken: new Secret(BROKER_TOKEN),
  agentId: "ursitoare-engine",
  vault: null,
};

function bodyText(ttlSeconds: number): string {
  return `{"agent_id":"ursitoare-engine","service_id":"${S1}","tenant_id":"${TA}","scope":"call","ttl_seconds":${ttlSeconds}}`;
}

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

function makeGateway(answers: (Response | Error)[] = []): {
  gateway: Gateway;
  calls: { url: string; init: RequestInit }[];
} {
  const recorded = recordingFetch(answers);
  const gateway = createGateway(CFG, {
    clock: fixedClock("2026-11-06T10:00:00.000Z"),
    logger: silentLogger(),
    fetch: recorded.fetch,
  });
  return { gateway, calls: recorded.calls };
}

function errorIs(code: GatewayErrorCode, details: Record<string, string> = {}) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

function tokenFailureWithout(secret: string) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, "GATEWAY_UNAVAILABLE");
    assert.deepEqual(error.details, { stage: "token" });
    assert.equal(error.message.includes(secret), false, "message holds no secret");
    assert.equal(JSON.stringify(error.details).includes(secret), false, "details hold no secret");
    assert.equal(inspect(error).includes(secret), false, "inspect holds no secret");
    assert.equal(inspect(error.cause).includes(secret), false, "cause holds no secret");
    return true;
  };
}

test("C-a6742749 requestToken posts one issue request and keeps the JWT private", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls } = makeGateway([tokenAnswer()]);
    const p = await issuedPermit();
    const token = await gateway.requestToken(p, TAG);

    assert.equal(calls.length, 1);
    const call = calls[0];
    assert.ok(call !== undefined);
    assert.equal(call.url, "http://broker.internal:8081/v1/issue");
    assert.deepEqual(Object.keys(call.init).sort(), ["body", "headers", "method", "redirect", "signal"]);
    assert.equal(call.init.method, "POST");
    assert.deepEqual(call.init.headers, {
      "content-type": "application/json",
      "x-mintkey-service-token": BROKER_TOKEN,
    });
    assert.equal(call.init.body, bodyText(60));
    assert.equal(call.init.redirect, "manual");
    assert.ok(call.init.signal instanceof AbortSignal);
    assert.equal(call.init.signal.aborted, false);

    assert.deepEqual(token, { serviceId: S1, expiresAt: 1793959260 });
    assert.ok(Object.isFrozen(token));
    assert.deepEqual(Object.keys(token), ["serviceId", "expiresAt"]);
    assert.equal(JSON.stringify(token).includes(JWT), false);
    assert.equal(inspect(token).includes(JWT), false);
  });

  await assert.doesNotReject(async () => {
    const { gateway, calls } = makeGateway([tokenAnswer(1793959201)]);
    const token = await gateway.requestToken(await issuedPermit({ ttlSeconds: 1 }), TAG);

    assert.deepEqual(token, { serviceId: S1, expiresAt: 1793959201 });
    const call = calls[0];
    assert.ok(call !== undefined);
    assert.equal(call.init.body, bodyText(1));
  });
});

test("C-a6742749 requestToken maps a refused broker answer to TOKEN_REFUSED and any other status to UNAVAILABLE", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();

    for (const [status, expectedDetails] of [
      [401, { status: "401" }],
      [403, { status: "403" }],
    ] as const) {
      const { gateway, calls } = makeGateway([new Response("", { status })]);
      await assert.rejects(gateway.requestToken(p, TAG), errorIs("GATEWAY_TOKEN_REFUSED", expectedDetails));
      assert.equal(calls.length, 1);
    }

    const answers = [
      () => new Response("", { status: 400 }),
      () => new Response("", { status: 500 }),
      () => new Response("", { status: 302, headers: { location: "/x" } }),
    ];
    for (const answer of answers) {
      const { gateway, calls } = makeGateway([answer()]);
      await assert.rejects(gateway.requestToken(p, TAG), errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }));
      assert.equal(calls.length, 1);
    }
  });
});

test("C-a6742749 requestToken refuses every malformed token answer as UNAVAILABLE token", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();
    const answers = [
      () => new Response("nope", { status: 200 }),
      () => new Response(JSON.stringify({ expires_at: 1793959260 }), { status: 200 }),
      () => new Response(JSON.stringify({ token: "", expires_at: 1793959260 }), { status: 200 }),
      () => new Response(JSON.stringify({ token: "j", expires_at: 1.5 }), { status: 200 }),
      () => new Response(JSON.stringify([]), { status: 200 }),
      () => new Response(JSON.stringify({ token: "a\r\nb", expires_at: 1793959260 }), { status: 200 }),
      () => new Response(JSON.stringify({ token: "j", expires_at: 1793959291 }), { status: 200 }),
      () => new Response(JSON.stringify({ token: "a".repeat(8193), expires_at: 1793959260 }), { status: 200 }),
    ];

    for (const answer of answers) {
      const { gateway, calls } = makeGateway([answer()]);
      await assert.rejects(gateway.requestToken(p, TAG), errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }));
      assert.equal(calls.length, 1);
    }
  });
});

test("C-a6742749 requestToken hides the broker service token of a throwing fetch", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();

    const plain = makeGateway([new TypeError("fetch failed")]);
    await assert.rejects(plain.gateway.requestToken(p, TAG), errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }));
    assert.equal(plain.calls.length, 1);

    const leaky = makeGateway([new TypeError(`fetch failed ${BROKER_TOKEN}`)]);
    await assert.rejects(leaky.gateway.requestToken(p, TAG), tokenFailureWithout(BROKER_TOKEN));
    assert.equal(leaky.calls.length, 1);
  });
});

test("C-a6742749 requestToken refuses a foreign permit an invalid tag and an invalid service without a call", async () => {
  await assert.doesNotReject(async () => {
    const p = await issuedPermit();

    const foreign = makeGateway([]);
    await assert.rejects(foreign.gateway.requestToken({ ...p }, TAG), errorIs("GATEWAY_PERMIT_FOREIGN"));
    assert.equal(foreign.calls.length, 0);

    const tags: CallTag[] = [
      { ...TAG, runId: "r 1" },
      { ...TAG, attempt: 0 },
      { ...TAG, tenantId: "" },
    ];
    for (const tag of tags) {
      const { gateway, calls } = makeGateway([]);
      await assert.rejects(gateway.requestToken(p, tag), errorIs("GATEWAY_INVALID", { reason: "tag" }));
      assert.equal(calls.length, 0);
    }

    const services = ["..", S1.toUpperCase()];
    for (const serviceId of services) {
      const { gateway, calls } = makeGateway([]);
      await assert.rejects(
        gateway.requestToken(await issuedPermit({ serviceId }), TAG),
        errorIs("GATEWAY_INVALID", { reason: "service" }),
      );
      assert.equal(calls.length, 0);
    }
  });
});

test("C-a6742749 requestToken accepts the token and expiry bounds", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls } = makeGateway([tokenAnswer(1793959290, "a".repeat(8192))]);
    const token = await gateway.requestToken(await issuedPermit(), TAG);

    assert.deepEqual(token, { serviceId: S1, expiresAt: 1793959290 });
    assert.ok(Object.isFrozen(token));
    assert.equal(calls.length, 1);
  });
});
