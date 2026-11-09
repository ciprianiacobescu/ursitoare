import assert from "node:assert/strict";
import http from "node:http";
import { test } from "node:test";

import type { FakeTools } from "./index.ts";
import { startFakeTools } from "./index.ts";

const D_EMPTY = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
const D_OBJ = "44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a";
const D_WS = "e16f1596201850fd4a63680b27f603cb64e67176159be3d8ed78a4403fdb1700";

const LOOKUP = "/blocks/erp.lookup_vendor@1";
const MAIL_A = { to: "a@x.test", subject: "s", body: "b" };
const MAIL_B = { to: "z@x.test", subject: "other", body: "c" };
const MISSING_KEY = {
  error: "missing_idempotency_key",
  message: "mail.send@1 has effect=send; send an Idempotency-Key header",
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

function pad(bytes: number): string {
  return `{"vendor_name":"${"a".repeat(bytes - 18)}"}`;
}

function invalidInput(ref: string, path: string, keyword: string): unknown {
  return { error: "invalid_input", block: ref, details: [{ path, keyword }] };
}

interface Reply {
  status: number;
  headers: http.IncomingHttpHeaders;
  body: string;
}

function request(
  base: string,
  method: string,
  path: string,
  headers: http.OutgoingHttpHeaders,
  body: string,
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    const url = new URL(base);
    const req = http.request(
      { host: url.hostname, port: url.port, method, path, headers, agent: false },
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

interface RecordExpectation {
  ref: string;
  status: number;
  path: string;
  host: "tools.fake.test" | "local";
  input?: unknown;
  idempotencyKey?: string | null;
  bodySha256?: string;
}

interface Row {
  label: string;
  method: "GET" | "POST";
  path: string;
  headers?: http.OutgoingHttpHeaders;
  body?: string;
  status: number;
  answer: unknown;
  responseHeaders?: Record<string, string>;
  record?: RecordExpectation;
}

const ROWS: readonly Row[] = [
  {
    label: "R1",
    method: "POST",
    path: "/blocks/nope@1",
    body: "{}",
    status: 404,
    answer: { error: "unknown_block", block: "nope@1" },
  },
  {
    label: "R2",
    method: "POST",
    path: "/blocks/__proto__",
    body: "{}",
    status: 404,
    answer: { error: "unknown_block", block: "__proto__" },
  },
  {
    label: "R3",
    method: "POST",
    path: "/blocks/toString",
    body: "{}",
    status: 404,
    answer: { error: "unknown_block", block: "toString" },
  },
  {
    label: "R4",
    method: "POST",
    path: "/blocks/%E0%A4%A",
    body: "{}",
    status: 404,
    answer: { error: "unknown_block", block: "%E0%A4%A" },
  },
  {
    label: "R5",
    method: "POST",
    path: "/blocks/",
    body: "{}",
    status: 404,
    answer: { error: "unknown_block", block: "" },
  },
  {
    label: "R6",
    method: "POST",
    path: "/health",
    body: "{}",
    status: 404,
    answer: { error: "not_found" },
  },
  {
    label: "R7",
    method: "POST",
    path: "/blocks",
    body: "{}",
    status: 404,
    answer: { error: "not_found" },
  },
  {
    label: "R8",
    method: "GET",
    path: LOOKUP,
    status: 405,
    answer: { error: "method_not_allowed" },
    responseHeaders: { allow: "POST" },
  },
  {
    label: "R9",
    method: "POST",
    path: LOOKUP,
    headers: { host: "other.fake.test" },
    body: "{}",
    status: 421,
    answer: { error: "misdirected_request" },
  },
  {
    label: "R10",
    method: "POST",
    path: LOOKUP,
    headers: { host: "tools.fake.test:443" },
    body: "{}",
    status: 421,
    answer: { error: "misdirected_request" },
  },
  {
    label: "R11",
    method: "POST",
    path: LOOKUP,
    headers: { host: "TOOLS.FAKE.TEST" },
    body: JSON.stringify({ vendor_name: "Globex" }),
    status: 200,
    answer: { vendor_id: "V-GLOBEX", status: "active", payment_terms_days: 45 },
    record: {
      ref: "erp.lookup_vendor@1",
      status: 200,
      path: LOOKUP,
      host: "tools.fake.test",
      input: { vendor_name: "Globex" },
    },
  },
  {
    label: "R12",
    method: "POST",
    path: LOOKUP,
    body: "{",
    status: 400,
    answer: { error: "invalid_json" },
  },
  {
    label: "R13",
    method: "POST",
    path: LOOKUP,
    body: "",
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/", "required"),
    record: {
      ref: "erp.lookup_vendor@1",
      status: 400,
      path: LOOKUP,
      host: "local",
      input: {},
      bodySha256: D_EMPTY,
    },
  },
  {
    label: "R14",
    method: "POST",
    path: LOOKUP,
    body: "[]",
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/", "type"),
    record: {
      ref: "erp.lookup_vendor@1",
      status: 400,
      path: LOOKUP,
      host: "local",
      input: [],
    },
  },
  {
    label: "R15",
    method: "POST",
    path: LOOKUP,
    body: "null",
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/", "type"),
    record: {
      ref: "erp.lookup_vendor@1",
      status: 400,
      path: LOOKUP,
      host: "local",
      input: null,
    },
  },
  {
    label: "R16",
    method: "POST",
    path: LOOKUP,
    body: JSON.stringify({ vendor_name: 5 }),
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/vendor_name", "type"),
    record: {
      ref: "erp.lookup_vendor@1",
      status: 400,
      path: LOOKUP,
      host: "local",
      input: { vendor_name: 5 },
    },
  },
  {
    label: "R17",
    method: "POST",
    path: "/blocks/crm.create_ticket@1",
    headers: { "idempotency-key": "k" },
    body: JSON.stringify({
      customer_id: "C",
      subject: "s",
      priority: "urgent!",
      body: "b",
    }),
    status: 400,
    answer: invalidInput("crm.create_ticket@1", "/priority", "enum"),
    record: {
      ref: "crm.create_ticket@1",
      status: 400,
      path: "/blocks/crm.create_ticket@1",
      host: "local",
    },
  },
  {
    label: "R18",
    method: "POST",
    path: "/blocks/calendar.find_slots@1",
    body: JSON.stringify({ attendees: [1], duration_minutes: 30 }),
    status: 400,
    answer: invalidInput("calendar.find_slots@1", "/attendees/0", "type"),
    record: {
      ref: "calendar.find_slots@1",
      status: 400,
      path: "/blocks/calendar.find_slots@1",
      host: "local",
    },
  },
  {
    label: "R19",
    method: "POST",
    path: "/blocks/mail.send@1",
    body: "{}",
    status: 400,
    answer: MISSING_KEY,
    record: {
      ref: "mail.send@1",
      status: 400,
      path: "/blocks/mail.send@1",
      host: "local",
      input: {},
      idempotencyKey: null,
      bodySha256: D_OBJ,
    },
  },
  {
    label: "R20",
    method: "POST",
    path: "/blocks/mail.send@1",
    headers: { "idempotency-key": "k" },
    body: "{}",
    status: 400,
    answer: invalidInput("mail.send@1", "/", "required"),
    record: {
      ref: "mail.send@1",
      status: 400,
      path: "/blocks/mail.send@1",
      host: "local",
      input: {},
      idempotencyKey: "k",
    },
  },
  {
    label: "R21",
    method: "POST",
    path: LOOKUP,
    body: pad(1048576),
    status: 200,
    answer: {
      vendor_id: `V-${"A".repeat(16)}`,
      status: "active",
      payment_terms_days: 30,
    },
    record: {
      ref: "erp.lookup_vendor@1",
      status: 200,
      path: LOOKUP,
      host: "local",
    },
  },
  {
    label: "R22",
    method: "POST",
    path: LOOKUP,
    body: pad(1048577),
    status: 413,
    answer: { error: "body_too_large" },
  },
  {
    label: "R23",
    method: "POST",
    path: "/blocks/nope@1",
    body: pad(1048577),
    status: 404,
    answer: { error: "unknown_block", block: "nope@1" },
  },
  {
    label: "R24",
    method: "POST",
    path: LOOKUP,
    body: " \n",
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/", "required"),
    record: {
      ref: "erp.lookup_vendor@1",
      status: 400,
      path: LOOKUP,
      host: "local",
      input: {},
      bodySha256: D_WS,
    },
  },
];

interface NonStrictRow {
  label: string;
  path: string;
  body: string;
  status: number;
  answer: unknown;
}

const NON_STRICT_ROWS: readonly NonStrictRow[] = [
  {
    label: "N1",
    path: LOOKUP,
    body: "{}",
    status: 200,
    answer: { vendor_id: "V-UNKNOWN", status: "active", payment_terms_days: 30 },
  },
  {
    label: "N2",
    path: LOOKUP,
    body: "[]",
    status: 400,
    answer: invalidInput("erp.lookup_vendor@1", "/", "type"),
  },
  {
    label: "N3",
    path: LOOKUP,
    body: JSON.stringify({ vendor_name: 5 }),
    status: 200,
    answer: { vendor_id: "V-5", status: "active", payment_terms_days: 30 },
  },
  {
    label: "N4",
    path: "/blocks/crm.find_customer@1",
    body: "{}",
    status: 200,
    answer: { customer_id: "C-EB045D", name: "undefined", tier: "silver" },
  },
  {
    label: "N5",
    path: "/blocks/crm.find_customer@1",
    body: JSON.stringify({ email: 5 }),
    status: 200,
    answer: { customer_id: "C-EF2D12", name: "5", tier: "bronze" },
  },
  {
    label: "N6",
    path: "/blocks/crm.find_customer@1",
    body: JSON.stringify({ email: "nobody" }),
    status: 200,
    answer: { customer_id: "C-6382B3", name: "nobody", tier: "gold" },
  },
  {
    label: "N7",
    path: "/blocks/kb.search@1",
    body: JSON.stringify({ query: "q", top_k: "x" }),
    status: 200,
    answer: { passages: [p1("q"), P2] },
  },
  {
    label: "N8",
    path: LOOKUP,
    body: JSON.stringify({ vendor_name: { toString: 5 } }),
    status: 200,
    answer: {
      vendor_id: "V--TOSTRING-5-",
      status: "active",
      payment_terms_days: 30,
    },
  },
];

test("C-94d60756 refusals come first and only parseable calls to known blocks are recorded", async () => {
  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the strict fake started");
  const fake: FakeTools = started;
  try {
    const port = new URL(fake.origin).port;
    const replies: Reply[] = [];
    for (const row of ROWS) {
      const headers: http.OutgoingHttpHeaders = {
        "content-type": "application/json",
        ...(row.headers ?? {}),
      };
      replies.push(await request(fake.origin, row.method, row.path, headers, row.body ?? ""));
    }

    for (let index = 0; index < ROWS.length; index += 1) {
      const row = ROWS[index];
      assert.ok(row !== undefined);
      const reply = replies[index];
      assert.ok(reply !== undefined);
      assert.equal(reply.status, row.status, `${row.label}: status`);
      assert.deepEqual(JSON.parse(reply.body), row.answer, `${row.label}: body`);
      for (const [name, value] of Object.entries(row.responseHeaders ?? {})) {
        assert.equal(reply.headers[name.toLowerCase()], value, `${row.label}: header ${name}`);
      }
    }

    const expected = ROWS.flatMap((row) => (row.record === undefined ? [] : [row.record]));
    const records = fake.calls();
    assert.equal(records.length, 11, "exactly the 11 recording rows are recorded");
    assert.equal(records.length, expected.length);
    for (let index = 0; index < expected.length; index += 1) {
      const wanted = expected[index];
      const record = records[index];
      assert.ok(wanted !== undefined);
      assert.ok(record !== undefined);
      assert.equal(record.seq, index + 1, "records are in seq order");
      assert.equal(record.ref, wanted.ref, `record ${String(index + 1)}: ref`);
      assert.equal(record.status, wanted.status, `record ${String(index + 1)}: status`);
      assert.equal(record.method, "POST", `record ${String(index + 1)}: method`);
      assert.equal(record.path, wanted.path, `record ${String(index + 1)}: path`);
      assert.equal(
        record.host,
        wanted.host === "tools.fake.test" ? "tools.fake.test" : `127.0.0.1:${port}`,
        `record ${String(index + 1)}: host`,
      );
      if ("input" in wanted) {
        assert.deepEqual(record.input, wanted.input, `record ${String(index + 1)}: input`);
      }
      if ("idempotencyKey" in wanted) {
        assert.equal(
          record.idempotencyKey,
          wanted.idempotencyKey,
          `record ${String(index + 1)}: idempotencyKey`,
        );
      }
      if (wanted.bodySha256 !== undefined) {
        assert.equal(
          record.bodySha256,
          wanted.bodySha256,
          `record ${String(index + 1)}: bodySha256`,
        );
      }
    }
  } finally {
    await fake.close();
  }

  let loose: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    loose = await startFakeTools({ strict: false });
  });
  assert.ok(loose !== undefined, "the non-strict fake started");
  const nonStrict: FakeTools = loose;
  try {
    for (const row of NON_STRICT_ROWS) {
      const reply = await request(
        nonStrict.origin,
        "POST",
        row.path,
        { "content-type": "application/json" },
        row.body,
      );
      assert.equal(reply.status, row.status, `${row.label}: status`);
      assert.deepEqual(JSON.parse(reply.body), row.answer, `${row.label}: body`);
    }
    assert.equal(nonStrict.calls().length, NON_STRICT_ROWS.length, "one record per non-strict row");
  } finally {
    await nonStrict.close();
  }
});

test("C-dd5140b9 a replay with invalid input is refused and the kept output stays", async () => {
  let started: FakeTools | undefined;
  await assert.doesNotReject(async () => {
    started = await startFakeTools();
  });
  assert.ok(started !== undefined, "the fake started");
  const fake: FakeTools = started;
  try {
    const send = (input: unknown, key: string): Promise<Reply> =>
      request(
        fake.origin,
        "POST",
        "/blocks/mail.send@1",
        { "content-type": "application/json", "idempotency-key": key },
        JSON.stringify(input),
      );

    const first = await send(MAIL_A, "ik-03");
    assert.equal(first.status, 200);
    assert.deepEqual(JSON.parse(first.body), { message_id: "msg-f58a35b6ca" });
    assert.equal(first.headers["x-fake-tools-duplicate"], "false");

    const replay = await send(MAIL_B, "ik-03");
    assert.equal(replay.status, 200);
    assert.deepEqual(JSON.parse(replay.body), { message_id: "msg-f58a35b6ca" });
    assert.equal(replay.headers["x-fake-tools-duplicate"], "true");

    const invalid = await send({}, "ik-03");
    assert.equal(invalid.status, 400);
    assert.deepEqual(
      JSON.parse(invalid.body),
      invalidInput("mail.send@1", "/", "required"),
      "the replay with invalid input is refused with details",
    );
    assert.equal(
      invalid.headers["x-fake-tools-duplicate"],
      undefined,
      "the refusal is not a replay",
    );

    const after = await send(MAIL_A, "ik-03");
    assert.equal(after.status, 200);
    assert.deepEqual(JSON.parse(after.body), { message_id: "msg-f58a35b6ca" });
    assert.equal(after.headers["x-fake-tools-duplicate"], "true");

    const records = fake.calls();
    assert.equal(records.length, 4, "four records");
    for (let index = 0; index < records.length; index += 1) {
      assert.equal(records[index]?.seq, index + 1);
    }
    const refused = records[2];
    assert.ok(refused !== undefined);
    assert.equal(refused.status, 400);
    assert.equal(refused.idempotencyKey, "ik-03");
    assert.equal(refused.duplicate, false);
    assert.deepEqual(refused.input, {});
  } finally {
    await fake.close();
  }
});
