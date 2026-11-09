import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeToolCall, FakeTools } from "./index.ts";
import {
  FAKE_TOOLS_HOST,
  FAKE_TOOLS_KEY_HEADER,
  FAKE_TOOLS_ORIGIN,
  fakeToolPath,
  startFakeTools,
} from "./index.ts";

const D_ACME = "ad89878ead763441ddc3bdb920c15ac97d953890d73464b6cdfc28e7a14d36ad";
const LOOKUP_OUTPUT = { vendor_id: "V-ACME", status: "active", payment_terms_days: 30 };
const INPUT = { vendor_name: "Acme GmbH" };

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function post(
  base: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method: "POST", path, headers, agent: false },
      (res) => {
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );
    req.on("error", reject);
    req.end(body);
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  assert.ok(typeof value === "object" && value !== null && !Array.isArray(value));
  return value as Record<string, unknown>;
}

test("C-56fb9fcb a read call answers its fixture and is recorded", async () => {
  assert.equal(FAKE_TOOLS_HOST, "tools.fake.test");
  assert.equal(FAKE_TOOLS_ORIGIN, "https://tools.fake.test");
  assert.equal(FAKE_TOOLS_KEY_HEADER, "x-fake-tools-key");

  let lookupPath = "";
  assert.doesNotThrow(() => {
    lookupPath = fakeToolPath("erp.lookup_vendor@1");
  });
  assert.equal(lookupPath, "/blocks/erp.lookup_vendor@1");

  let spacePath = "";
  assert.doesNotThrow(() => {
    spacePath = fakeToolPath("x y@1");
  });
  assert.equal(spacePath, "/blocks/x y@1");

  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the fake started");
  const fake: FakeTools = started;
  try {
    const body = JSON.stringify(INPUT);
    const first = await post(
      fake.origin,
      "/blocks/erp.lookup_vendor@1?x=1",
      {
        host: "tools.fake.test",
        "x-ursitoare-call": "r_1:lookup:1",
        "x-fake-tools-key": "kv-tools-4d1c",
        "content-type": "application/json",
      },
      body,
    );
    const second = await post(
      fake.origin,
      "/blocks/erp.lookup_vendor%401",
      { "content-type": "application/json" },
      body,
    );

    assert.equal(first.status, 200);
    assert.deepEqual(asRecord(JSON.parse(first.body)), LOOKUP_OUTPUT);
    assert.equal(first.headers["x-fake-tools-duplicate"], "false");
    assert.equal(second.status, 200);
    assert.deepEqual(asRecord(JSON.parse(second.body)), LOOKUP_OUTPUT);
    assert.equal(second.headers["x-fake-tools-duplicate"], "false");

    const port = new URL(fake.origin).port;
    const expected: FakeToolCall[] = [
      {
        seq: 1,
        ref: "erp.lookup_vendor@1",
        effect: "read",
        method: "POST",
        path: "/blocks/erp.lookup_vendor@1",
        host: "tools.fake.test",
        callHeader: "r_1:lookup:1",
        idempotencyKey: null,
        keyHeaderSeen: true,
        input: INPUT,
        bodySha256: D_ACME,
        status: 200,
        duplicate: false,
      },
      {
        seq: 2,
        ref: "erp.lookup_vendor@1",
        effect: "read",
        method: "POST",
        path: "/blocks/erp.lookup_vendor%401",
        host: `127.0.0.1:${port}`,
        callHeader: null,
        idempotencyKey: null,
        keyHeaderSeen: false,
        input: INPUT,
        bodySha256: D_ACME,
        status: 200,
        duplicate: false,
      },
    ];

    assert.deepEqual(fake.calls(), expected);
    assert.deepEqual(
      fake.calls({ ref: "erp.lookup_vendor@1" }),
      expected,
      "the ref filter returns both records",
    );
    assert.deepEqual(
      fake.calls({ callHeader: "r_1:lookup:1" }),
      [expected[0]],
      "the callHeader filter returns the first record",
    );
    assert.deepEqual(fake.calls({ ref: "mail.send@1" }), [], "the mail ref has no records");

    const copy = fake.calls();
    const copyFirst = copy[0];
    assert.ok(copyFirst !== undefined);
    asRecord(copyFirst.input)["vendor_name"] = "MUTATED";
    const laterFirst = fake.calls()[0];
    assert.ok(laterFirst !== undefined);
    assert.deepEqual(laterFirst.input, INPUT, "calls() returns copies");

    assert.equal(first.body.includes("kv-tools-4d1c"), false);
    assert.equal(second.body.includes("kv-tools-4d1c"), false);
    assert.equal(JSON.stringify(fake.calls()).includes("kv-tools-4d1c"), false);
  } finally {
    await fake.close();
  }
});
