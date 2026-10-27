import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { test } from "node:test";

import { decodeJwt, signJwt, verifyRs256 } from "./jwt.ts";
import type { Jwk } from "./keys.ts";
import { FakeOidcError } from "./types.ts";

function rsaKey(): { privateKey: KeyObject; jwk: Jwk } {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const exported = publicKey.export({ format: "jwk" });
  return {
    privateKey,
    jwk: {
      kty: "RSA",
      use: "sig",
      alg: "RS256",
      kid: "kid-1",
      n: exported.n ?? "",
      e: exported.e ?? "",
    },
  };
}

function assertBadJwt(token: string): void {
  assert.throws(
    () => decodeJwt(token),
    (error: unknown) => {
      assert.ok(error instanceof FakeOidcError);
      assert.equal(error.code, "FAKE_OIDC_BAD_JWT");
      return true;
    },
  );
}

test("C-271f3bbf an RS256 token round trips and verifies with its JWK", () => {
  assert.doesNotThrow(() => {
    const { privateKey, jwk } = rsaKey();
    const token = signJwt({ sub: "alice" }, { alg: "RS256", kid: jwk.kid, privateKey });

    assert.equal(token.split(".").length, 3);
    const decoded = decodeJwt(token);
    assert.deepEqual(decoded.header, { alg: "RS256", typ: "JWT", kid: jwk.kid });
    assert.deepEqual(decoded.payload, { sub: "alice" });
    assert.ok(decoded.signature.length > 0);
    assert.equal(verifyRs256(token, jwk), true);
  });
});

test("C-4b89bf6e an alg none token has an empty signature and fails verifyRs256", () => {
  assert.doesNotThrow(() => {
    const { jwk } = rsaKey();
    const token = signJwt({ sub: "alice" }, { alg: "none" });
    const parts = token.split(".");

    assert.equal(parts.length, 3);
    assert.equal(parts[2], "");
    const decoded = decodeJwt(token);
    assert.deepEqual(decoded.header, { alg: "none", typ: "JWT" });
    assert.deepEqual(decoded.payload, { sub: "alice" });
    assert.equal(decoded.signature.length, 0);
    assert.equal(verifyRs256(token, jwk), false);
  });
});

test("C-4b89bf6e an HS256 token round trips and fails verifyRs256", () => {
  assert.doesNotThrow(() => {
    const { jwk } = rsaKey();
    const token = signJwt(
      { sub: "alice" },
      { alg: "HS256", kid: "kid-1", secret: "hs256-secret-value" },
    );
    const decoded = decodeJwt(token);

    assert.deepEqual(decoded.header, { alg: "HS256", typ: "JWT", kid: "kid-1" });
    assert.deepEqual(decoded.payload, { sub: "alice" });
    assert.equal(decoded.signature.length, 32);
    assert.equal(verifyRs256(token, jwk), false);
  });
});

test("C-4b89bf6e a changed payload or a corrupt modulus fails verifyRs256 without throwing", () => {
  assert.doesNotThrow(() => {
    const { privateKey, jwk } = rsaKey();
    const token = signJwt({ sub: "alice" }, { alg: "RS256", kid: jwk.kid, privateKey });
    const [header, , signature] = token.split(".");
    assert.equal(verifyRs256(token, jwk), true);

    const changedPayload = Buffer.from(JSON.stringify({ sub: "mallory" })).toString("base64url");
    const changed = [header, changedPayload, signature].join(".");
    assert.equal(verifyRs256(changed, jwk), false);

    const corrupt: Jwk = { ...jwk, n: "not-a-valid-modulus" };
    assert.doesNotThrow(() => {
      assert.equal(verifyRs256(token, corrupt), false);
    });
  });
});

test("C-4b89bf6e an unknown kid or a foreign key fails verifyRs256", () => {
  assert.doesNotThrow(() => {
    const current = rsaKey();
    const other = rsaKey();
    const valid = signJwt(
      { sub: "alice" },
      { alg: "RS256", kid: current.jwk.kid, privateKey: current.privateKey },
    );
    const unknownKid = signJwt(
      { sub: "alice" },
      { alg: "RS256", kid: "unknown-kid", privateKey: current.privateKey },
    );
    const foreignKey = signJwt(
      { sub: "alice" },
      { alg: "RS256", kid: current.jwk.kid, privateKey: other.privateKey },
    );

    assert.equal(verifyRs256(valid, current.jwk), true);
    assert.equal(decodeJwt(unknownKid).header["kid"], "unknown-kid");
    assert.equal(verifyRs256(unknownKid, current.jwk), false);
    assert.equal(decodeJwt(foreignKey).header["kid"], current.jwk.kid);
    assert.equal(verifyRs256(foreignKey, current.jwk), false);
  });
});

test("decodeJwt rejects tokens without exactly three parts", () => {
  for (const token of ["a.b", "a.b.c.d", ""]) {
    assertBadJwt(token);
  }
});

test("decodeJwt rejects malformed base64url and non JSON parts", () => {
  for (const token of ["%%%%.@@@@.####", "a.b.c", "eyJhbGciOiJub25lIn0.!!!.sig"]) {
    assertBadJwt(token);
  }
});

test("FakeOidcError keeps its code message and cause", () => {
  assert.doesNotThrow(() => {
    const cause = new Error("boom");
    const error = new FakeOidcError("FAKE_OIDC_BAD_JWT", "bad token", { cause });

    assert.ok(error instanceof Error);
    assert.ok(error instanceof FakeOidcError);
    assert.equal(error.code, "FAKE_OIDC_BAD_JWT");
    assert.equal(error.message, "bad token");
    assert.equal(error.cause, cause);
  });
});
