import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";
import { putCredential } from "./vault-client.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S1 = sid(1);
const S2 = sid(2);

interface Post {
  method: string;
  url: string;
  contentType: string;
  token: string;
  body: string;
}

interface Sink {
  url: string;
  posts: Post[];
  close(): Promise<void>;
}

async function startSink(status: number): Promise<Sink> {
  const posts: Post[] = [];
  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      posts.push({
        method: req.method ?? "",
        url: req.url ?? "",
        contentType: String(req.headers["content-type"] ?? ""),
        token: String(req.headers["x-mintkey-service-token"] ?? ""),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.statusCode = status;
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    posts,
    close: async (): Promise<void> => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function startUpstream(): Promise<{ origin: string; close(): Promise<void> }> {
  const server = http.createServer((req, res) => {
    req.resume();
    if (req.url === "/boom") {
      res.statusCode = 500;
      res.end("boom");
    } else res.end("ok");
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: async (): Promise<void> => {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    },
  };
}

async function start(auditSink: string | null): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => new Date("2026-11-06T10:00:00.000Z"), auditSink });
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

async function issue(fake: FakeEgress): Promise<{ status: number; token: string }> {
  const res = await fetch(`${fake.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: { "x-mintkey-service-token": fake.brokerServiceToken, "content-type": "application/json" },
    body: JSON.stringify({ agent_id: "alice", service_id: S1, tenant_id: T_A, scope: "call", ttl_seconds: 60 }),
  });
  const body = (await res.json()) as { token?: string };
  return { status: res.status, token: body.token ?? "" };
}

async function getProxy(fake: FakeEgress, path: string, token: string): Promise<number> {
  const res = await fetch(`${fake.proxyUrl}${path}`, { headers: { authorization: `Bearer ${token}` } });
  await res.arrayBuffer();
  return res.status;
}

function withoutEmitter(event: object): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...event };
  delete copy["emitter"];
  return copy;
}

test("C-835a1ff3 each event is posted to the sink with the emitter's token before the call returns", async () => {
  const sink = await startSink(202);
  const up = await startUpstream();
  const fake = await start(sink.url);
  try {
    fake.addUpstream("tools.fake.test", up.origin);
    const put = await putCredential(fake.vaultUrl, fake.vaultAdmin, {
      tenantId: T_A,
      serviceId: S1,
      authScheme: 1,
      value: Buffer.from("kv-secret-7f3a"),
      headerName: "x-fake-tools-key",
      callerActorId: "carol",
      targetUrl: "http://tools.fake.test",
    });
    assert.equal(put.grpcStatus, 0);
    const { token } = await issue(fake);
    assert.equal(sink.posts.length, 1);
    assert.equal(await getProxy(fake, `/${S1}/x`, token), 200);
    assert.equal(sink.posts.length, 2);
    assert.equal(await getProxy(fake, `/${S2}/x`, token), 403);
    assert.equal(sink.posts.length, 3);
    assert.equal(await getProxy(fake, `/${S1}/boom`, token), 500);
    assert.equal(sink.posts.length, 4);

    const events = fake.events();
    assert.deepEqual(
      events.map((e) => e.event_type),
      ["token.issued", "proxy.hit", "proxy.aud_mismatch_rejected", "proxy.error"],
    );
    assert.deepEqual(
      sink.posts.map((p) => p.token),
      [fake.brokerServiceToken, fake.proxyServiceToken, fake.proxyServiceToken, fake.proxyServiceToken],
    );
    for (const [i, post] of sink.posts.entries()) {
      assert.equal(post.method, "POST");
      assert.equal(post.url, "/v1/internal/audit/emit");
      assert.match(post.contentType, /^application\/json/);
      assert.deepEqual(JSON.parse(post.body), withoutEmitter(events[i] ?? {}));
    }
  } finally {
    await fake.close();
    await up.close();
    await sink.close();
  }
});

test("C-835a1ff3 a failing, closed or absent sink is ignored and the event is still recorded", async () => {
  const failing = await startSink(500);
  const closedProbe = net.createServer();
  await new Promise<void>((resolve) => closedProbe.listen(0, "127.0.0.1", resolve));
  const closedPort = (closedProbe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => closedProbe.close(() => resolve()));
  const a = await start(failing.url);
  const b = await start(`http://127.0.0.1:${closedPort}`);
  const c = await start(null);
  try {
    for (const fake of [a, b, c]) {
      const r = await issue(fake);
      assert.equal(r.status, 200);
      assert.equal(fake.events().length, 1);
    }
    assert.equal(failing.posts.length, 1);
    assert.equal(failing.posts[0]?.token, a.brokerServiceToken);
  } finally {
    await Promise.all([a.close(), b.close(), c.close()]);
    await failing.close();
  }
});
