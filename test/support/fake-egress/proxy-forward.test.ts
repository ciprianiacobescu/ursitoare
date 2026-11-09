import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { test } from "node:test";

import { startEchoUpstream, startFakeEgress } from "./index.ts";
import type { EchoUpstream, FakeEgress, ForwardedRequest } from "./index.ts";
import { putCredential } from "./vault-client.ts";
import type { VaultPutInput } from "./wire.ts";

const T0 = new Date("2026-11-06T10:00:00.000Z");
const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const T_B = "4b8a2c1e-0000-8000-8000-000000000002";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S1 = sid(1);
const S2 = sid(2);
const S3 = sid(3);
const S4 = sid(4);
const S5 = sid(5);
const S6 = sid(6);
const H_KEY = "x-fake-tools-key";
const VAL1 = "kv-secret-7f3a";
const VAL2 = "kv-secret-8e2b";
const VALB = "bt-secret-9c1d";
const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const D_HELLO = "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";

interface Who {
  identity: string;
  token: string;
}
interface Reply {
  status: number;
  body: string;
}
interface EchoSeen {
  method: string;
  path: string;
  query: string;
  headers: Record<string, string>;
  bodySha256: string;
}

function req1(over: Partial<VaultPutInput> = {}): VaultPutInput {
  return {
    tenantId: T_A,
    serviceId: S1,
    authScheme: 1,
    value: Buffer.from(VAL1),
    headerName: H_KEY,
    callerActorId: "carol",
    targetUrl: "http://tools.fake.test",
    ...over,
  };
}

async function start(): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => T0 });
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

