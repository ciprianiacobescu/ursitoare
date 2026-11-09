import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

const MAIL_A = { to: "a@x.test", subject: "s", body: "b" };
const MAIL_MESSAGE = { message_id: "msg-3b11d4d341" };
const GET_OUTPUT = { status: 200, body: "GET u -> ok" };
const LOOKUP_GLOBEX = { vendor_id: "V-GLOBEX", status: "active", payment_terms_days: 45 };
const DOCS_U = {
  content:
    "Fetched document for u. Quarterly policy: payments above 10000 require two approvers.",
  content_type: "text/plain",
};

function p1(query: string): Record<string, unknown> {
  return {
    text: `Policy note about "${query}": refunds are allowed within 30 days.`,
    source: "kb://policies/refunds",
  };
}

const P2 = {
  text: "Escalate urgent tickets to the support lead.",
  source: "kb://policies/escalation",
};

function injected(status: number): unknown {
  return { error: "injected_failure", status };
}

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function send(
  base: string,
  ref: string,
  headers: http.OutgoingHttpHeaders,
  input: unknown,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        method: "POST",
        path: `/blocks/${ref}`,
        headers,
        agent: false,
      },
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
    req.end(JSON.stringify(input));
  });
}

async function start(): Promise<FakeTools> {
  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the fake started");
  return started;
}

async function pollForRecord(fake: FakeTools): Promise<void> {
  const started = performance.now();
  while (fake.calls().length === 0) {
    if (performance.now() - started >= 5000) {
      assert.fail("a record was not appended within 5000 ms");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("C-bb5569bd failure injection is consumed per recorded request", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.failNext("mail.send@1", 503, 2));
    const headers: http.OutgoingHttpHeaders = {
      "content-type": "application/json",
      "idempotency-key": "fk-1",
    };

    const first = await send(fake.origin, "mail.send@1", headers, MAIL_A);
    assert.equal(first.status, 503);
    assert.deepEqual(JSON.parse(first.body), injected(503));
    assert.equal(first.headers["x-fake-tools-duplicate"], undefined);

    const between = await send(fake.origin, "http.get@1", headers, { url: "u" });
    assert.equal(between.status, 200);
    assert.deepEqual(JSON.parse(between.body), GET_OUTPUT);

    const second = await send(fake.origin, "mail.send@1", headers, MAIL_A);
    assert.equal(second.status, 503);
    assert.deepEqual(JSON.parse(second.body), injected(503));

    const third = await send(fake.origin, "mail.send@1", headers, MAIL_A);
    assert.equal(third.status, 200);
    assert.deepEqual(JSON.parse(third.body), MAIL_MESSAGE);
    assert.equal(third.headers["x-fake-tools-duplicate"], "false");

    const fourth = await send(fake.origin, "mail.send@1", headers, MAIL_A);
    assert.equal(fourth.status, 200);
    assert.deepEqual(JSON.parse(fourth.body), MAIL_MESSAGE);
    assert.equal(fourth.headers["x-fake-tools-duplicate"], "true");

    const records = fake.calls({ ref: "mail.send@1" });
    assert.deepEqual(
      records.map((record) => record.status),
      [503, 503, 200, 200],
    );
    assert.deepEqual(
      records.map((record) => record.duplicate),
      [false, false, false, true],
    );
    assert.equal(fake.calls({ ref: "http.get@1" }).length, 1);
  } finally {
    await fake.close();
  }
});

test("C-bb5569bd failure injection precedes the schema check and a later call replaces it", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.failNext("erp.lookup_vendor@1", 500));
    const failed = await send(
      fake.origin,
      "erp.lookup_vendor@1",
      { "content-type": "application/json" },
      {},
    );
    assert.equal(failed.status, 500);
    assert.deepEqual(JSON.parse(failed.body), injected(500));

    const lookup = await send(
      fake.origin,
      "erp.lookup_vendor@1",
      { "content-type": "application/json" },
      { vendor_name: "Globex" },
    );
    assert.equal(lookup.status, 200);
    assert.deepEqual(JSON.parse(lookup.body), LOOKUP_GLOBEX);

    const failedRecords = fake.calls({ ref: "erp.lookup_vendor@1" });
    assert.deepEqual(
      failedRecords.map((record) => record.status),
      [500, 200],
    );

    assert.doesNotThrow(() => fake.failNext("docs.fetch@1", 502, 5));
    assert.doesNotThrow(() => fake.failNext("docs.fetch@1", 429));
    const first = await send(
      fake.origin,
      "docs.fetch@1",
      { "content-type": "application/json" },
      { url: "u" },
    );
    assert.equal(first.status, 429);
    assert.deepEqual(JSON.parse(first.body), injected(429));
    const second = await send(
      fake.origin,
      "docs.fetch@1",
      { "content-type": "application/json" },
      { url: "u" },
    );
    assert.equal(second.status, 200);
    assert.deepEqual(JSON.parse(second.body), DOCS_U);
  } finally {
    await fake.close();
  }
});

