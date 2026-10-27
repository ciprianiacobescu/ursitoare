import assert from "node:assert/strict";
import { createHmac, createPublicKey, verify as cryptoVerify } from "node:crypto";
import { test } from "node:test";

import { decodeJwt, verifyRs256 } from "./jwt.ts";
import { createKeyRing } from "./keys.ts";
import type { Jwk } from "./keys.ts";
import { mintJwt } from "./tokens.ts";
import type { TokenContext } from "./tokens.ts";
import { FakeOidcError } from "./types.ts";
import type { MintFlaw, MintOptions } from "./types.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const ISSUER = "http://127.0.0.1:8080/realms/ursitoare";
const IAT = 1792929600;
const EXP = 1792929900;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function context(keys = createKeyRing()): TokenContext {
  return { issuer: ISSUER, now: () => NOW, keys };
}

function parts(token: string): [string, string, string] {
  const [header, payload, signature] = token.split(".");
  assert.ok(header !== undefined);
  assert.ok(payload !== undefined);
  assert.ok(signature !== undefined);
  return [header, payload, signature];
}

function payloadOf(token: string): Record<string, unknown> {
  return decodeJwt(token).payload;
}

function publicKeyOf(jwk: Jwk) {
  return createPublicKey({ key: jwk, format: "jwk" });
}

test("C-c940079f alices ID token carries the Keycloak claim shape", () => {
  assert.doesNotThrow(() => {
    const keys = createKeyRing();
    const token = mintJwt(context(keys), {
      user: "alice",
      clientId: "ursitoare-engine",
      kind: "id",
      nonce: "n-1",
      scope: "openid profile email organization",
    });
    const decoded = decodeJwt(token);
    const payload = decoded.payload;

    assert.equal(decoded.header["alg"], "RS256");
    assert.equal(decoded.header["typ"], "JWT");
    assert.equal(decoded.header["kid"], keys.current().kid);
    assert.equal(
      keys.jwks().keys.some((key) => key.kid === decoded.header["kid"]),
      true,
    );
    assert.equal(payload["iss"], ISSUER);
    assert.equal(payload["aud"], "ursitoare-engine");
    assert.equal(payload["azp"], "ursitoare-engine");
    assert.equal(payload["typ"], "ID");
    assert.equal(payload["iat"], IAT);
    assert.equal(payload["exp"], EXP);
    assert.equal(payload["nonce"], "n-1");
    assert.equal(payload["email"], "alice@example.invalid");
    assert.equal(payload["email_verified"], true);
    assert.equal(payload["name"], "Alice Example");
    assert.equal(payload["preferred_username"], "alice");
    assert.deepEqual(payload["organization"], ["org-a"]);
    assert.deepEqual(payload["groups"], ["ursitoare-authors", "team-finance"]);
    assert.equal(verifyRs256(token, keys.current().jwk), true);
  });
});

test("C-d7a517bf the four seed users have stable UUID subjects with their groups and organisations", () => {
  assert.doesNotThrow(() => {
    const ctx = context();
    const mint = (user: string): Record<string, unknown> =>
      payloadOf(mintJwt(ctx, { user, scope: "openid profile email organization" }));

    const alice = mint("alice");
    const bob = mint("bob");
    const carol = mint("carol");
    const mallory = mint("mallory");

    assert.deepEqual(bob["groups"], ["ursitoare-approvers", "team-finance"]);
    assert.deepEqual(carol["groups"], ["ursitoare-admins"]);
    assert.deepEqual(mallory["groups"], ["ursitoare-authors"]);
    assert.deepEqual(bob["organization"], ["org-a"]);
    assert.deepEqual(carol["organization"], ["org-a"]);
    assert.deepEqual(mallory["organization"], ["org-b"]);

    for (const payload of [alice, bob, carol, mallory]) {
      assert.match(String(payload["sub"]), UUID);
    }

    const aliceSecondStart = payloadOf(
      mintJwt(context(), { user: "alice", scope: "openid profile email organization" }),
    );
    assert.equal(aliceSecondStart["sub"], alice["sub"]);
    assert.notEqual(bob["sub"], alice["sub"]);
  });
});

test("C-5a6e5b58 scope gates organisation and nonce while the access token shares the sid", () => {
  assert.doesNotThrow(() => {
    const ctx = context();
    const scope = "openid profile email";
    const id = payloadOf(mintJwt(ctx, { user: "alice", kind: "id", scope, sid: "sid-1" }));
    const access = payloadOf(mintJwt(ctx, { user: "alice", kind: "access", scope, sid: "sid-1" }));

    assert.equal("organization" in id, false);
    assert.equal("nonce" in id, false);
    assert.equal(access["typ"], "Bearer");
    assert.equal(access["azp"], "ursitoare-engine");
    assert.equal(access["aud"], "ursitoare-engine");
    assert.equal(access["scope"], scope);
    assert.equal(access["sid"], "sid-1");
    assert.equal(id["sid"], access["sid"]);
  });
});

test("C-271f3bbf mintJwt defaults to a valid alice ID token with nonce n-2", () => {
  assert.doesNotThrow(() => {
    const keys = createKeyRing();
    const token = mintJwt(context(keys), { nonce: "n-2" });
    const payload = payloadOf(token);

    assert.equal(payload["typ"], "ID");
    assert.equal(payload["preferred_username"], "alice");
    assert.equal(payload["aud"], "ursitoare-engine");
    assert.equal(payload["nonce"], "n-2");
    assert.equal(verifyRs256(token, keys.current().jwk), true);
  });
});

