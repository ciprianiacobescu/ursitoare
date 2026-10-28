import assert from "node:assert/strict";
import { createHash, generateKeyPairSync, randomBytes } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { test } from "node:test";

import { Secret } from "../../config/index.ts";
import type { Clock } from "../../core/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { OidcError, createOidcClient } from "../index.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT_URI = "http://127.0.0.1:8080/auth/oidc/callback";
const DISCOVERY_SUFFIX = "/.well-known/openid-configuration";
const CERTS_SUFFIX = "/protocol/openid-connect/certs";
const TOKEN_SUFFIX = "/protocol/openid-connect/token";

type MutableClock = Clock & { advance(ms: number): void };

function mutableClock(start: Date): MutableClock {
  let millis = start.getTime();
  return {
    now: () => new Date(millis),
    advance(ms: number): void {
      millis += ms;
    },
  };
}

function configFor(issuer: string): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
} {
  return { issuer, clientId: "ursitoare-engine", clientSecret: new Secret("client-secret") };
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

type FetchCall = Readonly<{ url: string; init: RequestInit | undefined }>;

function recordingFetch(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
  calls: FetchCall[],
): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    calls.push({ url, init });
    return handler(url, init);
  };
}

function oidcErrorOf(caught: unknown, code: string): OidcError {
  assert.ok(caught instanceof OidcError, "the call rejects with an OidcError");
  assert.equal(caught.code, code);
  return caught;
}

function assertNoUrlOrBody(error: OidcError, sentinel: string): void {
  const details = JSON.stringify(error.details);
  assert.equal(error.message.includes(sentinel), false, "the message holds no body");
  assert.equal(details.includes(sentinel), false, "the details hold no body");
  assert.equal(error.message.includes("://"), false, "the message holds no URL");
  assert.equal(details.includes("://"), false, "the details hold no URL");
}

function assertGuardedRequests(calls: readonly FetchCall[]): void {
  assert.ok(calls.length > 0, "the client made a request");
  for (const call of calls) {
    assert.equal(call.init?.redirect, "error", "the request refuses redirects");
    assert.ok(call.init?.signal instanceof AbortSignal, "the request carries a signal");
  }
}

function countRequests(fake: FakeOidc, suffix: string): number {
  return fake.requests().filter((request) => request.path.endsWith(suffix)).length;
}

async function expectDiscoveryFailure(
  handler: (url: string, init: RequestInit | undefined) => Response | Promise<Response>,
  sentinel: string,
  options: { configIssuer?: string; timeoutMs?: number } = {},
): Promise<void> {
  const calls: FetchCall[] = [];
  const client = createOidcClient({
    config: configFor(options.configIssuer ?? "https://idp.example"),
    clock: mutableClock(NOW),
    fetch: recordingFetch(handler, calls),
    ...(options.timeoutMs === undefined ? {} : { timeoutMs: options.timeoutMs }),
  });

  let caught: unknown;
  try {
    await client.discovery();
  } catch (error) {
    caught = error;
  }

  const error = oidcErrorOf(caught, "OIDC_PROVIDER_UNAVAILABLE");
  assertNoUrlOrBody(error, sentinel);
  assertGuardedRequests(calls);
}

