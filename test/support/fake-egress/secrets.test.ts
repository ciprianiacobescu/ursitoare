import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import http from "node:http";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import { startFakeEgress } from "./index.ts";
import type { FakeEgress } from "./index.ts";
import { putCredential } from "./vault-client.ts";

const T_A = "4b8a2c1e-0000-8000-8000-000000000001";
const sid = (n: number): string => `0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e0${n}`;
const S1 = sid(1);
const S2 = sid(2);
const VAL1 = "kv-secret-7f3a";
const VAL2 = "kv-secret-8e2b";
const VALB = "bt-secret-9c1d";

async function issue(fake: FakeEgress, serviceId: string): Promise<string> {
  const res = await fetch(`${fake.brokerUrl}/v1/issue`, {
    method: "POST",
    headers: { "x-mintkey-service-token": fake.brokerServiceToken, "content-type": "application/json" },
    body: JSON.stringify({ agent_id: "alice", service_id: serviceId, tenant_id: T_A, scope: "call", ttl_seconds: 60 }),
  });
  assert.equal(res.status, 200);
  return ((await res.json()) as { token: string }).token;
}

async function getProxy(fake: FakeEgress, path: string, token: string): Promise<number> {
  const res = await fetch(`${fake.proxyUrl}${path}`, { headers: { authorization: `Bearer ${token}`, "x-caller": "1" } });
  await res.arrayBuffer();
  return res.status;
}

test("C-dd64c392 no needle is recorded or posted, six events are posted and no source prints", async () => {
  const posts: { token: string; body: string }[] = [];
  const sink = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      posts.push({
        token: String(req.headers["x-mintkey-service-token"] ?? ""),
        body: Buffer.concat(chunks).toString("utf8"),
      });
      res.statusCode = 202;
      res.end("{}");
    });
  });
  await new Promise<void>((resolve) => sink.listen(0, "127.0.0.1", resolve));
  const up = http.createServer((req, res) => {
    req.resume();
    res.end("ok");
  });
  await new Promise<void>((resolve) => up.listen(0, "127.0.0.1", resolve));
  let started: FakeEgress | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeEgress({
      now: () => new Date("2026-11-06T10:00:00.000Z"),
      auditSink: `http://127.0.0.1:${(sink.address() as AddressInfo).port}`,
    });
  });
  assert.ok(started !== undefined, "fake started");
  const fake = started;
  try {
    fake.addUpstream("tools.fake.test", `http://127.0.0.1:${(up.address() as AddressInfo).port}`);
    const base = {
      tenantId: T_A,
      authScheme: 1,
      headerName: "x-fake-tools-key",
      callerActorId: "carol",
      targetUrl: "http://tools.fake.test",
    };
    await putCredential(fake.vaultUrl, fake.vaultAdmin, { ...base, serviceId: S1, value: Buffer.from(VAL1) });
    await putCredential(fake.vaultUrl, fake.vaultAdmin, { ...base, serviceId: S1, value: Buffer.from(VAL2) });
    await putCredential(fake.vaultUrl, fake.vaultAdmin, {
      ...base,
      serviceId: S2,
      authScheme: 3,
      headerName: "",
      value: Buffer.from(VALB),
    });
    const tok1 = await issue(fake, S1);
    const tok2 = await issue(fake, S2);
    assert.equal(await getProxy(fake, `/${S1}/a`, tok1), 200);
    assert.equal(await getProxy(fake, `/${S1}/b?q=1`, tok1), 200);
    assert.equal(await getProxy(fake, `/${S2}/c`, tok2), 200);
    assert.equal(await getProxy(fake, `/${S2}/x`, tok1), 403);
    assert.equal(await getProxy(fake, `/${S1}/x`, `${tok1}x`), 401);

    assert.equal(posts.length, 6);
    assert.deepEqual(
      posts.map((p) => p.token),
      [
        fake.brokerServiceToken,
        fake.brokerServiceToken,
        fake.proxyServiceToken,
        fake.proxyServiceToken,
        fake.proxyServiceToken,
        fake.proxyServiceToken,
      ],
    );
    assert.deepEqual(
      posts.map((p) => (JSON.parse(p.body) as { event_type: string }).event_type).sort(),
      [
        "proxy.aud_mismatch_rejected",
        "proxy.hit",
        "proxy.hit",
        "proxy.hit",
        "token.issued",
        "token.issued",
      ],
    );

    const needles = [
      VAL1,
      VAL2,
      VALB,
      fake.brokerServiceToken,
      fake.proxyServiceToken,
      fake.vaultAdmin.token,
      fake.vaultProxy.token,
      fake.vaultDenied.token,
      tok1,
      tok2,
    ];
    const haystacks = [
      JSON.stringify(fake.credentials()),
      JSON.stringify(fake.issued()),
      JSON.stringify(fake.requests()),
      JSON.stringify(fake.events()),
      ...posts.map((p) => p.body),
    ];
    for (const needle of needles) {
      for (const text of haystacks) assert.ok(!text.includes(needle), "a secret was recorded");
    }
    for (const r of fake.requests()) {
      if (r.headers["authorization"] !== undefined) assert.equal(r.headers["authorization"], "[credential]");
    }

    const dir = new URL(".", import.meta.url);
    const sources = readdirSync(dir).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
    assert.ok(sources.length >= 5);
    for (const file of sources) {
      assert.doesNotMatch(readFileSync(new URL(file, dir), "utf8"), /\bconsole\.|process\.(stdout|stderr)/, file);
    }
  } finally {
    await fake.close();
    up.closeAllConnections();
    sink.closeAllConnections();
    await new Promise<void>((resolve) => up.close(() => resolve()));
    await new Promise<void>((resolve) => sink.close(() => resolve()));
  }
});