async function put(fake: FakeEgress, who: Who, over: Partial<VaultPutInput> = {}): Promise<void> {
  let status = -1;
  await assert.doesNotReject(async () => {
    status = (await putCredential(fake.vaultUrl, who, req1(over))).grpcStatus;
  });
  assert.equal(status, 0);
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
  base: string,
  method: string,
  path: string,
  headers: http.OutgoingHttpHeaders = {},
  body?: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
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

function seen(reply: Reply): EchoSeen {
  assert.equal(reply.status, 200, "the proxy answered the echo's 200");
  const echo = JSON.parse(reply.body) as EchoSeen;
  return { ...echo, headers: Object.fromEntries(Object.entries(echo.headers).filter(([k]) => k !== "connection")) };
}

async function startNewEcho(): Promise<EchoUpstream> {
  let echo: EchoUpstream | undefined;
  await assert.doesNotReject(async () => {
    echo = await startEchoUpstream();
  });
  assert.ok(echo !== undefined, "echo started");
  return echo;
}

interface Upstream {
  port: number;
  log: string[];
  open(): void;
  close(): Promise<void>;
}

async function startU(): Promise<Upstream> {
  const log: string[] = [];
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });
  const server = http.createServer((req, res) => {
    log.push(req.url ?? "");
    if (req.url === "/stream") {
      res.write("first\n");
      void gate.then(() => {
        res.end("second\n");
      });
    } else if (req.url === "/found") {
      res.writeHead(302, { location: "https://elsewhere.example/x?y=1", "set-cookie": ["a=1", "b=2"], "x-up": "1" });
      res.end();
    } else if (req.url === "/boom") {
      res.writeHead(500);
      res.end("boom");
    } else if (req.url === "/who") {
      res.end(req.headers.host ?? "");
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as net.AddressInfo).port;
  return {
    port,
    log,
    open,
    close: async (): Promise<void> => {
      open();
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as net.AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

interface Pass {
  fake: FakeEgress;
  u: Upstream;
}

async function passSetup(): Promise<Pass> {
  const fake = await start();
  const u = await startU();
  const dead = await closedPort();
  fake.addUpstream("tools.fake.test", `http://127.0.0.1:${u.port}`);
  fake.addUpstream("down.fake.test", `http://127.0.0.1:${dead}`);
  await put(fake, fake.vaultAdmin, { serviceId: S1 });
  await put(fake, fake.vaultAdmin, { serviceId: S4, targetUrl: "http://down.fake.test" });
  await put(fake, fake.vaultAdmin, { serviceId: S5, targetUrl: "https://nowhere.fake.test" });
  await put(fake, fake.vaultAdmin, { serviceId: S6, targetUrl: `http://127.0.0.1:${u.port}` });
  return { fake, u };
}

async function viaFetch(fake: FakeEgress, serviceId: string, path: string): Promise<{ status: number; text: string }> {
  const tok = await issue(fake, serviceId);
  const res = await fetch(`${fake.proxyUrl}/${serviceId}${path}`, {
    headers: { authorization: `Bearer ${tok}` },
    signal: AbortSignal.timeout(5000),
  });
  return { status: res.status, text: await res.text() };
}

const view = (r: ForwardedRequest): Record<string, unknown> => ({
  path: r.path,
  status: r.status,
  outcome: r.outcome,
  host: r.host,
});

test("C-aaa7c26b the proxy forwards F1 to F4 with the stored credential injected", async () => {
  const fake = await start();
  const echo = await startNewEcho();
  try {
    fake.addUpstream("tools.fake.test", echo.origin);
    await put(fake, fake.vaultAdmin, { serviceId: S1 });
    await put(fake, fake.vaultAdmin, {
      serviceId: S2,
      authScheme: 3,
      value: Buffer.from(VALB),
      headerName: "",
      targetUrl: "https://tools.fake.test",
    });
    const tok1 = await issue(fake, S1);
    const tok2 = await issue(fake, S2);
    const bearer1 = { authorization: `Bearer ${tok1}` };

    const f1 = seen(
      await call(fake.proxyUrl, "GET", `/${S1}/x?q=1`, {
        ...bearer1,
        "x-caller": "1",
        "x-fake-tools-key": "caller-supplied",
        connection: "keep-alive, x-drop-me",
        "x-drop-me": "1",
        te: "trailers",
      }),
    );
    const f2 = seen(
      await call(
        fake.proxyUrl,
        "POST",
        `/${S1}/pay/run`,
        { ...bearer1, "content-type": "application/json", "content-length": "5", "x-caller": "2" },
        "hello",
      ),
    );
    const f3 = seen(await call(fake.proxyUrl, "GET", `/${S2}`, { authorization: `Bearer ${tok2}` }));
    const f4 = seen(await call(fake.proxyUrl, "GET", `/${S1}/a%20b/c?x=%41&y`, bearer1));

    const host = "tools.fake.test";
    assert.deepEqual(f1, {
      method: "GET",
      path: "/x",
      query: "q=1",
      bodySha256: D_EMPTY,
      headers: { "x-caller": "1", host, [H_KEY]: VAL1 },
    });
    assert.deepEqual(f2, {
      method: "POST",
      path: "/pay/run",
      query: "",
      bodySha256: D_HELLO,
      headers: { "content-type": "application/json", "content-length": "5", "x-caller": "2", host, [H_KEY]: VAL1 },
    });
    assert.deepEqual(f3, {
      method: "GET",
      path: "/",
      query: "",
      bodySha256: D_EMPTY,
      headers: { host, authorization: `Bearer ${VALB}` },
    });
    assert.deepEqual(f4, {
      method: "GET",
      path: "/a%20b/c",
      query: "x=%41&y",
      bodySha256: D_EMPTY,
      headers: { host, [H_KEY]: VAL1 },
    });

    const record = (serviceId: string, e: EchoSeen): ForwardedRequest => ({
      serviceId,
      method: e.method,
      host,
      path: e.path,
      query: e.query,
      headers: Object.fromEntries(
        Object.entries(e.headers).map(([k, v]) => [k, k === H_KEY || k === "authorization" ? "[credential]" : v]),
      ),
      bodySha256: e.bodySha256,
      status: 200,
      outcome: "allowed",
    });
    assert.deepEqual(fake.requests(), [record(S1, f1), record(S1, f2), record(S2, f3), record(S1, f4)]);

    const events = fake.events();
    assert.deepEqual(
      events.map((e) => e.event_type),
      ["token.issued", "token.issued", "proxy.hit", "proxy.hit", "proxy.hit", "proxy.hit"],
    );
    const jtis = fake.issued();
    const targets = [S1, S1, S2, S1];
    const jtiOf = [jtis[0]?.jti, jtis[0]?.jti, jtis[1]?.jti, jtis[0]?.jti];
    events.slice(2).forEach((e, i) => {
      const { upstream_latency_ms: latency, ...rest } = e.payload;
      assert.ok(Number.isInteger(latency) && (latency as number) >= 0, "latency is an integer of at least 0");
      assert.deepEqual(rest, { jti: jtiOf[i], upstream_status: 200, outcome: "allowed" });
      assert.equal(e.emitter, "proxy");
      assert.equal(e.tenant_id, T_A);
      assert.equal(e.actor_id, "alice");
      assert.equal(e.target_id, targets[i]);
    });
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-0bc1717c the proxy injects the re-stored credential", async () => {
  const fake = await start();
  const echo = await startNewEcho();
  try {
    fake.addUpstream("tools.fake.test", echo.origin);
    await put(fake, fake.vaultAdmin);
    await put(fake, fake.vaultAdmin, { value: Buffer.from(VAL2) });
    await put(fake, fake.vaultProxy, { serviceId: S2, authScheme: 3, value: Buffer.from(VALB), headerName: "" });
    await put(fake, fake.vaultAdmin, { tenantId: T_B });
    const tok = await issue(fake, S1);
    const e = seen(await call(fake.proxyUrl, "GET", `/${S1}/x`, { authorization: `Bearer ${tok}` }));
    assert.equal(e.headers[H_KEY], VAL2);
    assert.equal(e.path, "/x");
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-4347a436 the proxy streams the body before the upstream ends", async () => {
  const { fake, u } = await passSetup();
  try {
    const tok = await issue(fake, S1);
    const decoder = new TextDecoder();
    const out: { reader: ReadableStreamDefaultReader<Uint8Array> | null; first: string } = { reader: null, first: "" };
    await assert.doesNotReject(async () => {
      const res = await fetch(`${fake.proxyUrl}/${S1}/stream`, {
        headers: { authorization: `Bearer ${tok}` },
        signal: AbortSignal.timeout(5000),
      });
      assert.ok(res.body !== null, "a body streams back");
      out.reader = res.body.getReader();
      out.first = decoder.decode((await out.reader.read()).value);
    });
    assert.equal(out.first, "first\n");
    assert.deepEqual(fake.requests(), []);
    u.open();
    const reader = out.reader;
    assert.ok(reader !== null, "reader open");
    let rest = "";
    let r = await reader.read();
    while (!r.done) {
      rest += decoder.decode(r.value);
      r = await reader.read();
    }
    assert.equal(rest, "second\n");
    assert.deepEqual(fake.requests().map(view), [
      { path: "/stream", status: 200, outcome: "allowed", host: "tools.fake.test" },
    ]);
    assert.deepEqual(
      fake.events().map((e) => e.event_type),
      ["token.issued", "proxy.hit"],
    );
  } finally {
    await u.close();
    await fake.close();
  }
});

test("C-4347a436 redirects, errors and unrouted hosts pass through", async () => {
  const { fake, u } = await passSetup();
  try {
    const tok = await issue(fake, S1);
    const found = await fetch(`${fake.proxyUrl}/${S1}/found`, {
      headers: { authorization: `Bearer ${tok}` },
      redirect: "manual",
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(found.status, 302);
    assert.equal(found.headers.get("location"), "https://elsewhere.example/x?y=1");
    assert.deepEqual(found.headers.getSetCookie(), ["a=1", "b=2"]);
    assert.equal(found.headers.get("x-up"), "1");
    await found.text();

    const boom = await viaFetch(fake, S1, "/boom");
    assert.deepEqual(boom, { status: 500, text: "boom" });
    const down = await viaFetch(fake, S4, "/x");
    assert.deepEqual(down, { status: 502, text: "bad gateway: upstream unreachable\n" });
    const nowhere = await viaFetch(fake, S5, "/x");
    assert.deepEqual(nowhere, { status: 502, text: "bad gateway: upstream unreachable\n" });
    const who = await viaFetch(fake, S6, "/who");
    assert.deepEqual(who, { status: 200, text: `127.0.0.1:${u.port}` });

    assert.deepEqual(u.log, ["/found", "/boom", "/who"]);
    assert.deepEqual(fake.requests().map(view), [
      { path: "/found", status: 302, outcome: "allowed", host: "tools.fake.test" },
      { path: "/boom", status: 500, outcome: "error", host: "tools.fake.test" },
      { path: "/x", status: 502, outcome: "error", host: "down.fake.test" },
      { path: "/x", status: 502, outcome: "error", host: "nowhere.fake.test" },
      { path: "/who", status: 200, outcome: "allowed", host: `127.0.0.1:${u.port}` },
    ]);
    const proxyEvents = fake
      .events()
      .filter((e) => e.event_type.startsWith("proxy."))
      .map((e) => [e.event_type, e.payload["upstream_status"]]);
    assert.deepEqual(proxyEvents, [
      ["proxy.hit", 302],
      ["proxy.error", 500],
      ["proxy.error", 502],
      ["proxy.error", 502],
      ["proxy.hit", 200],
    ]);
  } finally {
    await u.close();
    await fake.close();
  }
});

test("C-6f87d878 the credential-less route serves until a credential is stored", async () => {
  const fake = await start();
  const echo = await startNewEcho();
  try {
    fake.addUpstream("tools.fake.test", echo.origin);
    fake.addCredentialless(S3, T_A, "http://tools.fake.test");
    const tok = await issue(fake, S3);
    const auth = { authorization: `Bearer ${tok}` };

    const first = seen(await call(fake.proxyUrl, "GET", `/${S3}/x`, auth));
    assert.deepEqual(first.headers, { host: "tools.fake.test" });
    assert.deepEqual(
      fake.requests().map((r) => r.headers),
      [{ host: "tools.fake.test" }],
    );
    assert.deepEqual(fake.credentials(), []);

    await put(fake, fake.vaultAdmin, { serviceId: S3 });
    const second = seen(await call(fake.proxyUrl, "GET", `/${S3}/x`, auth));
    assert.equal(second.headers[H_KEY], VAL1);
    assert.equal(fake.requests()[1]?.headers[H_KEY], "[credential]");
  } finally {
    await fake.close();
    await echo.close();
  }
});

test("C-6f87d878 bad credential-less registrations throw and register nothing", async () => {
  const fake = await start();
  try {
    assert.throws(() => fake.addCredentialless("svc_1", T_A, "http://tools.fake.test"), {
      name: "TypeError",
      message: "addCredentialless: ids must be lowercase UUIDs",
    });
    assert.throws(() => fake.addCredentialless(S3, T_A.toUpperCase(), "http://tools.fake.test"), {
      name: "TypeError",
      message: "addCredentialless: ids must be lowercase UUIDs",
    });
    for (const bad of ["http://tools.fake.test/x", "ftp://tools.fake.test"]) {
      assert.throws(() => fake.addCredentialless(S3, T_A, bad), {
        name: "TypeError",
        message: "addCredentialless: targetUrl must be an http or https origin",
      });
    }
    const tok = await issue(fake, S3);
    const reply = await call(fake.proxyUrl, "GET", `/${S3}/x`, { authorization: `Bearer ${tok}` });
    assert.deepEqual(reply, { status: 502, body: "bad gateway: vault error\n" });
  } finally {
    await fake.close();
  }
});