function rsaJwk(kid: string): JsonWebKey {
  const { publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return { ...publicKey.export({ format: "jwk" }), kid, use: "sig", alg: "RS256" };
}

async function loginCode(fake: FakeOidc, verifier: string): Promise<string> {
  const challenge = createHash("sha256").update(verifier, "utf8").digest("base64url");
  const url = new URL(`${fake.issuer}/protocol/openid-connect/auth`);
  url.search = new URLSearchParams({
    client_id: "ursitoare-engine",
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope: "openid profile email organization",
    state: randomBytes(32).toString("base64url"),
    nonce: randomBytes(32).toString("base64url"),
    code_challenge: challenge,
    code_challenge_method: "S256",
  }).toString();

  const callback = await completeFakeLogin(fake, url.toString(), "alice");
  const code = new URL(callback).searchParams.get("code");
  assert.ok(code !== null && code.length > 0, "the fake login returns a code");
  return code;
}

test("C-ad533226 Cached and refetched once", async () => {
  await assert.doesNotReject(async () => {
    const clock = mutableClock(NOW);
    const fake = await startFakeOidc({ now: () => clock.now() });
    try {
      const client = createOidcClient({ config: configFor(fake.issuer), clock });

      await client.discovery();
      await client.discovery();
      assert.equal(countRequests(fake, DISCOVERY_SUFFIX), 1, "the first two calls share the cache");

      clock.advance(3_601_000);
      await client.discovery();
      assert.equal(countRequests(fake, DISCOVERY_SUFFIX), 2, "the discovery expires after 3600 s");

      fake.rotateSigningKey();
      const jwksResponse = await fetch(`${fake.issuer}${CERTS_SUFFIX}`);
      const jwks = (await jwksResponse.json()) as { keys?: Array<{ kid?: string }> };
      const newKid = jwks.keys?.[0]?.kid;
      assert.ok(typeof newKid === "string" && newKid.length > 0, "the rotated key has a kid");

      const beforeFirstKey = countRequests(fake, CERTS_SUFFIX);
      const firstKey = await client.signingKey(newKid);
      assert.equal(countRequests(fake, CERTS_SUFFIX) - beforeFirstKey, 1, "the first key fetch is one request");
      assert.ok(firstKey !== null, "the rotated key is found");
      assert.equal(firstKey.kty, "RSA");
      assert.equal(firstKey.kid, newKid);

      const beforeUnknown = countRequests(fake, CERTS_SUFFIX);
      const unknownKey = await client.signingKey("nope");
      assert.equal(unknownKey, null, "an unknown kid gives null");
      assert.equal(
        countRequests(fake, CERTS_SUFFIX) - beforeUnknown,
        1,
        "an unknown kid refetches the keys once",
      );
    } finally {
      await fake.close();
    }
  });
});

test("C-4bf7d6e6 Hostile answers", async () => {
  await assert.doesNotReject(async () => {
    const issuer = "https://idp.example";
    const discovery = {
      issuer,
      authorization_endpoint: `${issuer}/auth`,
      token_endpoint: `${issuer}/token`,
      jwks_uri: `${issuer}/jwks`,
      end_session_endpoint: `${issuer}/logout`,
    };

    await expectDiscoveryFailure(
      () => json({ ...discovery, issuer: "https://other.example" }),
      "https://other.example",
    );
    await expectDiscoveryFailure(
      () => json({ ...discovery, token_endpoint: "https://evil.example/token" }),
      "https://evil.example/token",
    );
    await expectDiscoveryFailure(() => new Response("status-500-body", { status: 500 }), "status-500-body");
    await expectDiscoveryFailure(
      () => new Response("not-json-body", { status: 200, headers: { "content-type": "application/json" } }),
      "not-json-body",
    );

    const hugeBody = "huge-body-marker-" + "z".repeat(262_145);
    await expectDiscoveryFailure(
      () => new Response(hugeBody, { status: 200, headers: { "content-type": "application/json" } }),
      "huge-body-marker-",
    );

    const neverSettles = (_url: string, init: RequestInit | undefined): Promise<Response> =>
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (signal === undefined || signal === null) {
          reject(new Error("the client passed no signal"));
          return;
        }
        const fail = (): void => {
          reject(signal.reason);
        };
        if (signal.aborted) fail();
        else signal.addEventListener("abort", fail, { once: true });
      });
    await expectDiscoveryFailure(neverSettles, "never-settled-body", { timeoutMs: 20 });

    const { publicKey: weakPublicKey } = generateKeyPairSync("rsa", { modulusLength: 1024 });
    const weakKey = {
      ...weakPublicKey.export({ format: "jwk" }),
      kid: "weak",
      use: "sig",
      alg: "RS256",
    };
    const octKey = { kty: "oct", kid: "oct", k: "AAAA" };
    const duplicateOne = rsaJwk("dup");
    const duplicateTwo = rsaJwk("dup");

    const calls: FetchCall[] = [];
    const jwksClient = createOidcClient({
      config: configFor(issuer),
      clock: mutableClock(NOW),
      fetch: recordingFetch((url) => {
        if (url.endsWith(DISCOVERY_SUFFIX)) return json(discovery);
        if (url.endsWith("/jwks")) {
          return json({ keys: [weakKey, octKey, duplicateOne, duplicateTwo] });
        }
        return json({ error: "not_found" }, 404);
      }, calls),
    });

    for (const kid of ["weak", "oct", "dup"]) {
      const key = await jwksClient.signingKey(kid);
      assert.equal(key, null, `the hostile key ${kid} is ignored`);
    }
    assertGuardedRequests(calls);
  });
});

test("C-5a0077b2 Code exchange", async () => {
  await assert.doesNotReject(async () => {
    const clock = mutableClock(NOW);
    const fake = await startFakeOidc({ now: () => clock.now() });
    try {
      fake.registerRedirect(REDIRECT_URI);
      const client = createOidcClient({ config: configFor(fake.issuer), clock });

      const verifier = randomBytes(32).toString("base64url");
      const code = await loginCode(fake, verifier);

      let idToken = "";
      await assert.doesNotReject(async () => {
        idToken = await client.exchangeCode(code, verifier, REDIRECT_URI);
      });
      assert.equal(idToken.split(".").length, 3, "the exchange returns a three-part token");

      const tokenRequests = fake.requests().filter((request) => request.path.endsWith(TOKEN_SUFFIX));
      const firstTokenRequest = tokenRequests.at(-1);
      assert.ok(firstTokenRequest !== undefined, "the token endpoint was called");
      assert.equal(
        firstTokenRequest.form["client_secret"],
        undefined,
        "the exchange authenticates with HTTP Basic, not a client_secret form field",
      );

      await assert.rejects(client.exchangeCode(code, verifier, REDIRECT_URI), {
        code: "OIDC_EXCHANGE_FAILED",
      });

      const secondCode = await loginCode(fake, verifier);
      const wrongVerifier = randomBytes(32).toString("base64url");
      await assert.rejects(client.exchangeCode(secondCode, wrongVerifier, REDIRECT_URI), {
        code: "OIDC_EXCHANGE_FAILED",
      });
    } finally {
      await fake.close();
    }
  });
});
