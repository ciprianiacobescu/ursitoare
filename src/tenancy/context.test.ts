import assert from "node:assert/strict";
import { test } from "node:test";

import { TenancyError, hashRouteKey } from "./index.ts";

const ABC_SHA256 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
const E_ACUTE_SHA256 = "4a99557e4033c3539de2eb65472017cad5f9557f7a0625a09f1c3f6e2ba69c4c";

function assertInvalidRouteKey(key: string): void {
  assert.throws(
    () => hashRouteKey(key),
    (error: unknown) => {
      assert.ok(error instanceof TenancyError, "the error is a TenancyError");
      assert.equal(error.code, "TENANT_INVALID");
      assert.equal(error.message, "invalid route key");
      return true;
    },
  );
}

test("C-b9c4cf59 hashRouteKey returns the SHA-256 of the UTF-8 bytes", () => {
  assert.doesNotThrow(() => {
    const abc = hashRouteKey("abc");
    const eAcute = hashRouteKey("é");

    assert.ok(Buffer.isBuffer(abc));
    assert.equal(abc.length, 32);
    assert.equal(abc.toString("hex"), ABC_SHA256);

    assert.ok(Buffer.isBuffer(eAcute));
    assert.equal(eAcute.length, 32);
    assert.equal(eAcute.toString("hex"), E_ACUTE_SHA256);
  });
});

test("C-298c59fd hashRouteKey refuses empty ill-formed and over-long keys", () => {
  assert.doesNotThrow(() => {
    assertInvalidRouteKey("");
    assertInvalidRouteKey("\ud800");
    assertInvalidRouteKey("x".repeat(4097));

    const longest = hashRouteKey("x".repeat(4096));
    assert.equal(longest.length, 32);
  });
});
