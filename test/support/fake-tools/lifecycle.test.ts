import assert from "node:assert/strict";
import http from "node:http";
import net from "node:net";
import { test } from "node:test";

import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

const MAIL_A = { to: "a@x.test", subject: "s", body: "b" };
const MAIL_MESSAGE = { message_id: "msg-f58a35b6ca" };
const GET_OUTPUT = { status: 200, body: "GET u -> ok" };
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

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function post(
  base: string,
  ref: string,
  input: unknown,
  headers: http.OutgoingHttpHeaders = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      {
        host: url.hostname,
        port: url.port,
        method: "POST",
        path: `/blocks/${ref}`,
        headers: { "content-type": "application/json", ...headers },
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

async function pollForRecords(fake: FakeTools, count: number): Promise<void> {
  const startedAt = performance.now();
  while (fake.calls().length < count) {
    if (performance.now() - startedAt >= 5000) {
      assert.fail(`fewer than ${String(count)} records were appended within 5000 ms`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function within<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`${label} did not settle within ${String(ms)} ms`));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

function connectionCode(base: string): Promise<string> {
  const url = new URL(base);
  return new Promise((resolve) => {
    const socket = net.createConnection({ host: url.hostname, port: Number(url.port) });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      resolve(error.code ?? "none");
    });
    socket.once("connect", () => {
      socket.destroy();
      resolve("connected");
    });
  });
}

test("C-52efd685 reset clears the records, delays, failures and idempotency and close is idempotent", async () => {
  const fake = await start();
  try {
    const seeded = await post(fake.origin, "mail.send@1", MAIL_A, {
      "idempotency-key": "ik-03",
    });
    assert.equal(seeded.status, 200);
    assert.deepEqual(JSON.parse(seeded.body), MAIL_MESSAGE);
    assert.equal(seeded.headers["x-fake-tools-duplicate"], "false");

    assert.doesNotThrow(() => fake.setDelay("docs.fetch@1", 30000));
    assert.doesNotThrow(() => fake.failNext("http.get@1", 500));

    assert.doesNotThrow(() => fake.reset());
    assert.deepEqual(fake.calls(), [], "reset empties the records");

    const docs = await fetch(`${fake.origin}/blocks/docs.fetch@1`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ url: "u" }),
      signal: AbortSignal.timeout(5000),
    });
    assert.equal(docs.status, 200);
    assert.deepEqual(await docs.json(), DOCS_U);

    const get = await post(fake.origin, "http.get@1", { url: "u" });
    assert.equal(get.status, 200);
    assert.deepEqual(JSON.parse(get.body), GET_OUTPUT);

    const mail = await post(fake.origin, "mail.send@1", MAIL_A, {
      "idempotency-key": "ik-03",
    });
    assert.equal(mail.status, 200);
    assert.deepEqual(JSON.parse(mail.body), MAIL_MESSAGE);
    assert.equal(mail.headers["x-fake-tools-duplicate"], "false");

    const after = fake.calls();
    assert.deepEqual(
      after.map((record) => record.seq),
      [1, 2, 3],
    );
    assert.deepEqual(
      after.map((record) => record.ref),
      ["docs.fetch@1", "http.get@1", "mail.send@1"],
    );
    assert.deepEqual(
      after.map((record) => record.duplicate),
      [false, false, false],
    );
    assert.equal(after[2]?.idempotencyKey, "ik-03");

    assert.doesNotThrow(() => fake.setDelay("mail.send@1", 30000));
    const pending = post(fake.origin, "mail.send@1", MAIL_A, {
      "idempotency-key": "ik-pend",
    });
    const pendingOutcome: Promise<unknown> = pending.then(
      () => undefined,
      (error: unknown) => error,
    );

    await pollForRecords(fake, 4);
    const pendingRecord = fake.calls()[3];
    assert.ok(pendingRecord !== undefined);
    assert.equal(pendingRecord.idempotencyKey, "ik-pend");
    assert.equal(pendingRecord.status, 200);
    assert.equal(pendingRecord.seq, 4);

    await within(Promise.all([fake.close(), fake.close()]), 5000, "close");

    const outcome = await pendingOutcome;
    assert.ok(outcome instanceof Error, "the pending request fails with a connection error");
    assert.equal(
      typeof (outcome as NodeJS.ErrnoException).code,
      "string",
      "the failure is a connection error",
    );

    assert.equal(fake.calls().length, 4, "calls() works after close");
    assert.equal(await connectionCode(fake.origin), "ECONNREFUSED");
  } finally {
    await fake.close();
  }
});

test("C-0a3c42a7 a reset leaves a request that is waiting in a delay running", async () => {
  const fake = await start();
  try {
    assert.doesNotThrow(() => fake.setDelay("kb.search@1", 300));
    const pending = post(fake.origin, "kb.search@1", { query: "q" });

    await pollForRecords(fake, 1);
    const record = fake.calls()[0];
    assert.ok(record !== undefined);
    assert.equal(record.ref, "kb.search@1");
    assert.equal(record.status, 200);

    assert.doesNotThrow(() => fake.reset());

    const reply = await pending;
    assert.equal(reply.status, 200);
    assert.deepEqual(JSON.parse(reply.body), { passages: [p1("q"), P2] });
    assert.deepEqual(fake.calls(), []);
  } finally {
    await fake.close();
  }
});
