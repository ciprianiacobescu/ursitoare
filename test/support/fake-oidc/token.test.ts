import assert from "node:assert/strict";
import { after, test } from "node:test";

import { decodeJwt, verifyRs256 } from "./jwt.ts";
import type { Jwk } from "./keys.ts";
import { startFakeOidc } from "./server.ts";
import { FakeOidcError } from "./types.ts";
import type { FakeOidc } from "./types.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT = "http://127.0.0.1:9/cb";
const AUTH_PATH = "/realms/ursitoare/protocol/openid-connect/auth";
const TOKEN_PATH = "/realms/ursitoare/protocol/openid-connect/token";
const CERTS_PATH = "/realms/ursitoare/protocol/openid-connect/certs";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const DEFAULT_SCOPE = "openid profile email organization";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

type StartOptions = {
  port?: number;
  host?: string;
  now?: () => Date;
  redirectUri?: string;
};

type TokenResponse = {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
};

type LoginOptions = {
  username?: string;
  clientId?: string;
  scope?: string;
  nonce?: string;
  state?: string;
  challenge?: string;
  method?: string;
};

type ExchangeOptions = {
  redirectUri?: string;
  verifier?: string;
  secret?: string;
  clientId?: string;
  basic?: boolean;
  form?: Record<string, string>;
};

const fakes: FakeOidc[] = [];

async function startFake(opts: StartOptions = {}): Promise<FakeOidc> {
  const fake = await startFakeOidc(opts);
  fake.registerRedirect(REDIRECT);
  fake.registerRedirect(REDIRECT, { clientId: "ursitoare-mcp" });
  fakes.push(fake);
  return fake;
}

after(async () => {
  await Promise.all(fakes.map((fake) => fake.close()));
});

async function login(fake: FakeOidc, options: LoginOptions = {}): Promise<string> {
  const username = options.username ?? "alice";
  const params: Record<string, string> = {
    client_id: options.clientId ?? "ursitoare-engine",
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: options.scope ?? DEFAULT_SCOPE,
    state: options.state ?? "s1",
    code_challenge: options.challenge ?? CHALLENGE,
    code_challenge_method: options.method ?? "S256",
    ...(options.nonce === undefined ? {} : { nonce: options.nonce }),
  };

  const response = await fetch(`${fake.url}${AUTH_PATH}?${new URLSearchParams(params)}`, {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password: fake.passwordOf(username) }).toString(),
  });
  assert.equal(response.status, 302);

  const location = response.headers.get("location");
  assert.ok(location !== null);
  const code = new URL(location).searchParams.get("code");
  assert.ok(code !== null);
  return code;
}

