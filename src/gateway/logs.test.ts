import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";

import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import { fixedClock } from "../core/index.ts";
import { captureLogger, issuedPermit, recordingFetch } from "../../test/support/gateway-kit.ts";
import { createGateway } from "./client.ts";
import { GatewayError } from "./types.ts";
import type { CallTag, GatewayErrorCode, OutboundRequest } from "./types.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const JWT = "jwt-" + "secret-" + "8a1c";

const T0 = new Date("2026-11-06T10:00:00.000Z");
const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };

const BODY = new TextEncoder().encode('{"vendor_name":"ACME"}');

const REQ: OutboundRequest = {
  method: "POST",
  origin: "https://tools.fake.test",
  path: "/v1/lookup?id=7",
  headers: { "x-caller": "hdr-value-3b7d" },
  body: BODY,
};

const CFG: EgressConfig = {
  brokerUrl: "http://broker.internal:8081",
  proxyUrl: "http://kong.internal:8000/v1/call",
  brokerToken: new Secret(BROKER_TOKEN),
  agentId: "ursitoare-engine",
  vault: null,
};

function tokenAnswer(status = 200): Response {
  return new Response(JSON.stringify({ token: JWT, expires_at: 1793959260 }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

const EXPECTED: Record<string, unknown>[] = [
  {
    level: 30,
    stage: "token",
    serviceId: S1,
    status: 200,
    ms: 0,
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway token request",
  },
  {
    level: 30,
    stage: "send",
    method: "POST",
    host: "tools.fake.test",
    path: "/v1/lookup",
    status: 200,
    ms: 0,
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway send",
  },
  {
    level: 30,
    stage: "token",
    serviceId: S1,
    status: 401,
    ms: 0,
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway token request",
  },
  {
    level: 40,
    stage: "token",
    code: "GATEWAY_TOKEN_REFUSED",
    details: { status: "401" },
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway call failed",
  },
  {
    level: 30,
    stage: "token",
    serviceId: S1,
    status: 200,
    ms: 0,
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway token request",
  },
  {
    level: 40,
    stage: "send",
    code: "GATEWAY_UNAVAILABLE",
    details: { stage: "send" },
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway call failed",
  },
  {
    level: 40,
    stage: "send",
    code: "GATEWAY_PERMIT_MISMATCH",
    details: { field: "method" },
    runId: "r_1",
    nodeId: "lookup",
    msg: "gateway call failed",
  },
];

const FORBIDDEN = [
  BROKER_TOKEN,
  JWT,
  "vendor_name",
  "resp-body-5f6e",
  "hdr-value-3b7d",
  "Bearer",
  "id=7",
];

function assertNoSecret(text: string, where: string): void {
  for (const needle of FORBIDDEN) {
    assert.ok(!text.includes(needle), `${where} holds no ${needle}`);
  }
}

test("C-51b30b5c gateway logs answered calls and failures without a secret or payload", async () => {
  await assert.doesNotReject(async () => {
    const captured = captureLogger();
    const recorded = recordingFetch([
      tokenAnswer(),
      new Response("resp-body-5f6e", { status: 200 }),
      new Response("refused", { status: 401 }),
      tokenAnswer(),
      new TypeError(`fetch failed ${JWT}`),
    ]);
    const gateway = createGateway(CFG, {
      clock: fixedClock(T0.toISOString()),
      logger: captured.logger,
      fetch: recorded.fetch,
    });
    const p = await issuedPermit();
    const errors: GatewayError[] = [];

    async function refuses(
      promise: Promise<unknown>,
      code: GatewayErrorCode,
      details: Record<string, string>,
    ): Promise<void> {
      await assert.rejects(promise, (error: unknown) => {
        assert.ok(error instanceof GatewayError, "a GatewayError");
        assert.equal(error.code, code);
        assert.deepEqual(error.details, details);
        errors.push(error);
        return true;
      });
    }

    const token = await gateway.requestToken(p, TAG);
    const answer = await gateway.send(p, REQ, token, TAG);
    assert.equal(answer.status, 200);
    assert.equal(new TextDecoder().decode(answer.body), "resp-body-5f6e");

    await refuses(gateway.requestToken(p, TAG), "GATEWAY_TOKEN_REFUSED", { status: "401" });

    const secondToken = await gateway.requestToken(p, TAG);
    await refuses(gateway.send(p, REQ, secondToken, TAG), "GATEWAY_UNAVAILABLE", { stage: "send" });

    await refuses(
      gateway.send(p, { ...REQ, method: "PUT" }, secondToken, TAG),
      "GATEWAY_PERMIT_MISMATCH",
      { field: "method" },
    );

    assert.equal(recorded.calls.length, 5, "the refused PUT sent nothing");

    const lines = captured.lines();
    const withoutBase = lines.map((line) => {
      const { time: _time, service: _service, ...rest } = line;
      return rest;
    });
    assert.deepEqual(withoutBase, EXPECTED);

    const joined = lines.map((line) => JSON.stringify(line)).join("\n");
    assertNoSecret(joined, "the joined lines");

    assert.equal(errors.length, 3);
    for (const error of errors) {
      assertNoSecret(error.message, "the error message");
      assertNoSecret(JSON.stringify(error.details), "the error details");
      assertNoSecret(inspect(error, { depth: 10 }), "the inspected error");
      assert.equal(error.cause, undefined, "the error carries no cause");
    }
  });
});
