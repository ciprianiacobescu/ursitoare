import assert from "node:assert/strict";
import { createHmac, hkdfSync } from "node:crypto";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { decodeCursor, deriveCursorKey, encodeCursor } from "./cursor.ts";
import type { CursorKey, CursorPosition, CursorScope } from "./cursor.ts";

assert.equal(typeof deriveCursorKey, "function");
assert.equal(typeof encodeCursor, "function");
assert.equal(typeof decodeCursor, "function");

const ENGINE_TEXT = "k".repeat(64);
const CURSOR_INFO = "ursitoare/cursor";

interface EncodeClaims extends CursorScope {
  position: CursorPosition;
}

function keyFrom(text: string): CursorKey {
  let key: unknown;
  assert.doesNotThrow(() => {
    key = deriveCursorKey({ reveal: () => text });
  }, "deriveCursorKey");
  return key as CursorKey;
}

function encodeOf(key: CursorKey, claims: EncodeClaims): string {
  let cursor: unknown;
  assert.doesNotThrow(() => {
    cursor = encodeCursor(key, claims);
  }, "encodeCursor");
  return cursor as string;
}

function firstCharChanged(cursor: string): string {
  const first = cursor.charAt(0);
  const other = first === "a" ? "b" : "a";
  return other + cursor.slice(1);
}

function lastCharChanged(cursor: string): string {
  const last = cursor.charAt(cursor.length - 1);
  const other = last === "a" ? "b" : "a";
  return cursor.slice(0, -1) + other;
}

function forgedCursor(key: CursorKey): string {
  const payload = Buffer.from("not json", "utf8");
  const mac = createHmac("sha256", Buffer.from(key.bytes)).update(payload).digest();
  return Buffer.concat([payload, mac]).toString("base64url");
}

test("C-24ebf7a5 Round trip and key derivation", () => {
  let key: unknown;
  assert.doesNotThrow(() => {
    key = deriveCursorKey({ reveal: () => ENGINE_TEXT });
  }, "deriveCursorKey over a 64 character engine key");
  const cursorKey = key as CursorKey;

  const hkdf = Buffer.from(hkdfSync("sha256", ENGINE_TEXT, "", CURSOR_INFO, 32));
  assert.doesNotThrow(() => {
    assert.ok(Buffer.from(cursorKey.bytes).equals(hkdf), "the key bytes equal the HKDF derivation");
  }, "the derived key bytes are compared");

  const claims: EncodeClaims = {
    tenantId: "tenant_a",
    scope: "flows",
    position: ["2026-10-25T09:00:00.000Z", "f_1"],
  };
  let first: unknown;
  let second: unknown;
  assert.doesNotThrow(() => {
    first = encodeCursor(cursorKey, claims);
    second = encodeCursor(cursorKey, claims);
  }, "encodeCursor twice over the same claims");
  const firstCursor = first as string;
  const secondCursor = second as string;
  assert.ok(firstCursor.length > 0, "encoding produced a cursor");
  assert.equal(firstCursor, secondCursor, "encoding the same claims twice gives the same cursor");
  assert.match(firstCursor, /^[A-Za-z0-9_-]+$/, "the cursor is opaque base64url");

  const expect: CursorScope = { tenantId: "tenant_a", scope: "flows" };
  let decoded: unknown;
  assert.doesNotThrow(() => {
    decoded = decodeCursor(cursorKey, firstCursor, expect);
  }, "decodeCursor of the cursor just built");
  assert.deepEqual(decoded, ["2026-10-25T09:00:00.000Z", "f_1"]);

  let numeric: unknown;
  assert.doesNotThrow(() => {
    numeric = decodeCursor(cursorKey, encodeOf(cursorKey, { ...expect, position: [7] }), expect);
  }, "decodeCursor of the cursor of a numeric position");
  assert.deepEqual(numeric, [7]);
});

