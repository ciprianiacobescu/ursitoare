import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import type { JsonWebKey } from "node:crypto";
import { test } from "node:test";

import { Secret } from "../../config/index.ts";
import type { Clock } from "../../core/index.ts";
import { decodeJwt, startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { createOidcClient } from "./client.ts";
import { OidcError } from "./errors.ts";
import { verifyIdToken } from "./id-token.ts";

const ISS = "http://localhost:8180/realms/ursitoare";
const B = "http://keycloak:8080";
const P = "/realms/ursitoare/protocol/openid-connect";
const B_DISCOVERY = B + "/realms/ursitoare/.well-known/openid-configuration";
const REDIRECT_URI = "http://127.0.0.1:8080/auth/oidc/callback";
const NOW = new Date("2026-10-25T12:00:00Z");

const D1 = {
  issuer: ISS,
  authorization_endpoint: ISS + "/protocol/openid-connect/auth",
  token_endpoint: ISS + "/protocol/openid-connect/token",
  jwks_uri: ISS + "/protocol/openid-connect/certs",
  end_session_endpoint: ISS + "/protocol/openid-connect/logout",
};

const K = {
  ...D1,
  token_endpoint: B + P + "/token",
  jwks_uri: B + P + "/certs",
  userinfo_endpoint: B + P + "/userinfo",
};

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

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

async function settle<T>(p: Promise<T>): Promise<
  | { ok: true; value: T }
  | { ok: false; error: unknown }
> {
  try {
    return { ok: true, value: await p };
  } catch (error) {
    return { ok: false, error };
  }
}

function config(
  issuer: string,
  backchannelUrl?: string,
  secret = "client-secret",
): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
  backchannelUrl?: string;
} {
  return {
    issuer,
    clientId: "ursitoare-engine",
    clientSecret: new Secret(secret),
    ...(backchannelUrl === undefined ? {} : { backchannelUrl }),
  };
}

function clock(): Clock {
  return { now: () => new Date(NOW.getTime()) };
}

function guarded(calls: readonly FetchCall[]): void {
  assert.ok(calls.length > 0, "the client made a request");
  for (const call of calls) {
    assert.equal(call.init?.redirect, "error", "the request refuses redirects");
    assert.ok(call.init?.signal instanceof AbortSignal, "the request carries a signal");
  }
}

function methodsAndUrls(calls: readonly FetchCall[]): Array<[string, string]> {
  return calls.map((call) => [call.init?.method ?? "GET", call.url]);
}

function failure(settled: { ok: boolean; value?: unknown; error?: unknown }): OidcError {
  assert.equal(settled.ok, false, "the call rejects");
  const error = (settled as { ok: false; error: unknown }).error;
  assert.ok(error instanceof OidcError, "the refusal is an OidcError");
  return error;
}

function twoOrigins(fake: FakeOidc, calls: FetchCall[]): typeof fetch {
  return async (input, init) => {
    const url =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    const parsed = new URL(url);
    if (parsed.origin !== B) {
      return fetch(input, init);
    }
    calls.push({ url, init });
    const target = `${fake.url}${parsed.pathname}${parsed.search}`;
    const response = await fetch(target, init);
    if (!parsed.pathname.endsWith("/.well-known/openid-configuration")) {
      return response;
    }
    const document = (await response.json()) as Record<string, unknown>;
    const onBackChannel = (value: unknown): string => B + new URL(String(value)).pathname;
    return json(
      {
        ...document,
        token_endpoint: onBackChannel(document["token_endpoint"]),
        jwks_uri: onBackChannel(document["jwks_uri"]),
        userinfo_endpoint: onBackChannel(document["userinfo_endpoint"]),
      },
      response.status,
    );
  };
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

test("C-73bdb95b Token and JWKS endpoints follow the back-channel rule", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(typeof createOidcClient, "function");
    const clockAt = clock();

    // K1
    {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json(K), calls);
      const client = createOidcClient({ config: config(ISS, B), clock: clockAt, fetch });
      const settled = await settle(client.discovery());
      assert.ok(settled.ok, "K1 discovery succeeds");
      assert.deepEqual(settled.ok ? settled.value : null, {
        authorizeUrl: ISS + "/protocol/openid-connect/auth",
        tokenUrl: B + P + "/token",
        jwksUrl: B + P + "/certs",
        logoutUrl: ISS + "/protocol/openid-connect/logout",
      });
      assert.deepEqual(methodsAndUrls(calls), [["GET", B_DISCOVERY]]);
      guarded(calls);
    }

    // K2
    {
      const withoutEnd = {
        issuer: ISS,
        authorization_endpoint: ISS + "/protocol/openid-connect/auth",
        token_endpoint: ISS + "/protocol/openid-connect/token",
        jwks_uri: ISS + "/protocol/openid-connect/certs",
      };
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json(withoutEnd), calls);
      const client = createOidcClient({ config: config(ISS, B), clock: clockAt, fetch });
      const settled = await settle(client.discovery());
      assert.ok(settled.ok, "K2 discovery succeeds");
      assert.deepEqual(settled.ok ? settled.value : null, {
        authorizeUrl: ISS + "/protocol/openid-connect/auth",
        tokenUrl: B + P + "/token",
        jwksUrl: B + P + "/certs",
        logoutUrl: null,
      });
      assert.deepEqual(methodsAndUrls(calls), [["GET", B_DISCOVERY]]);
      guarded(calls);
    }

    const refusalCases: Array<{ document: unknown; details: Record<string, unknown> }> = [
      { document: { ...K, token_endpoint: "https://evil.example/token" }, details: { reason: "origin" } },
      { document: { ...K, jwks_uri: "https://evil.example/certs" }, details: { reason: "origin" } },
      { document: { ...K, token_endpoint: "http://keycloak:8081/t" }, details: { reason: "origin" } },
      { document: { ...K, token_endpoint: 5 }, details: { reason: "endpoint" } },
      { document: { ...K, token_endpoint: "ftp://keycloak:8080/t" }, details: { reason: "endpoint" } },
    ];

    // K3 to K7
    for (const { document, details } of refusalCases) {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(() => json(document), calls);
      const client = createOidcClient({ config: config(ISS, B), clock: clockAt, fetch });
      const settled = await settle(client.discovery());
      const error = failure(settled);
      assert.equal(error.code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual(error.details, details);
      assert.deepEqual(methodsAndUrls(calls), [["GET", B_DISCOVERY]]);
      guarded(calls);
    }

    // K8
    {
      const calls: FetchCall[] = [];
      const fetch = recordingFetch(
        (url) => (url === B_DISCOVERY ? json(K) : new Response("x", { status: 500 })),
        calls,
      );
      const client = createOidcClient({ config: config(ISS, B), clock: clockAt, fetch });

      const keySettled = await settle(client.signingKey("k1"));
      const keyError = failure(keySettled);
      assert.equal(keyError.code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual(keyError.details, { reason: "status", status: 500 });

      const exchangeSettled = await settle(client.exchangeCode("c", "v", REDIRECT_URI));
      const exchangeError = failure(exchangeSettled);
      assert.equal(exchangeError.code, "OIDC_PROVIDER_UNAVAILABLE");
      assert.deepEqual(exchangeError.details, { reason: "status", status: 500 });

      assert.deepEqual(methodsAndUrls(calls), [
        ["GET", B_DISCOVERY],
        ["GET", B + P + "/certs"],
        ["POST", B + P + "/token"],
      ]);
      guarded(calls);
    }
  });
});