test("C-bb5569bd a delay waits after the record is appended", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.setDelay("kb.search@1", 300));
    const started = performance.now();
    const reply = await send(
      fake.origin,
      "kb.search@1",
      { "content-type": "application/json" },
      { query: "q" },
    );
    const elapsed = performance.now() - started;

    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), { passages: [p1("q"), P2] });
    assert.ok(elapsed >= 280, `the delayed answer took ${String(elapsed)} ms`);

    const records = fake.calls({ ref: "kb.search@1" });
    assert.equal(records.length, 1);
    assert.equal(records[0]?.status, 200);
  } finally {
    await fake.close();
  }
});

test("C-bb5569bd a delayed call leaves its record and does not block another block", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.setDelay("kb.search@1", 30000));
    let settled = false;
    const pending = send(
      fake.origin,
      "kb.search@1",
      { "content-type": "application/json" },
      { query: "q" },
    );
    pending.then(
      () => {
        settled = true;
      },
      () => {
        settled = true;
      },
    );

    const docs = await send(
      fake.origin,
      "docs.fetch@1",
      { "content-type": "application/json" },
      { url: "u" },
    );
    assert.equal(docs.status, 200);
    assert.deepEqual(JSON.parse(docs.body), DOCS_U);

    await pollForRecord(fake);
    const records = fake.calls({ ref: "kb.search@1" });
    assert.equal(records.length, 1);
    assert.deepEqual(records[0]?.input, { query: "q" });
    assert.equal(records[0]?.status, 200);
    assert.equal(settled, false, "the 30 s call has not settled");
  } finally {
    await fake.close();
  }
});

test("C-bb5569bd knob arguments are checked", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.setDelay("mail.send@1", 0));

    const delayCases: readonly (readonly [string, number, string])[] = [
      ["nope@1", 1, "unknown block ref: nope@1"],
      ["__proto__", 1, "unknown block ref: __proto__"],
      ["mail.send@1", -1, "delay must be an integer from 0 to 30000"],
      ["mail.send@1", 30001, "delay must be an integer from 0 to 30000"],
      ["mail.send@1", 1.5, "delay must be an integer from 0 to 30000"],
    ];
    for (const [ref, ms, message] of delayCases) {
      assert.throws(
        () => fake.setDelay(ref, ms),
        (error: unknown) => {
          assert.ok(error instanceof RangeError, String(error));
          assert.equal(error.message, message);
          return true;
        },
        `${ref} ${String(ms)}`,
      );
    }

    assert.doesNotThrow(() => fake.failNext("mail.send@1", 500, 1));

    const failCases: readonly (readonly [string, number, number, string])[] = [
      ["nope@1", 500, 1, "unknown block ref: nope@1"],
      ["mail.send@1", 399, 1, "status must be an integer from 400 to 599"],
      ["mail.send@1", 600, 1, "status must be an integer from 400 to 599"],
      ["mail.send@1", 500, 0, "times must be an integer from 1 to 1000"],
      ["mail.send@1", 500, 1001, "times must be an integer from 1 to 1000"],
    ];
    for (const [ref, status, times, message] of failCases) {
      assert.throws(
        () => fake.failNext(ref, status, times),
        (error: unknown) => {
          assert.ok(error instanceof RangeError, String(error));
          assert.equal(error.message, message);
          return true;
        },
        `${ref} ${String(status)} ${String(times)}`,
      );
    }
  } finally {
    await fake.close();
  }
});
