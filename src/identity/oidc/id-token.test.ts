import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import type { JsonWebKey, KeyObject } from "node:crypto";
import { test } from "node:test";

import { Secret } from "../../config/index.ts";
import type { Clock } from "../../core/index.ts";
import { decodeJwt, startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { MintFlaw } from "../../../test/support/fake-oidc/index.ts";
import { OidcError, createOidcClient, verifyIdToken } from "../index.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const CLIENT_ID = "ursitoare-engine";
const NONCE = "test-nonce";
const TEST_ISSUER = "https://idp.example";
const TEST_KID = "test-key";

const { publicKey: testPublicKey, privateKey: testPrivateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});

const TEST_JWK: JsonWebKey = {
  ...testPublicKey.export({ format: "jwk" }),
  kid: TEST_KID,
  use: "sig",
  alg: "RS256",
};

function clockAt(now: Date): Clock {
  return { now: () => now };
}

function configFor(issuer: string): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
} {
  return { issuer, clientId: CLIENT_ID, clientSecret: new Secret("client-secret") };
}

function baseClaims(nowSeconds: number): Record<string, unknown> {
  return {
    iss: TEST_ISSUER,
    aud: CLIENT_ID,
    azp: CLIENT_ID,
    iat: nowSeconds,
    exp: nowSeconds + 300,
    nonce: NONCE,
    sub: "subject-alice",
    organization: ["org-a"],
  };
}

function signToken(
  payload: Record<string, unknown>,
  privateKey: KeyObject = testPrivateKey,
  kid: string = TEST_KID,
): string {
  const header = { alg: "RS256", typ: "JWT", kid };
  const headerPart = Buffer.from(JSON.stringify(header), "utf8").toString("base64url");
  const payloadPart = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const signature = sign(
    "sha256",
    Buffer.from(`${headerPart}.${payloadPart}`, "utf8"),
    privateKey,
  ).toString("base64url");
  return `${headerPart}.${payloadPart}.${signature}`;
}

async function expectInvalid(run: () => Promise<unknown>, reason: string): Promise<void> {
  let caught: unknown;
  await assert.rejects(
    run(),
    (error: unknown) => {
      caught = error;
      return true;
    },
    "the token is refused",
  );
  assert.ok(caught instanceof OidcError, "the refusal is an OidcError");
  assert.equal(caught.name, "OidcError");
  assert.equal(caught.code, "OIDC_TOKEN_INVALID");
  assert.equal(caught.message, "invalid ID token");
  assert.equal(caught.details["reason"], reason);
}

async function expectAccepted(run: () => Promise<unknown>): Promise<void> {
  await assert.doesNotReject(run, "the token verifies");
}

test("C-37de8752 A valid token", async () => {
  const fake = await startFakeOidc({ now: () => NOW });
  try {
    const config = configFor(fake.issuer);
    const clock = clockAt(NOW);
    const client = createOidcClient({ config, clock });
    const token = fake.mintToken({ user: "alice", nonce: NONCE });
    const expected = decodeJwt(token).payload;

    let result: Awaited<ReturnType<typeof verifyIdToken>> | undefined;
    await assert.doesNotReject(async () => {
      result = await verifyIdToken(token, {
        config,
        nonce: NONCE,
        clock,
        keyFor: (kid) => client.signingKey(kid),
      });
    });
    assert.ok(result !== undefined, "the valid token verifies");

    assert.equal(result.issuer, fake.issuer);
    assert.equal(result.subject, expected["sub"]);
    assert.deepEqual(result.organization, ["org-a"]);
    assert.equal(result.email, "alice@example.invalid");
    assert.equal(result.name, "Alice Example");
    assert.equal(result.preferredUsername, "alice");
  } finally {
    await fake.close();
  }
});

test("C-d9b14373 Each flaw is refused", async () => {
  const fake = await startFakeOidc({ now: () => NOW });
  try {
    const config = configFor(fake.issuer);
    const clock = clockAt(NOW);
    const client = createOidcClient({ config, clock });
    const keyFor = (kid: string): Promise<JsonWebKey | null> => client.signingKey(kid);
    const run =
      (token: string) =>
      (): Promise<unknown> =>
        verifyIdToken(token, { config, nonce: NONCE, clock, keyFor });
    const minted = (flaw: MintFlaw): string =>
      fake.mintToken({ user: "alice", nonce: NONCE, flaw });

    await expectInvalid(run(minted("wrong_aud")), "audience");
    await expectInvalid(run(minted("wrong_iss")), "issuer");
    await expectInvalid(run(minted("alg_none")), "alg");
    await expectInvalid(run(minted("hs256_public_key")), "alg");
    await expectInvalid(run(minted("foreign_key")), "signature");
    await expectInvalid(run(minted("unknown_kid")), "kid");
    await expectInvalid(run(minted("expired")), "expired");
    await expectInvalid(run(minted("missing_nonce")), "nonce");
    await expectInvalid(run(minted("wrong_nonce")), "nonce");
    await expectInvalid(run(""), "malformed");
    await expectInvalid(run("a.b"), "malformed");

    const twoOrganizations = fake.mintToken({
      user: "alice",
      nonce: NONCE,
      flaw: "two_organizations",
    });
    let result: Awaited<ReturnType<typeof verifyIdToken>> | undefined;
    await assert.doesNotReject(async () => {
      result = await verifyIdToken(twoOrganizations, {
        config,
        nonce: NONCE,
        clock,
        keyFor,
      });
    });
    assert.ok(result !== undefined, "the two organization token verifies");
    const organization = result.organization;
    assert.ok(Array.isArray(organization), "the organization claim is an array");
    assert.equal(organization.length, 2);
    assert.deepEqual(organization, ["org-a", "org-b"]);
  } finally {
    await fake.close();
  }
});

test("C-4d629d41 Claim edges", async () => {
  const nowSeconds = Math.floor(NOW.getTime() / 1000);
  const config = configFor(TEST_ISSUER);
  const clock = clockAt(NOW);
  const keyFor = async (kid: string): Promise<JsonWebKey | null> =>
    kid === TEST_KID ? TEST_JWK : null;
  const run =
    (token: string) =>
    (): Promise<unknown> =>
      verifyIdToken(token, { config, nonce: NONCE, clock, keyFor });

  await expectAccepted(run(signToken({ ...baseClaims(nowSeconds), exp: nowSeconds - 59 })));
  await expectInvalid(run(signToken({ ...baseClaims(nowSeconds), exp: nowSeconds - 60 })), "expired");
  await expectAccepted(run(signToken({ ...baseClaims(nowSeconds), iat: nowSeconds + 60 })));
  await expectInvalid(run(signToken({ ...baseClaims(nowSeconds), iat: nowSeconds + 61 })), "iat");

  const multipleAudiences: Record<string, unknown> = {
    ...baseClaims(nowSeconds),
    aud: [CLIENT_ID, "other-audience"],
  };
  const withoutAzp: Record<string, unknown> = { ...multipleAudiences };
  delete withoutAzp["azp"];
  await expectInvalid(run(signToken(withoutAzp)), "azp");
  await expectAccepted(run(signToken(multipleAudiences)));
  await expectInvalid(
    run(signToken({ ...baseClaims(nowSeconds), azp: "other-client" })),
    "azp",
  );

  await expectInvalid(run(signToken({ ...baseClaims(nowSeconds), sub: "" })), "subject");
  await expectInvalid(
    run(signToken({ ...baseClaims(nowSeconds), sub: "s".repeat(513) })),
    "subject",
  );
});
