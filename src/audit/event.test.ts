import assert from "node:assert/strict";
import { test } from "node:test";

import { AuditError } from "./errors.ts";
import { isSecretKeyName, validateEvent } from "./event.ts";
import type { AuditEventInput, ValidatedEvent } from "./event.ts";

const SECRET_MESSAGE = "payload key is named like a secret";

function asInput(value: unknown): AuditEventInput {
  return value as AuditEventInput;
}

function invalidEvent(reason: string) {
  return (error: unknown): boolean => {
    assert.ok(error instanceof AuditError, "the refusal is an AuditError");
    assert.equal(error.code, "AUDIT_EVENT_INVALID");
    assert.equal(error.details.reason, reason);
    return true;
  };
}

function expectEventInvalid(input: unknown, reason: string): void {
  assert.doesNotThrow(() => {
    assert.throws(() => validateEvent(asInput(input)), invalidEvent(reason));
  });
}

function expectSecret(input: unknown, depth: number): void {
  assert.doesNotThrow(() => {
    assert.throws(
      () => validateEvent(asInput(input)),
      (error: unknown) => {
        assert.ok(error instanceof AuditError, "the refusal is an AuditError");
        assert.equal(error.code, "AUDIT_PAYLOAD_SECRET");
        assert.equal(error.message, SECRET_MESSAGE, "the message names no key");
        assert.equal(error.details.depth, depth);
        return true;
      },
    );
  });
}

test("C-471c7ac3 validateEvent fills defaults for a minimal accepted input", () => {
  let result: ValidatedEvent | undefined;
  assert.doesNotThrow(() => {
    result = validateEvent({ eventType: "flow.published", actor: { kind: "user", id: "u_1" } });
  });
  assert.deepEqual(result, {
    eventType: "flow.published",
    actor: { kind: "user", id: "u_1" },
    target: null,
    payload: {},
    origin: "ursitoare",
    mkTraceId: null,
    mkRequestId: null,
    mkJti: null,
  });
});

test("C-471c7ac3 validateEvent carries mintkey trace fields through", () => {
  let result: ValidatedEvent | undefined;
  assert.doesNotThrow(() => {
    result = validateEvent({
      eventType: "flow.published",
      actor: { kind: "user", id: "u_1" },
      origin: "mintkey",
      mk: { traceId: "t", requestId: "r", jti: "j" },
    });
  });
  assert.deepEqual(result, {
    eventType: "flow.published",
    actor: { kind: "user", id: "u_1" },
    target: null,
    payload: {},
    origin: "mintkey",
    mkTraceId: "t",
    mkRequestId: "r",
    mkJti: "j",
  });
});

test("C-f2814e48 validateEvent refuses malformed shapes with a reason", () => {
  const base = { eventType: "flow.published", actor: { kind: "user", id: "u_1" } };
  const refused: ReadonlyArray<readonly [unknown, string]> = [
    [{ ...base, eventType: "Flow" }, "bad_event_type"],
    [{ ...base, eventType: `a${"b".repeat(64)}` }, "bad_event_type"],
    [{ ...base, actor: { kind: "admin", id: "u_1" } }, "bad_actor"],
    [{ ...base, actor: { kind: "user", id: "u".repeat(201) } }, "bad_actor"],
    [{ ...base, actor: { kind: "user", id: "a\nb" } }, "bad_actor"],
    [{ eventType: "flow.published" }, "bad_actor"],
    [{ ...base, extra: 1 }, "unknown_property"],
    [{ ...base, target: { kind: "role" } }, "bad_target"],
    [{ ...base, target: { kind: "Role", id: "r_1" } }, "bad_target"],
    [{ ...base, payload: [] }, "bad_payload"],
    [{ ...base, payload: null }, "bad_payload"],
    [{ ...base, origin: "other" }, "bad_origin"],
    [{ ...base, mk: { jti: "j" } }, "mk_without_mintkey"],
    [{ ...base, origin: "mintkey", mk: { trace: "t" } }, "bad_mk"],
    [{ ...base, origin: "mintkey", mk: { jti: "a b" } }, "bad_mk"],
    [{ ...base, payload: { a: "x".repeat(32761) } }, "payload_too_large"],
  ];

  for (const [input, reason] of refused) {
    expectEventInvalid(input, reason);
  }
});

test("C-f2814e48 validateEvent accepts a payload of exactly 32768 canonical bytes", () => {
  let result: ValidatedEvent | undefined;
  assert.doesNotThrow(() => {
    result = validateEvent({
      eventType: "flow.published",
      actor: { kind: "user", id: "u_1" },
      payload: { a: "x".repeat(32760) },
    });
  });
  assert.deepEqual(result?.payload, { a: "x".repeat(32760) });
});

test("C-f2814e48 validateEvent passes canonicalization failures through", () => {
  assert.doesNotThrow(() => {
    assert.throws(
      () => validateEvent({ eventType: "flow.published", actor: { kind: "user", id: "u_1" }, payload: { a: Number.NaN } }),
      (error: unknown) => {
        assert.ok(error instanceof AuditError, "the refusal is an AuditError");
        assert.equal(error.code, "AUDIT_CANONICAL_INVALID");
        assert.equal(error.details.reason, "nan");
        return true;
      },
    );
  });
});

test("C-a4f784d0 validateEvent refuses secret-like payload keys at any depth", () => {
  const base = { eventType: "flow.published", actor: { kind: "user", id: "u_1" } };
  for (const key of ["password", "Password", "clientSecret", "x_auth_token", "credentials", "tokens_used"]) {
    expectSecret({ ...base, payload: { [key]: "x" } }, 1);
  }
  expectSecret({ ...base, payload: { a: [{ "API-Key": 1 }] } }, 3);
});

test("C-a4f784d0 isSecretKeyName recognises only secret-like names", () => {
  const secret = ["password", "Password", "clientSecret", "x_auth_token", "credentials", "tokens_used"];
  const safe = ["passenger", "keyboard", "status", "author", "key", "monkey"];

  assert.doesNotThrow(() => {
    for (const key of secret) {
      assert.equal(isSecretKeyName(key), true, key);
    }
    for (const key of safe) {
      assert.equal(isSecretKeyName(key), false, key);
    }
  });
});

test("C-a4f784d0 validateEvent ignores secret-shaped values", () => {
  let result: ValidatedEvent | undefined;
  assert.doesNotThrow(() => {
    result = validateEvent({
      eventType: "flow.published",
      actor: { kind: "user", id: "u_1" },
      payload: { note: "password" },
    });
  });
  assert.deepEqual(result?.payload, { note: "password" });
});