test("C-e5daba08 claim flaws change exactly the named claim and still verify", () => {
  assert.doesNotThrow(() => {
    const keys = createKeyRing();
    const ctx = context(keys);
    const base = payloadOf(mintJwt(ctx, { nonce: "n-2" }));

    const cases: { flaw: MintFlaw; expected: Record<string, unknown> }[] = [
      { flaw: "wrong_aud", expected: { aud: "wrong-audience" } },
      { flaw: "wrong_iss", expected: { iss: `${ISSUER}/other` } },
      { flaw: "expired", expected: { iat: IAT - 600, exp: IAT - 300 } },
      { flaw: "wrong_nonce", expected: { nonce: "n-2-mismatch" } },
      { flaw: "two_organizations", expected: { organization: ["org-a", "org-b"] } },
    ];

    for (const { flaw, expected } of cases) {
      const token = mintJwt(ctx, { nonce: "n-2", flaw });
      const payload = payloadOf(token);
      const changed = new Set(Object.keys(expected));

      assert.equal(verifyRs256(token, keys.current().jwk), true);
      for (const [claim, value] of Object.entries(expected)) {
        assert.deepEqual(payload[claim], value, claim);
      }
      for (const claim of Object.keys(base)) {
        if (changed.has(claim)) continue;
        assert.deepEqual(payload[claim], base[claim], claim);
      }
    }

    const missingNonceToken = mintJwt(ctx, { nonce: "n-2", flaw: "missing_nonce" });
    const missingNonce = payloadOf(missingNonceToken);
    assert.equal(verifyRs256(missingNonceToken, keys.current().jwk), true);
    assert.equal("nonce" in missingNonce, false);
    for (const claim of Object.keys(base)) {
      if (claim === "nonce") continue;
      assert.deepEqual(missingNonce[claim], base[claim], claim);
    }
  });
});

test("C-4b89bf6e signature flaws produce none HS256 unknown kid and foreign key tokens", () => {
  assert.doesNotThrow(() => {
    const keys = createKeyRing();
    const ctx = context(keys);
    const base = payloadOf(mintJwt(ctx, { nonce: "n-2" }));
    const currentJwk = keys.current().jwk;

    const noneToken = mintJwt(ctx, { flaw: "alg_none" });
    const noneDecoded = decodeJwt(noneToken);
    assert.equal(noneDecoded.header["alg"], "none");
    assert.equal(noneToken.split(".")[2], "");
    assert.equal(noneDecoded.signature.length, 0);
    assert.equal(verifyRs256(noneToken, currentJwk), false);
    assert.deepEqual(noneDecoded.payload, base);

    const hsToken = mintJwt(ctx, { flaw: "hs256_public_key" });
    const hsDecoded = decodeJwt(hsToken);
    assert.equal(hsDecoded.header["alg"], "HS256");
    const [hsHeader, hsPayload, hsSignature] = parts(hsToken);
    const pem = publicKeyOf(currentJwk).export({ type: "spki", format: "pem" });
    const expectedSignature = createHmac("sha256", pem)
      .update(`${hsHeader}.${hsPayload}`)
      .digest("base64url");
    assert.equal(hsSignature, expectedSignature);
    assert.equal(verifyRs256(hsToken, currentJwk), false);
    assert.deepEqual(hsDecoded.payload, base);

    const unknownToken = mintJwt(ctx, { flaw: "unknown_kid" });
    const unknownDecoded = decodeJwt(unknownToken);
    assert.equal(unknownDecoded.header["kid"], "unknown-kid");
    assert.equal(
      keys.jwks().keys.some((key) => key.kid === "unknown-kid"),
      false,
    );
    const [unknownHeader, unknownPayload, unknownSignature] = parts(unknownToken);
    assert.equal(
      cryptoVerify(
        "sha256",
        Buffer.from(`${unknownHeader}.${unknownPayload}`),
        publicKeyOf(currentJwk),
        Buffer.from(unknownSignature, "base64url"),
      ),
      true,
    );
    assert.equal(verifyRs256(unknownToken, currentJwk), false);
    assert.deepEqual(unknownDecoded.payload, base);

    const foreignToken = mintJwt(ctx, { flaw: "foreign_key" });
    const foreignDecoded = decodeJwt(foreignToken);
    assert.equal(foreignDecoded.header["kid"], keys.current().kid);
    assert.equal(verifyRs256(foreignToken, currentJwk), false);
    assert.deepEqual(foreignDecoded.payload, base);
  });
});

test("C-940e29ee unknown user client or flaw throws the documented codes", () => {
  const ctx = context();
  const cases: { opts: MintOptions; code: string }[] = [
    { opts: { user: "eve" }, code: "FAKE_OIDC_UNKNOWN_USER" },
    { opts: { clientId: "nope" }, code: "FAKE_OIDC_UNKNOWN_CLIENT" },
    { opts: { flaw: "sideways" as never }, code: "FAKE_OIDC_BAD_OPTIONS" },
  ];

  for (const { opts, code } of cases) {
    assert.throws(
      () => mintJwt(ctx, opts),
      (error: unknown) => {
        assert.ok(error instanceof FakeOidcError);
        assert.equal(error.code, code);
        return true;
      },
    );
  }
});
