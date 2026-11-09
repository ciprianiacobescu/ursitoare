import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import http from "node:http";
import net from "node:net";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";
import { putCredential } from "./vault-client.ts";

const T0 = new Date("2026-11-06T10:00:00.000Z");
const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S4 = sid(4);
const S5 = sid(5);

interface Reply {
  status: number;
  body: string;
}

function sha256(body: string | Uint8Array): string {
  return createHash("sha256").update(body).digest("hex");
}

async function start(): Promise<FakeEgress> {
  let fake: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    fake = await startFakeEgress({ now: () => T0 });
  });
  assert.ok(fake !== undefined, "fake started");
  return fake;
}

async function put(fake: FakeEgress, serviceId: string, targetUrl: string): Promise<void> {
  let status = -1;
  await assert.doesNotReject(async () => {
    status = (
      await putCredential(fake.vaultUrl, fake.vaultAdmin, {
        tenantId: T_A,
        serviceId,
        authScheme: 1,
        value: Buffer.from("kv-secret-7f3a"),
        headerName: "x-fake-tools-key",
        callerActorId: "carol",
        targetUrl,
      })
    ).grpcStatus;
  });
  assert.equal(status, 0);
}

async function issue(fake: FakeEgress, serviceId: string): Promise<string> {
  const res = await fetch(`${fake.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: { "x-mintkey-service-token": fake.brokerServiceToken, "content-type": "application/json" },
    body: JSON.stringify({ agent_id: "alice", service_id: serviceId, tenant_id: T_A, scope: "call", ttl_seconds: 60 }),
  });
  assert.equal(res.status, 200);
  const body = (await res.json()) as { token: string };
  return body.token;
}

function call(base: string, method: string, path: string, headers: http.OutgoingHttpHeaders, body: string): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request({ host: url.hostname, port: url.port, method, path, headers, agent: false }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (c: Buffer) => chunks.push(c));
      res.on("end", () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
    });
    req.on("error", reject);
    req.end(body);
  });
}

function callHeld(base: string, path: string, token: string, first: string, rest: string): Promise<Reply> {
  return new Promise((resolve) => {
    const url = new URL(base);
    let settled = false;
    const state: { timer?: ReturnType<typeof setTimeout> } = {};
    const finish = (reply: Reply): void => {
      if (settled) return;
      settled = true;
      if (state.timer !== undefined) clearTimeout(state.timer);
      resolve(reply);
    };
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        method: "POST",
        path,
        headers: { authorization: `Bearer ${token}`, "content-type": "text/plain" },
        agent: false,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => finish({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString("utf8") }));
      },
    );
    req.on("error", () => finish({ status: 0, body: "" }));
    req.write(first);
    state.timer = setTimeout(() => {
      req.end(rest);
    }, 50);
  });
}

async function closedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  await new Promise<void>((resolve) => server.close(() => resolve()));
  return port;
}

test("C-3324bdb6 C-4347a436 no-route upstream records the whole request body digest", async () => {
  const fake = await start();
  try {
    await put(fake, S5, "https://nowhere.fake.test");
    const tok = await issue(fake, S5);
    const body = "hello";
    const reply = await call(
      fake.proxyUrl,
      "POST",
      `/${S5}/x`,
      { authorization: `Bearer ${tok}`, "content-type": "text/plain" },
      body,
    );
    assert.deepEqual(reply, { status: 502, body: "bad gateway: upstream unreachable\n" });

    const records = fake.requests();
    assert.equal(records.length, 1);
    const record = records[0];
    assert.ok(record !== undefined, "the unreachable request is recorded");
    assert.equal(record.host, "nowhere.fake.test");
    assert.equal(record.status, 502);
    assert.equal(record.outcome, "error");
    assert.equal(record.bodySha256, sha256(body));
  } finally {
    await fake.close();
  }
});

test("C-3324bdb6 C-4347a436 connection failure records the whole request body digest", async () => {
  const fake = await start();
  try {
    const dead = await closedPort();
    fake.addUpstream("down.fake.test", `http://127.0.0.1:${dead}`);
    await put(fake, S4, "http://down.fake.test");
    const tok = await issue(fake, S4);
    const first = "a".repeat(32768);
    const rest = "b".repeat(32768);

    const reply = await callHeld(fake.proxyUrl, `/${S4}/x`, tok, first, rest);
    assert.deepEqual(reply, { status: 502, body: "bad gateway: upstream unreachable\n" });

    const records = fake.requests();
    assert.equal(records.length, 1);
    const record = records[0];
    assert.ok(record !== undefined, "the unreachable request is recorded");
    assert.equal(record.host, "down.fake.test");
    assert.equal(record.status, 502);
    assert.equal(record.outcome, "error");
    assert.equal(record.bodySha256, sha256(first + rest));
  } finally {
    await fake.close();
  }
});