function basic(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`;
}

async function tokenRequest(
  fake: FakeOidc,
  form: Record<string, string>,
  options: { authorization?: string; contentType?: string; body?: string } = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    "content-type": options.contentType ?? "application/x-www-form-urlencoded",
  };
  if (options.authorization !== undefined) headers["authorization"] = options.authorization;

  return fetch(`${fake.url}${TOKEN_PATH}`, {
    method: "POST",
    redirect: "manual",
    headers,
    body: options.body ?? new URLSearchParams(form).toString(),
  });
}

async function exchange(
  fake: FakeOidc,
  code: string,
  options: ExchangeOptions = {},
): Promise<Response> {
  const clientId = options.clientId ?? "ursitoare-engine";
  const form: Record<string, string> = {
    grant_type: "authorization_code",
    code,
    redirect_uri: options.redirectUri ?? REDIRECT,
    code_verifier: options.verifier ?? VERIFIER,
    ...options.form,
  };

  if (options.basic === false) {
    form["client_id"] = clientId;
    return tokenRequest(fake, form);
  }

  const secret = options.secret ?? fake.clientSecret(clientId);
  return tokenRequest(fake, form, { authorization: basic(clientId, secret) });
}

async function assertOAuthError(
  response: Response,
  status: number,
  error: string,
): Promise<void> {
  assert.equal(response.status, status);
  const body = (await response.json()) as { error?: unknown };
  assert.equal(body.error, error);
}

async function assertClientAuthError(response: Response): Promise<void> {
  await assertOAuthError(response, 401, "invalid_client");
  assert.equal(response.headers.get("www-authenticate"), 'Basic realm="ursitoare"');
}

async function jwksOf(fake: FakeOidc): Promise<Jwk[]> {
  const response = await fetch(`${fake.url}${CERTS_PATH}`);
  assert.equal(response.status, 200);
  const body = (await response.json()) as { keys: Jwk[] };
  return body.keys;
}

async function exchangedTokens(fake: FakeOidc, options: LoginOptions = {}): Promise<TokenResponse> {
  const code = await login(fake, options);
  const response = await exchange(fake, code);
  assert.equal(response.status, 200);
  return (await response.json()) as TokenResponse;
}

test("C-e78e84c8 a confidential code exchange returns tokens for the engine client", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const code = await login(fake);
    const response = await exchange(fake, code);

    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(
      (response.headers.get("content-type") ?? "").includes("application/json"),
      true,
    );

    const body = (await response.json()) as TokenResponse;
    assert.equal(typeof body.access_token, "string");
    assert.ok(body.access_token.length > 0);
    assert.equal(typeof body.id_token, "string");
    assert.ok(body.id_token.length > 0);
    assert.equal(body.token_type, "Bearer");
    assert.equal(body.expires_in, 300);
    assert.equal(body.scope, DEFAULT_SCOPE);

    assert.equal(decodeJwt(body.access_token).payload["preferred_username"], "alice");
    assert.equal(decodeJwt(body.id_token).payload["preferred_username"], "alice");
  });
});

test("C-9366113b a code is single use even when exchanges run in parallel", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    const code = await login(fake);
    const first = await exchange(fake, code);
    assert.equal(first.status, 200);
    await first.text();

    const replay = await exchange(fake, code);
    await assertOAuthError(replay, 400, "invalid_grant");

    const parallelCode = await login(fake, { state: "s2" });
    const responses = await Promise.all([
      exchange(fake, parallelCode),
      exchange(fake, parallelCode),
    ]);
    const statuses = responses.map((response) => response.status).sort((left, right) => left - right);
    assert.deepEqual(statuses, [200, 400]);

    const accepted = responses.find((response) => response.status === 200);
    const rejected = responses.find((response) => response.status === 400);
    assert.ok(accepted !== undefined);
    assert.ok(rejected !== undefined);
    await assertOAuthError(rejected, 400, "invalid_grant");
    await accepted.text();
  });
});

test("C-3b4f2bde a code expires exactly sixty seconds after issue on the injected clock", async () => {
  await assert.doesNotReject(async () => {
    let current = NOW;
    const fake = await startFake({ now: () => current });

    const firstCode = await login(fake, { state: "s1" });
    current = new Date(NOW.getTime() + 59000);
    const withinLifetime = await exchange(fake, firstCode);
    assert.equal(withinLifetime.status, 200);
    await withinLifetime.text();

    const secondCode = await login(fake, { state: "s2" });
    current = new Date(current.getTime() + 60000);
    const expired = await exchange(fake, secondCode);
    await assertOAuthError(expired, 400, "invalid_grant");
  });
});

test("C-868f25bb a failed verifier attempt consumes the code and a redirect mismatch is refused", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    const code = await login(fake);
    const wrongVerifier = await exchange(fake, code, { verifier: "B".repeat(43) });
    await assertOAuthError(wrongVerifier, 400, "invalid_grant");

    const afterFailedAttempt = await exchange(fake, code);
    await assertOAuthError(afterFailedAttempt, 400, "invalid_grant");

    const secondCode = await login(fake, { state: "s2" });
    const mismatchedRedirect = await exchange(fake, secondCode, {
      redirectUri: "http://127.0.0.1:9/other",
    });
    await assertOAuthError(mismatchedRedirect, 400, "invalid_grant");
  });
});

test("C-a6e0ee6b client authentication refuses a bad or absent secret and cross-client codes", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const engineSecret = fake.clientSecret("ursitoare-engine");

    const wrongSecretCode = await login(fake);
    const wrongSecret = await exchange(fake, wrongSecretCode, {
      secret: `${engineSecret}-wrong`,
    });
    await assertClientAuthError(wrongSecret);

    const absentHeaderCode = await login(fake);
    const absentHeader = await exchange(fake, absentHeaderCode, { basic: false });
    await assertClientAuthError(absentHeader);

    const formOnlyCode = await login(fake);
    const formOnly = await tokenRequest(fake, {
      grant_type: "authorization_code",
      code: formOnlyCode,
      redirect_uri: REDIRECT,
      code_verifier: VERIFIER,
      client_id: "ursitoare-engine",
      client_secret: engineSecret,
    });
    await assertClientAuthError(formOnly);

    const mcpCode = await login(fake, { clientId: "ursitoare-mcp", state: "s4" });
    const crossClient = await exchange(fake, mcpCode, { clientId: "ursitoare-engine" });
    await assertOAuthError(crossClient, 400, "invalid_grant");
  });
});

test("C-e4b64277 the token endpoint refuses other grants JSON bodies and a missing code", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const authorization = basic(
      "ursitoare-engine",
      fake.clientSecret("ursitoare-engine"),
    );

    const passwordGrant = await tokenRequest(
      fake,
      {
        grant_type: "password",
        username: "alice",
        password: fake.passwordOf("alice"),
      },
      { authorization },
    );
    await assertOAuthError(passwordGrant, 400, "unsupported_grant_type");

    const jsonBody = await tokenRequest(fake, {}, {
      contentType: "application/json",
      body: JSON.stringify({ grant_type: "authorization_code", code: "x" }),
    });
    await assertOAuthError(jsonBody, 400, "invalid_request");

    const missingCode = await tokenRequest(
      fake,
      {
        grant_type: "authorization_code",
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
      },
      { authorization },
    );
    await assertOAuthError(missingCode, 400, "invalid_request");
  });
});

test("C-057cfe90 a public client exchanges a code with PKCE only and has no secret", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });

    const code = await login(fake, { clientId: "ursitoare-mcp" });
    const response = await exchange(fake, code, {
      clientId: "ursitoare-mcp",
      basic: false,
    });
    assert.equal(response.status, 200);

    const body = (await response.json()) as TokenResponse;
    assert.equal(decodeJwt(body.access_token).payload["aud"], "ursitoare-mcp");

    assert.throws(
      () => fake.clientSecret("ursitoare-mcp"),
      (error: unknown) => {
        assert.ok(error instanceof FakeOidcError);
        assert.equal(error.code, "FAKE_OIDC_PUBLIC_CLIENT");
        return true;
      },
    );
  });
});

test("C-c940079f an exchanged id token for alice carries the Keycloak claim shape", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const body = await exchangedTokens(fake, {
      username: "alice",
      scope: DEFAULT_SCOPE,
      nonce: "n-1",
    });
    const decoded = decodeJwt(body.id_token);
    const payload = decoded.payload;

    assert.equal(decoded.header["alg"], "RS256");
    assert.equal(decoded.header["typ"], "JWT");
    const keys = await jwksOf(fake);
    const key = keys.find((candidate) => candidate.kid === decoded.header["kid"]);
    assert.ok(key !== undefined);
    assert.equal(verifyRs256(body.id_token, key), true);

    assert.equal(payload["iss"], fake.issuer);
    assert.equal(payload["aud"], "ursitoare-engine");
    assert.equal(payload["azp"], "ursitoare-engine");
    assert.equal(payload["typ"], "ID");
    assert.equal(payload["iat"], 1792929600);
    assert.equal(payload["exp"], 1792929900);
    assert.equal(payload["nonce"], "n-1");
    assert.equal(payload["email"], "alice@example.invalid");
    assert.equal(payload["name"], "Alice Example");
    assert.equal(payload["preferred_username"], "alice");
    assert.deepEqual(payload["organization"], ["org-a"]);
    assert.deepEqual(payload["groups"], ["ursitoare-authors", "team-finance"]);
  });
});

test("C-d7a517bf exchanged tokens for the seed users carry their groups and stable subjects", async () => {
  await assert.doesNotReject(async () => {
    const first = await startFake({ now: () => NOW });
    const second = await startFake({ now: () => NOW });

    const claimsFor = async (
      fake: FakeOidc,
      username: string,
    ): Promise<Record<string, unknown>> => {
      const body = await exchangedTokens(fake, {
        username,
        scope: DEFAULT_SCOPE,
        state: `state-${username}`,
      });
      return decodeJwt(body.id_token).payload;
    };

    const alice = await claimsFor(first, "alice");
    const bob = await claimsFor(first, "bob");
    const carol = await claimsFor(first, "carol");
    const mallory = await claimsFor(first, "mallory");
    const aliceFromSecondFake = await claimsFor(second, "alice");

    assert.deepEqual(bob["groups"], ["ursitoare-approvers", "team-finance"]);
    assert.deepEqual(carol["groups"], ["ursitoare-admins"]);
    assert.deepEqual(mallory["groups"], ["ursitoare-authors"]);
    assert.deepEqual(bob["organization"], ["org-a"]);
    assert.deepEqual(carol["organization"], ["org-a"]);
    assert.deepEqual(mallory["organization"], ["org-b"]);

    for (const payload of [alice, bob, carol, mallory]) {
      assert.match(String(payload["sub"]), UUID);
    }
    assert.equal(aliceFromSecondFake["sub"], alice["sub"]);
    assert.notEqual(bob["sub"], alice["sub"]);
  });
});

test("C-5a6e5b58 scope gates organisation and nonce and the access token shares the id token sid", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake({ now: () => NOW });
    const body = await exchangedTokens(fake, {
      username: "alice",
      scope: "openid profile email",
    });
    const id = decodeJwt(body.id_token).payload;
    const access = decodeJwt(body.access_token).payload;

    assert.equal("organization" in id, false);
    assert.equal("nonce" in id, false);
    assert.equal(access["typ"], "Bearer");
    assert.equal(access["azp"], "ursitoare-engine");
    assert.equal(access["aud"], "ursitoare-engine");
    assert.equal(access["scope"], "openid profile email");
    assert.equal(typeof access["sid"], "string");
    assert.equal(access["sid"], id["sid"]);
  });
});