test("C-48dfbba1 Keys and the code exchange use the back-channel origin and iss stays the issuer", async () => {
  await assert.doesNotReject(async () => {
    assert.equal(typeof createOidcClient, "function");
    const clockAt = clock();
    const fake = await startFakeOidc({ now: () => NOW });
    try {
      fake.registerRedirect(REDIRECT_URI);
      const cfg = config(fake.issuer, B, fake.clientSecret("ursitoare-engine"));
      const calls: FetchCall[] = [];
      const client = createOidcClient({
        config: cfg,
        clock: clockAt,
        fetch: twoOrigins(fake, calls),
      });

      // W1.1
      const discovered = await settle(client.discovery());
      assert.ok(discovered.ok, "W1 discovery succeeds");
      assert.deepEqual(discovered.ok ? discovered.value : null, {
        authorizeUrl: fake.issuer + "/protocol/openid-connect/auth",
        tokenUrl: B + P + "/token",
        jwksUrl: B + P + "/certs",
        logoutUrl: fake.issuer + "/protocol/openid-connect/logout",
      });

      // W1.2
      const verifier = randomBytes(32).toString("base64url");
      const code = await loginCode(fake, verifier);
      const exchange = await settle(client.exchangeCode(code, verifier, REDIRECT_URI));
      assert.ok(exchange.ok, "W1 the exchange succeeds");
      const idToken = exchange.ok ? exchange.value : "";
      assert.equal(idToken.split(".").length, 3, "the exchange returns a three-part token");
      const kid = decodeJwt(idToken).header["kid"];
      assert.equal(typeof kid, "string", "the token names a key");
      const key = await settle(client.signingKey(String(kid)));
      assert.ok(key.ok, "W1 the key lookup succeeds");
      assert.ok(key.ok ? key.value !== null : false, "the key is found");

      // W1.3
      assert.deepEqual(methodsAndUrls(calls), [
        ["GET", B_DISCOVERY],
        ["POST", B + P + "/token"],
        ["GET", B + P + "/certs"],
      ]);
      guarded(calls);
      const tokenRequests = fake.requests().filter((request) => request.path.endsWith("/token"));
      const lastTokenRequest = tokenRequests.at(-1);
      assert.ok(lastTokenRequest !== undefined, "the fake saw a token request");
      assert.equal(
        lastTokenRequest.form["client_secret"],
        undefined,
        "the exchange sends no client_secret form field",
      );

      // W1.4
      const keyFor = (keyId: string): Promise<JsonWebKey | null> => client.signingKey(keyId);
      const plainToken = fake.mintToken({ user: "alice", nonce: "wire-nonce" });
      const verified = await settle(
        verifyIdToken(plainToken, { config: cfg, nonce: "wire-nonce", clock: clockAt, keyFor }),
      );
      assert.ok(verified.ok, "W1 the minted token verifies");
      assert.equal(
        verified.ok ? verified.value.issuer : null,
        fake.issuer,
        "the verified issuer is the browser issuer",
      );

      const wrongIssuer = fake.mintToken({
        user: "alice",
        nonce: "wire-nonce",
        flaw: "wrong_iss",
      });
      const refused = await settle(
        verifyIdToken(wrongIssuer, { config: cfg, nonce: "wire-nonce", clock: clockAt, keyFor }),
      );
      const tokenError = failure(refused);
      assert.equal(tokenError.code, "OIDC_TOKEN_INVALID");
      assert.deepEqual(tokenError.details, { reason: "issuer" });

      assert.equal(calls.length, 3, "no further request is made");
    } finally {
      await fake.close();
    }
  });
});
