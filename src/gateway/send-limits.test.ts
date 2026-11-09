import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { mock, test } from "node:test";

import { Secret } from "../config/index.ts";
import type { EgressConfig } from "../config/index.ts";
import { fixedClock } from "../core/index.ts";
import { createLogger } from "../observability/index.ts";
import { issuedPermit, recordingFetch } from "../../test/support/gateway-kit.ts";
import { startFakeEgress } from "../../test/support/fake-egress/index.ts";
import type { FakeEgress } from "../../test/support/fake-egress/index.ts";
import { createGateway } from "./client.ts";
import { GatewayError } from "./types.ts";
import type { Gateway, GatewayErrorCode, GatewayResponse, OutboundRequest } from "./types.ts";

const S1 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01";
const S2 = "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e02";
const TA = "d7f4eeba-9f57-8892-b4bb-591d220496d4";
const BROKER_TOKEN = "bt-" + "secret-" + "4d2a";
const JWT = "jwt-" + "secret-" + "8a1c";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const MAX_RESPONSE_BYTES = 1048576;
const TIMEOUT_MS = 30000;
const T0 = new Date("2026-11-06T10:00:00.000Z");

const TAG = { tenantId: "tenant_a", runId: "r_1", nodeId: "lookup", attempt: 1 };

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

function clock(): ReturnType<typeof fixedClock> {
  return fixedClock("2026-11-06T10:00:00.000Z");
}

function flush(): Promise<void> {
  return new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

function errorIs(code: GatewayErrorCode, details: Record<string, string> = {}) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof GatewayError, "a GatewayError");
    assert.equal(error.code, code);
    assert.deepEqual(error.details, details);
    return true;
  };
}

function tokenJsonOfSize(size: number): string {
  const encode = (pad: string): string =>
    JSON.stringify({ token: JWT, expires_at: 1793959260, pad });
  const overhead = encode("").length;
  assert.ok(size >= overhead, "the requested token answer holds the JSON members");
  const body = encode("x".repeat(size - overhead));
  assert.equal(Buffer.byteLength(body, "utf8"), size);
  return body;
}

interface BigUpstream {
  readonly origin: string;
  close(): Promise<void>;
}

