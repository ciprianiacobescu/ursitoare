import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

const MAIL_A = { to: "a@x.test", subject: "s", body: "b" };
const MAIL_B = { to: "z@x.test", subject: "other", body: "c" };
const LOOKUP_GLOBEX = { vendor_id: "V-GLOBEX", status: "active", payment_terms_days: 45 };
const PAYMENT = { payment_id: "PAY-57819766", status: "created" };
const MISSING_KEY = {
  error: "missing_idempotency_key",
  message: "mail.send@1 has effect=send; send an Idempotency-Key header",
};

interface EffectRow {
  ref: string;
  input: unknown;
  key: string | null;
  status: number;
  body: unknown;
  duplicate: boolean | null;
}

const ROWS: readonly EffectRow[] = [
  {
    ref: "mail.send@1",
    input: MAIL_A,
    key: null,
    status: 400,
    body: MISSING_KEY,
    duplicate: null,
  },
  {
    ref: "mail.send@1",
    input: MAIL_A,
    key: "",
    status: 400,
    body: MISSING_KEY,
    duplicate: null,
  },
  {
    ref: "mail.send@1",
    input: MAIL_A,
    key: "ik-03",
    status: 200,
    body: { message_id: "msg-f58a35b6ca" },
    duplicate: false,
  },
  {
    ref: "mail.send@1",
    input: MAIL_B,
    key: "ik-03",
    status: 200,
    body: { message_id: "msg-f58a35b6ca" },
    duplicate: true,
  },
  {
    ref: "mail.send@1",
    input: MAIL_A,
    key: "ik-04",
    status: 200,
    body: { message_id: "msg-a1ce271bb3" },
    duplicate: false,
  },
  {
    ref: "slack.post_message@1",
    input: { channel: "#ap", text: "hi" },
    key: "ik-03",
    status: 200,
    body: { ts: "1760000000.062858" },
    duplicate: false,
  },
  {
    ref: "erp.lookup_vendor@1",
    input: { vendor_name: "Globex" },
    key: "ik-r",
    status: 200,
    body: LOOKUP_GLOBEX,
    duplicate: false,
  },
  {
    ref: "erp.lookup_vendor@1",
    input: { vendor_name: "Globex" },
    key: "ik-r",
    status: 200,
    body: LOOKUP_GLOBEX,
    duplicate: false,
  },
  {
    ref: "erp.create_payment@1",
    input: { vendor_id: "V-ACME", amount: 2450, currency: "EUR", reference: "INV-1001" },
    key: "ik-01",
    status: 200,
    body: PAYMENT,
    duplicate: false,
  },
  {
    ref: "erp.create_payment@1",
    input: { vendor_id: "V-ACME", amount: 1, currency: "USD", reference: "x" },
    key: "ik-01",
    status: 200,
    body: PAYMENT,
    duplicate: true,
  },
];

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

test("C-e3f31840 effects need a key and replay under it", async () => {
  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the fake started");
  const fake: FakeTools = started;
  try {
    const replies: Reply[] = [];
    for (const row of ROWS) {
      const headers: http.OutgoingHttpHeaders = { "content-type": "application/json" };
      if (row.key !== null) {
        headers["idempotency-key"] = row.key;
      }
      replies.push(
        await post(fake.origin, `/blocks/${row.ref}`, headers, JSON.stringify(row.input)),
      );
    }

    const calls = fake.calls();
    assert.equal(calls.length, ROWS.length, "one record per request");

    for (let index = 0; index < ROWS.length; index += 1) {
      const row = ROWS[index];
      assert.ok(row !== undefined);
      const reply = replies[index];
      assert.ok(reply !== undefined);
      const record = calls[index];
      assert.ok(record !== undefined);

      assert.equal(reply.status, row.status, `${row.ref}: status of row ${String(index + 1)}`);
      assert.deepEqual(
        JSON.parse(reply.body),
        row.body,
        `${row.ref}: answer of row ${String(index + 1)}`,
      );
      if (row.duplicate === null) {
        assert.equal(
          reply.headers["x-fake-tools-duplicate"],
          undefined,
          `${row.ref}: no duplicate header on row ${String(index + 1)}`,
        );
      } else {
        assert.equal(
          reply.headers["x-fake-tools-duplicate"],
          String(row.duplicate),
          `${row.ref}: duplicate header of row ${String(index + 1)}`,
        );
      }

      assert.equal(record.seq, index + 1, "records are in seq order");
      assert.equal(record.ref, row.ref);
      assert.equal(record.status, row.status, `${row.ref}: record status of row ${String(index + 1)}`);
      assert.equal(
        record.idempotencyKey,
        row.key,
        `${row.ref}: record key of row ${String(index + 1)}`,
      );
      assert.equal(
        record.duplicate,
        row.duplicate ?? false,
        `${row.ref}: record duplicate of row ${String(index + 1)}`,
      );
    }

    const replay = calls[3];
    assert.ok(replay !== undefined);
    assert.deepEqual(replay.input, MAIL_B, "the replay records its own input");
  } finally {
    await fake.close();
  }
});
