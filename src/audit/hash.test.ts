import assert from "node:assert/strict";
import { test } from "node:test";

import { AuditError } from "./errors.ts";
import { GENESIS_HASH, canonicalEvent, chainHash, formatAt } from "./hash.ts";
import type { AuditRecord } from "./hash.ts";

const REC1: AuditRecord = {
  tenantId: "tenant_a",
  seq: 1n,
  at: "2031-03-31T23:59:59.999000Z",
  eventType: "role.granted",
  actor: { kind: "user", id: "u_1" },
  target: { kind: "role", id: "r_1" },
  payload: { b: 2, a: [true, null, "x"] },
  origin: "ursitoare",
  mkTraceId: null,
  mkRequestId: null,
  mkJti: null,
};

const REC2: AuditRecord = {
  ...REC1,
  seq: 2n,
  at: "2031-04-01T00:00:00.000000Z",
  eventType: "role.revoked",
  target: null,
  payload: {},
};

const REC1_CANONICAL = `{"actor":{"id":"u_1","kind":"user"},"at":"2031-03-31T23:59:59.999000Z","event_type":"role.granted","mk_jti":null,"mk_request_id":null,"mk_trace_id":null,"origin":"ursitoare","payload":{"a":[true,null,"x"],"b":2},"seq":"1","target":{"id":"r_1","kind":"role"},"tenant_id":"tenant_a"}`;

const H1 = "e5caec3c92a401f239da239f26e6c80667b7a248911d7bda158e4ecf12b6dd6a";
const H2 = "e5ca9b276e1c75a899eaa2f727725768ba7c5eb54c9829bd496d79da6697c7e0";

function isEventInvalid(reason: string) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof AuditError, "the refusal is an AuditError");
    assert.equal(error.code, "AUDIT_EVENT_INVALID");
    assert.equal(error.details.reason, reason);
    return true;
  };
}

test("C-cbcb0ebb canonicalEvent writes the whole event in RFC 8785 order", () => {
  let text = "";
  assert.doesNotThrow(() => {
    text = canonicalEvent(REC1);
  });
  assert.equal(text, REC1_CANONICAL);
  assert.equal(GENESIS_HASH.length, 32);
  assert.ok(GENESIS_HASH.equals(Buffer.alloc(32)), "GENESIS_HASH holds 32 zero bytes");
});

test("C-cbcb0ebb chainHash hashes prevHash and the canonical event", () => {
  let h1: Buffer = Buffer.alloc(0);
  let h2: Buffer = Buffer.alloc(0);
  assert.doesNotThrow(() => {
    h1 = chainHash(GENESIS_HASH, REC1);
    h2 = chainHash(h1, REC2);
  });
  assert.equal(h1.toString("hex"), H1);
  assert.equal(h2.toString("hex"), H2);
});

test("C-c65f6066 chainHash refuses a prevHash that is not 32 bytes", () => {
  assert.throws(
    () => chainHash(Buffer.alloc(31), REC1),
    isEventInvalid("bad_prev_hash"),
  );
});

test("C-c65f6066 chainHash refuses an at without six fraction digits", () => {
  const badAt: AuditRecord = { ...REC1, at: "2031-03-31T23:59:59.999Z" };
  assert.throws(() => chainHash(GENESIS_HASH, badAt), isEventInvalid("bad_at"));
});

test("C-c65f6066 formatAt writes the instant with six fraction digits", () => {
  let text = "";
  assert.doesNotThrow(() => {
    text = formatAt(new Date("2031-03-31T23:59:59.999Z"));
  });
  assert.equal(text, "2031-03-31T23:59:59.999000Z");
});

test("C-c65f6066 formatAt refuses an invalid date and a date in 1969", () => {
  assert.throws(() => formatAt(new Date(Number.NaN)), isEventInvalid("bad_at"));
  assert.throws(() => formatAt(new Date("1969-12-31T23:59:59.999Z")), isEventInvalid("bad_at"));
});