async function startBigUpstream(): Promise<BigUpstream> {
  const sockets = new Set<net.Socket>();
  const server = http.createServer((req, res) => {
    const raw = req.url ?? "/";
    const q = raw.indexOf("?");
    const path = q === -1 ? raw : raw.slice(0, q);
    const query = q === -1 ? "" : raw.slice(q + 1);
    const match = /^\/n\/(\d+)$/.exec(path);
    if (match === null) {
      res.writeHead(404);
      res.end();
      return;
    }
    const count = Number(match[1]);
    const chunked = query === "chunked";
    res.writeHead(200, chunked ? {} : { "content-length": String(count) });
    if (count === 0) {
      res.end();
      return;
    }
    const block = Buffer.alloc(Math.min(count, 65536), 0x61);
    let remaining = count;
    const writeMore = (): void => {
      while (remaining > 0) {
        const size = Math.min(remaining, block.length);
        remaining -= size;
        if (!res.write(block.subarray(0, size))) {
          res.once("drain", writeMore);
          return;
        }
      }
      res.end();
    };
    writeMore();
  });
  server.on("connection", (s: net.Socket) => {
    sockets.add(s);
    s.on("close", () => sockets.delete(s));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  return {
    origin: `http://127.0.0.1:${address.port}`,
    close(): Promise<void> {
      server.closeAllConnections();
      return new Promise<void>((resolve) => {
        server.close(() => resolve());
      });
    },
  };
}

async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as AddressInfo;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return address.port;
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
  return createGateway(fakeConfig(fake), { clock: clock(), logger: silentLogger() });
}

async function fetchBig(gateway: Gateway, path: string): Promise<GatewayResponse> {
  const permit = await issuedPermit({
    serviceId: S2,
    host: "big.fake.test",
    method: "GET",
    path,
    bodyDigest: D_EMPTY,
  });
  const token = await gateway.requestToken(permit, TAG);
  return gateway.send(
    permit,
    { method: "GET", origin: "https://big.fake.test", path, headers: {}, body: null },
    token,
    TAG,
  );
}

test("C-92bd4c96 a response at the size limit passes and one byte more is too large", async () => {
  const fake = await startFakeEgress({ now: () => new Date(T0.getTime()) });
  const upstream = await startBigUpstream();
  try {
    fake.addUpstream("big.fake.test", upstream.origin);
    fake.addCredentialless(S2, TA, "http://big.fake.test");
    const gateway = fakeGateway(fake);

    const atLimit = await fetchBig(gateway, `/n/${MAX_RESPONSE_BYTES}`);
    assert.equal(atLimit.status, 200);
    assert.equal(atLimit.body.length, MAX_RESPONSE_BYTES);

    const empty = await fetchBig(gateway, "/n/0");
    assert.equal(empty.status, 200);
    assert.equal(empty.body.length, 0);

    await assert.rejects(
      fetchBig(gateway, `/n/${MAX_RESPONSE_BYTES + 1}`),
      errorIs("GATEWAY_RESPONSE_TOO_LARGE", { limit: String(MAX_RESPONSE_BYTES) }),
    );
  } finally {
    await fake.close();
    await upstream.close();
  }
});

test("C-92bd4c96 a chunked response respects the same size limit", async () => {
  const fake = await startFakeEgress({ now: () => new Date(T0.getTime()) });
  const upstream = await startBigUpstream();
  try {
    fake.addUpstream("big.fake.test", upstream.origin);
    fake.addCredentialless(S2, TA, "http://big.fake.test");
    const gateway = fakeGateway(fake);

    const atLimit = await fetchBig(gateway, `/n/${MAX_RESPONSE_BYTES}?chunked`);
    assert.equal(atLimit.status, 200);
    assert.equal(atLimit.body.length, MAX_RESPONSE_BYTES);

    await assert.rejects(
      fetchBig(gateway, `/n/${MAX_RESPONSE_BYTES + 1}?chunked`),
      errorIs("GATEWAY_RESPONSE_TOO_LARGE", { limit: String(MAX_RESPONSE_BYTES) }),
    );
  } finally {
    await fake.close();
    await upstream.close();
  }
});

test("C-92bd4c96 a token request aborts at thirty seconds and not before", async () => {
  const p = await issuedPermit();
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchFn = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init: init ?? {} });
      return new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal === undefined || signal === null) {
          reject(new Error("the client passed no signal"));
          return;
        }
        const fail = (): void => {
          reject(signal.reason);
        };
        if (signal.aborted) fail();
        else signal.addEventListener("abort", fail, { once: true });
      });
    };
    const gateway = createGateway(CFG, {
      clock: clock(),
      logger: silentLogger(),
      fetch: fetchFn as typeof fetch,
    });

    let settled = false;
    const request = gateway.requestToken(p, TAG);
    request.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await flush();

    const signal = calls[0]?.init.signal;
    assert.ok(signal instanceof AbortSignal, "the token request carries a signal");
    mock.timers.tick(TIMEOUT_MS - 1);
    await flush();
    assert.equal(signal.aborted, false, "not aborted before thirty seconds");
    mock.timers.tick(1);
    await flush();
    assert.equal(signal.aborted, true, "aborted at thirty seconds");

    await assert.rejects(request, errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }));
    assert.equal(settled, true, "the request settled at the timeout");
    assert.equal(calls.length, 1);
  } finally {
    mock.timers.reset();
  }
});

