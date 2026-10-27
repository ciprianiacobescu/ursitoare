import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { signJwt, verifyRs256 } from "./jwt.ts";
import { createKeyRing } from "./keys.ts";
import type { Jwk } from "./keys.ts";

function thumbprint(jwk: Jwk): string {
  const canonical = JSON.stringify({ e: jwk.e, kty: jwk.kty, n: jwk.n });
  return createHash("sha256").update(canonical).digest("base64url");
}

test("C-a715e6d5 the current key is an RS256 signing key whose kid is the RFC 7638 thumbprint", () => {
  assert.doesNotThrow(() => {
    const ring = createKeyRing();
    const key = ring.current();

    assert.equal(key.jwk.kty, "RSA");
    assert.equal(key.jwk.use, "sig");
    assert.equal(key.jwk.alg, "RS256");
    assert.ok(key.jwk.kid.length > 0);
    assert.ok(key.jwk.n.length > 0);
    assert.ok(key.jwk.e.length > 0);
    assert.equal(key.jwk.kid, thumbprint(key.jwk));
    assert.equal(key.kid, key.jwk.kid);
    assert.equal(ring.current().kid, key.kid);
    assert.equal(ring.jwks().keys.length, 1);
    assert.equal(ring.jwks().keys[0]?.kid, key.jwk.kid);
  });
});

test("C-a715e6d5 foreign is stable and absent from the published JWKS", () => {
  assert.doesNotThrow(() => {
    const ring = createKeyRing();
    const foreign = ring.foreign();

    assert.equal(ring.foreign().kid, foreign.kid);
    assert.equal(ring.foreign().jwk.n, foreign.jwk.n);
    assert.equal(
      ring.jwks().keys.some((key) => key.kid === foreign.kid),
      false,
    );

    ring.rotate();
    assert.equal(
      ring.jwks().keys.some((key) => key.kid === foreign.kid),
      false,
    );
  });
});

test("C-5938a11f rotate makes a new current key and jwks lists new then old", () => {
  assert.doesNotThrow(() => {
    const ring = createKeyRing();
    const first = ring.current();
    const second = ring.rotate();

    assert.notEqual(second.kid, first.kid);
    assert.equal(ring.current().kid, second.kid);
    assert.deepEqual(
      ring.jwks().keys.map((key) => key.kid),
      [second.kid, first.kid],
    );
  });
});

test("C-a715e6d5 a token signed by the current key verifies and a foreign signature does not", () => {
  assert.doesNotThrow(() => {
    const ring = createKeyRing();
    const current = ring.current();
    const foreign = ring.foreign();

    const valid = signJwt(
      { sub: "alice" },
      { alg: "RS256", kid: current.kid, privateKey: current.privateKey },
    );
    const forged = signJwt(
      { sub: "alice" },
      { alg: "RS256", kid: current.kid, privateKey: foreign.privateKey },
    );

    assert.equal(verifyRs256(valid, current.jwk), true);
    assert.equal(verifyRs256(forged, current.jwk), false);
  });
});

test("C-5938a11f tokens from before and after rotation verify against their own keys", () => {
  assert.doesNotThrow(() => {
    const ring = createKeyRing();
    const first = ring.current();
    const firstToken = signJwt(
      { nonce: "one" },
      { alg: "RS256", kid: first.kid, privateKey: first.privateKey },
    );

    const second = ring.rotate();
    const secondToken = signJwt(
      { nonce: "two" },
      { alg: "RS256", kid: second.kid, privateKey: second.privateKey },
    );

    const keys = ring.jwks().keys;
    assert.equal(keys.length, 2);
    const firstJwk = keys.find((key) => key.kid === first.kid);
    const secondJwk = keys.find((key) => key.kid === second.kid);
    assert.ok(firstJwk);
    assert.ok(secondJwk);

    assert.equal(verifyRs256(firstToken, firstJwk), true);
    assert.equal(verifyRs256(secondToken, secondJwk), true);
    assert.equal(verifyRs256(firstToken, secondJwk), false);
    assert.equal(verifyRs256(secondToken, firstJwk), false);
  });
});
