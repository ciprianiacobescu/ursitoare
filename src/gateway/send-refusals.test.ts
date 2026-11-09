import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import { createLogger } from "../observability/index.ts";
import { issuedPermit, recordingFetch } from "../../test/support/gateway-kit.ts";
import type { Permit } from "../pdp/index.ts";
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
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const JWT = "jwt-" + "secret-" + "8a1c";

const TAG: CallTag = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };

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

interface Harness {
  gateway: Gateway;
  calls: { url: string; init: RequestInit }[];
  p: Permit;
  token: BrokerToken;
}

async function setup(now = "2026-11-06T10:00:00.000Z"): Promise<Harness> {
  const recorded = recordingFetch([tokenAnswer()]);
  const gateway = createGateway(CFG, {
    clock: fixedClock(now),
    logger: silentLogger(),
    fetch: recorded.fetch,
  });
  const p = await issuedPermit();
  const token = await gateway.requestToken(p, TAG);
  return { gateway, calls: recorded.calls, p, token };
}

function requestWith(change: Partial<OutboundRequest>): OutboundRequest {
  return { ...REQ, ...change };
}

function errorIs(code: GatewayErrorCode, details: Record<string, string> = {}) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

test("C-c4c97ae4 send refuses a foreign permit and every permit mismatch before the network", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, p, token } = await setup();

    await assert.rejects(gateway.send({ ...p }, REQ, token, TAG), errorIs("GATEWAY_PERMIT_FOREIGN"));
    assert.equal(calls.length, 1);

    const rows: [Partial<OutboundRequest>, string][] = [
      [{ method: "PUT" }, "method"],
      [{ origin: "https://tools.fake.test:8443" }, "host"],
      [{ path: "/v1/lookup?id=8" }, "path"],
      [{ body: null }, "bodyDigest"],
      [{ method: "GET", path: "/z" }, "method"],
      [{ origin: "not a url" }, "host"],
    ];

    for (const [change, field] of rows) {
      await assert.rejects(
        gateway.send(p, requestWith(change), token, TAG),
        errorIs("GATEWAY_PERMIT_MISMATCH", { field }),
      );
      assert.equal(calls.length, 1);
    }
  });
});

test("C-c4c97ae4 send refuses an invalid tag before the network", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, p, token } = await setup();

    const tags: CallTag[] = [
      { ...TAG, runId: "r 1" },
      { ...TAG, attempt: 0 },
      { ...TAG, nodeId: "a\nb" },
    ];

    for (const tag of tags) {
      await assert.rejects(gateway.send(p, REQ, token, tag), errorIs("GATEWAY_INVALID", { reason: "tag" }));
      assert.equal(calls.length, 1);
    }
  });
});

test("C-c4c97ae4 send refuses every unsafe path before the network", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, token } = await setup();

    const paths = ["/a/../b", "/a/%2e%2E/b", "/..", "/a#x", "/a\\b", "/a/..?x"];

    for (const path of paths) {
      const permit = await issuedPermit({ path });
      await assert.rejects(
        gateway.send(permit, requestWith({ path }), token, TAG),
        errorIs("GATEWAY_INVALID", { reason: "path" }),
      );
      assert.equal(calls.length, 1);
    }
  });
});

test("C-c4c97ae4 send refuses every unsafe header before the network", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, p, token } = await setup();

    const headers: [string, string][] = [
      ["Authorization", "Bearer x"],
      ["x-ursitoare-call", "r:n:1"],
      ["host", "e"],
      ["cookie", "a=b"],
      ["proxy-authorization", "x"],
      ["content-length", "3"],
      ["X-Caller", "2"],
      ["x-a", "1\r\nx-b: 2"],
    ];

    for (const [name, value] of headers) {
      await assert.rejects(
        gateway.send(p, requestWith({ headers: { ...REQ.headers, [name]: value } }), token, TAG),
        errorIs("GATEWAY_INVALID", { reason: "header" }),
      );
      assert.equal(calls.length, 1);
    }
  });
});

test("C-c4c97ae4 send refuses a token for another service one that is used and one that is expired", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, p, token } = await setup();

    const otherService = await issuedPermit({ serviceId: S2 });
    await assert.rejects(
      gateway.send(otherService, REQ, token, TAG),
      errorIs("GATEWAY_INVALID", { reason: "token_service" }),
    );
    assert.equal(calls.length, 1);

    const literal: BrokerToken = { serviceId: S1, expiresAt: 1793959260 };
    await assert.rejects(gateway.send(p, REQ, literal, TAG), errorIs("GATEWAY_INVALID", { reason: "token_used" }));
    assert.equal(calls.length, 1);

    const late = await setup("2026-11-06T10:01:00.000Z");
    await assert.rejects(
      late.gateway.send(late.p, REQ, late.token, TAG),
      errorIs("GATEWAY_INVALID", { reason: "token_expired" }),
    );
    assert.equal(late.calls.length, 1);
  });
});

test("C-c4c97ae4 send refuses a permit whose service id is not a lower-case UUID", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, token } = await setup();

    for (const serviceId of ["..", S1.toUpperCase()]) {
      const permit = await issuedPermit({ serviceId });
      await assert.rejects(
        gateway.send(permit, REQ, token, TAG),
        errorIs("GATEWAY_INVALID", { reason: "service" }),
      );
      assert.equal(calls.length, 1);
    }
  });
});

test("C-c4c97ae4 send refuses in the order foreign mismatch tag service path", async () => {
  await assert.doesNotReject(async () => {
    const { gateway, calls, p, token } = await setup();

    await assert.rejects(
      gateway.send({ ...p }, requestWith({ method: "PUT" }), token, TAG),
      errorIs("GATEWAY_PERMIT_FOREIGN"),
    );
    assert.equal(calls.length, 1);

    await assert.rejects(
      gateway.send(p, requestWith({ method: "PUT" }), token, { ...TAG, attempt: 0 }),
      errorIs("GATEWAY_PERMIT_MISMATCH", { field: "method" }),
    );
    assert.equal(calls.length, 1);

    const dotted = await issuedPermit({ path: "/.." });
    await assert.rejects(
      gateway.send(dotted, requestWith({ path: "/.." }), token, { ...TAG, runId: "r 1" }),
      errorIs("GATEWAY_INVALID", { reason: "tag" }),
    );
    assert.equal(calls.length, 1);

    await assert.rejects(
      gateway.send(
        dotted,
        requestWith({ path: "/..", headers: { ...REQ.headers, cookie: "a=b" } }),
        token,
        TAG,
      ),
      errorIs("GATEWAY_INVALID", { reason: "path" }),
    );
    assert.equal(calls.length, 1);

    const unsafe = await issuedPermit({ serviceId: "..", path: "/.." });
    await assert.rejects(
      gateway.send(unsafe, requestWith({ path: "/.." }), token, TAG),
      errorIs("GATEWAY_INVALID", { reason: "service" }),
    );
    assert.equal(calls.length, 1);
  });
});