test("C-92bd4c96 a send timer aborts a stalled body and leaves a finished call alone", async () => {
  const p = await issuedPermit();
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const finished = recordingFetch([tokenAnswer(), new Response("ok", { status: 200 })]);
    const finishedGateway = createGateway(CFG, {
      clock: clock(),
      logger: silentLogger(),
      fetch: finished.fetch,
    });
    const finishedToken = await finishedGateway.requestToken(p, TAG);
    const answered = await finishedGateway.send(p, REQ, finishedToken, TAG);
    assert.equal(answered.status, 200);
    const finishedSignal = finished.calls[1]?.init.signal;
    assert.ok(finishedSignal instanceof AbortSignal, "the finished call carried a signal");
    mock.timers.tick(TIMEOUT_MS);
    await flush();
    assert.equal(finishedSignal.aborted, false, "a finished call leaves no aborting timer");

    const calls: { url: string; init: RequestInit }[] = [];
    let count = 0;
    const fetchFn = (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      calls.push({ url, init: init ?? {} });
      count += 1;
      if (count === 1) return Promise.resolve(tokenAnswer());
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("first"));
          const signal = init?.signal;
          if (signal === undefined || signal === null) return;
          const fail = (): void => {
            try {
              controller.error(signal.reason);
            } catch {
              // the stream already failed
            }
          };
          if (signal.aborted) fail();
          else signal.addEventListener("abort", fail, { once: true });
        },
      });
      return Promise.resolve(new Response(stream, { status: 200 }));
    };
    const gateway = createGateway(CFG, {
      clock: clock(),
      logger: silentLogger(),
      fetch: fetchFn as typeof fetch,
    });
    const token = await gateway.requestToken(p, TAG);

    let settled = false;
    const send = gateway.send(p, REQ, token, TAG);
    send.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );
    await flush();

    const signal = calls[1]?.init.signal;
    assert.ok(signal instanceof AbortSignal, "the send carries a signal");
    mock.timers.tick(TIMEOUT_MS - 1);
    await flush();
    assert.equal(signal.aborted, false, "not aborted before thirty seconds");
    mock.timers.tick(1);
    await flush();
    assert.equal(signal.aborted, true, "aborted at thirty seconds");

    await assert.rejects(send, errorIs("GATEWAY_UNAVAILABLE", { stage: "send" }));
    assert.equal(settled, true, "the send settled at the timeout");
    await assert.rejects(
      gateway.send(p, REQ, token, TAG),
      errorIs("GATEWAY_INVALID", { reason: "token_used" }),
    );
  } finally {
    mock.timers.reset();
  }
});

test("C-92bd4c96 an oversized token answer is unavailable while one at the limit is accepted", async () => {
  const p = await issuedPermit();

  const tooManyBytes = recordingFetch([
    new Response("x".repeat(MAX_RESPONSE_BYTES + 1), { status: 200 }),
  ]);
  const first = createGateway(CFG, {
    clock: clock(),
    logger: silentLogger(),
    fetch: tooManyBytes.fetch,
  });
  await assert.rejects(
    first.requestToken(p, TAG),
    errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }),
  );
  assert.equal(tooManyBytes.calls.length, 1);

  const validOverLimit = recordingFetch([
    new Response(tokenJsonOfSize(MAX_RESPONSE_BYTES + 1), { status: 200 }),
  ]);
  const second = createGateway(CFG, {
    clock: clock(),
    logger: silentLogger(),
    fetch: validOverLimit.fetch,
  });
  await assert.rejects(
    second.requestToken(p, TAG),
    errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }),
  );

  const atLimit = recordingFetch([new Response(tokenJsonOfSize(MAX_RESPONSE_BYTES), { status: 200 })]);
  const third = createGateway(CFG, {
    clock: clock(),
    logger: silentLogger(),
    fetch: atLimit.fetch,
  });
  const token = await third.requestToken(p, TAG);
  assert.deepEqual(token, { serviceId: S1, expiresAt: 1793959260 });
});

test("C-92bd4c96 a network failure is unavailable and spends the token", async () => {
  const p = await issuedPermit();
  const failing = recordingFetch([tokenAnswer(), new TypeError("fetch failed")]);
  const gateway = createGateway(CFG, {
    clock: clock(),
    logger: silentLogger(),
    fetch: failing.fetch,
  });
  const token = await gateway.requestToken(p, TAG);
  await assert.rejects(gateway.send(p, REQ, token, TAG), errorIs("GATEWAY_UNAVAILABLE", { stage: "send" }));
  await assert.rejects(
    gateway.send(p, REQ, token, TAG),
    errorIs("GATEWAY_INVALID", { reason: "token_used" }),
  );

  const port = await closedPort();
  const unreachable = createGateway(
    { ...CFG, brokerUrl: `http://127.0.0.1:${port}` },
    { clock: clock(), logger: silentLogger() },
  );
  await assert.rejects(
    unreachable.requestToken(p, TAG),
    errorIs("GATEWAY_UNAVAILABLE", { stage: "token" }),
  );
});