test("C-d9720128 Refused cursors", () => {
  const cursorKey = keyFrom(ENGINE_TEXT);
  const otherKey = keyFrom("j".repeat(64));
  const expect: CursorScope = { tenantId: "tenant_a", scope: "flows" };
  const claims: EncodeClaims = {
    tenantId: "tenant_a",
    scope: "flows",
    position: ["2026-10-25T09:00:00.000Z", "f_1"],
  };
  let valid: unknown;
  assert.doesNotThrow(() => {
    valid = encodeCursor(cursorKey, claims);
  }, "encodeCursor of a valid cursor to tamper with");
  const validCursor = valid as string;
  assert.ok(validCursor.length > 0, "a valid cursor was built");

  const cases: Array<{ name: string; cursor: string; key: CursorKey; expect: CursorScope }> = [
    { name: "a first character changed", cursor: firstCharChanged(validCursor), key: cursorKey, expect },
    { name: "a last character changed", cursor: lastCharChanged(validCursor), key: cursorKey, expect },
    { name: "another tenant", cursor: validCursor, key: cursorKey, expect: { tenantId: "tenant_b", scope: "flows" } },
    { name: "another scope", cursor: validCursor, key: cursorKey, expect: { tenantId: "tenant_a", scope: "runs" } },
    { name: "another engine key", cursor: validCursor, key: otherKey, expect },
    { name: "an empty string", cursor: "", key: cursorKey, expect },
    { name: "three exclamation marks", cursor: "!!!", key: cursorKey, expect },
    { name: "over 1024 characters", cursor: "a".repeat(1025), key: cursorKey, expect },
    { name: "a correct MAC over a non-JSON payload", cursor: forgedCursor(cursorKey), key: cursorKey, expect },
  ];

  for (const { name, cursor, key, expect: want } of cases) {
    assert.throws(
      () => {
        decodeCursor(key, cursor, want);
      },
      (error: unknown) => {
        if (!(error instanceof ApiError)) return false;
        assert.equal(error.status, 400, `decodeCursor(${name}) status`);
        assert.equal(error.code, "CURSOR_INVALID", `decodeCursor(${name}) code`);
        assert.equal(error.message, "Cursor is invalid", `decodeCursor(${name}) message`);
        assert.equal(error.details, undefined, `decodeCursor(${name}) carries no details`);
        return true;
      },
      `decodeCursor refuses ${name}`,
    );
  }
});

test("C-d8989560 Key material and claims are checked", () => {
  const cases: Array<{ name: string; call: () => unknown }> = [
    { name: "a missing engine key", call: () => { deriveCursorKey(null); } },
    { name: "a 31 character engine key", call: () => { deriveCursorKey({ reveal: () => "k".repeat(31) }); } },
    {
      name: "a reveal that throws",
      call: () => {
        deriveCursorKey({
          reveal: () => {
            throw new Error("reveal failed");
          },
        });
      },
    },
    {
      name: "an empty position",
      call: () => {
        encodeCursor(
          keyFrom(ENGINE_TEXT),
          { tenantId: "tenant_a", scope: "flows", position: [] },
        );
      },
    },
    {
      name: "a five entry position",
      call: () => {
        encodeCursor(
          keyFrom(ENGINE_TEXT),
          { tenantId: "tenant_a", scope: "flows", position: ["1", "2", "3", "4", "5"] },
        );
      },
    },
    {
      name: "a NaN position entry",
      call: () => {
        encodeCursor(keyFrom(ENGINE_TEXT), { tenantId: "tenant_a", scope: "flows", position: [NaN] });
      },
    },
    {
      name: "an overlong position entry",
      call: () => {
        encodeCursor(
          keyFrom(ENGINE_TEXT),
          { tenantId: "tenant_a", scope: "flows", position: ["x".repeat(257)] },
        );
      },
    },
    {
      name: "an empty scope",
      call: () => {
        encodeCursor(keyFrom(ENGINE_TEXT), { tenantId: "tenant_a", scope: "", position: [1] });
      },
    },
  ];

  for (const { name, call } of cases) {
    assert.throws(
      call,
      (error: unknown) => {
        if (!(error instanceof RangeError)) return false;
        assert.ok(
          !error.message.includes(ENGINE_TEXT),
          `no ${name} message contains the key text`,
        );
        return true;
      },
      `${name} throws a RangeError`,
    );
  }
});
