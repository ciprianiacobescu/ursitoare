import assert from "node:assert/strict";
import { test } from "node:test";

import { anchorMac } from "./index.ts";

const KEY = { reveal: () => "ab".repeat(32) };
const HASH = "11".repeat(32);

test("C-23b4c80c anchorMac matches the known answer", () => {
  let mac = "";
  assert.doesNotThrow(() => {
    mac = anchorMac(KEY, "tenant_a", 7n, HASH);
  });
  assert.equal(mac, "75e40e238fb7716ade17ca9f16112c4bd05adbcdcda2e358567cfc2ae3227328");
});

test("C-23b4c80c anchorMac depends on the tenant", () => {
  let base = "";
  let other = "";
  assert.doesNotThrow(() => {
    base = anchorMac(KEY, "tenant_a", 7n, HASH);
    other = anchorMac(KEY, "tenant_b", 7n, HASH);
  });
  assert.notEqual(base, "");
  assert.notEqual(base, other);
});

test("C-9a188adc anchorMac refuses a bad hash and a bad seq", () => {
  assert.throws(() => anchorMac(KEY, "tenant_a", 7n, "AB".repeat(32)), {
    code: "AUDIT_OPTIONS_INVALID",
    details: { reason: "bad_hash" },
  });
  assert.throws(() => anchorMac(KEY, "tenant_a", 0n, HASH), {
    code: "AUDIT_OPTIONS_INVALID",
    details: { reason: "bad_seq" },
  });
});

test("C-9a188adc anchorMac refuses short and unreadable keys", () => {
  assert.throws(() => anchorMac({ reveal: () => "a".repeat(31) }, "tenant_a", 1n, HASH), {
    code: "AUDIT_ANCHOR_KEY_INVALID",
    details: { reason: "too_short" },
  });
  assert.throws(
    () =>
      anchorMac(
        {
          reveal: () => {
            throw new Error("boom");
          },
        },
        "tenant_a",
        1n,
        HASH,
      ),
    { code: "AUDIT_ANCHOR_KEY_INVALID", details: { reason: "invalid" } },
  );
});
