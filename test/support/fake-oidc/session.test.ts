import assert from "node:assert/strict";
import { after, test } from "node:test";

import { decodeJwt } from "./jwt.ts";
import { startFakeOidc } from "./server.ts";
import type { FakeOidc } from "./types.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT = "http://127.0.0.1:9/cb";
const POST_LOGOUT = "http://127.0.0.1:9/bye";
const AUTH_PATH = "/realms/ursitoare/protocol/openid-connect/auth";
const TOKEN_PATH = "/realms/ursitoare/protocol/openid-connect/token";
const USERINFO_PATH = "/realms/ursitoare/protocol/openid-connect/userinfo";
const LOGOUT_PATH = "/realms/ursitoare/protocol/openid-connect/logout";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const SCOPE = "openid profile email organization";

type Tokens = Readonly<{
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}>;

type Profile = Readonly<{
  sub?: unknown;
  email?: unknown;
  name?: unknown;
  preferred_username?: unknown;
  organization?: unknown;
  groups?: unknown;
}>;

const fakes: FakeOidc[] = [];

async function startFake(): Promise<FakeOidc> {
  const fake = await startFakeOidc({ now: () => NOW });
  fake.registerRedirect(REDIRECT);
  fakes.push(fake);
  return fake;
}

after(async () => {
  await Promise.all(fakes.map((fake) => fake.close()));
});

function basic(clientId: string, secret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${secret}`).toString("base64")}`;
}

async function login(fake: FakeOidc, username = "alice"): Promise<string> {
  const params = new URLSearchParams({
    client_id: "ursitoare-engine",
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    state: "s1",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
  });
  const response = await fetch(`${fake.url}${AUTH_PATH}?${params.toString()}`, {
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

async function exchange(fake: FakeOidc, code: string): Promise<Tokens> {
  const response = await fetch(`${fake.url}${TOKEN_PATH}`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: basic("ursitoare-engine", fake.clientSecret("ursitoare-engine")),
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT,
      code_verifier: VERIFIER,
    }).toString(),
  });
  assert.equal(response.status, 200);
  return (await response.json()) as Tokens;
}

async function signIn(fake: FakeOidc): Promise<Tokens> {
  const code = await login(fake);
  return exchange(fake, code);
}

function userinfo(
  fake: FakeOidc,
  token: string | undefined,
  method: "GET" | "POST" = "GET",
): Promise<Response> {
  const headers: Record<string, string> =
    token === undefined ? {} : { authorization: `Bearer ${token}` };
  return fetch(`${fake.url}${USERINFO_PATH}`, {
    method,
    headers,
    redirect: "manual",
  });
}

function logout(fake: FakeOidc, params: Record<string, string>): Promise<Response> {
  return fetch(`${fake.url}${LOGOUT_PATH}?${new URLSearchParams(params).toString()}`, {
    redirect: "manual",
  });
}

function locationOf(response: Response): URL {
  const location = response.headers.get("location");
  assert.ok(location !== null, "expected a Location header");
  return new URL(location);
}

function contentTypeOf(response: Response): string {
  return (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
}

async function assertInvalidToken(response: Response): Promise<void> {
  assert.equal(response.status, 401);
  const body = (await response.json()) as { error?: unknown };
  assert.equal(body.error, "invalid_token");
  assert.match(response.headers.get("www-authenticate") ?? "", /^Bearer\b/);
}

async function assertBadLogout(response: Response): Promise<void> {
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("location"), null);
  const body = (await response.json()) as { error?: unknown };
  assert.equal(body.error, "invalid_request");
}

test("C-e3681a90 userinfo answers GET and POST with profile claims for a live access token", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const tokens = await signIn(fake);
    const subject = decodeJwt(tokens.access_token).payload["sub"];
    assert.equal(typeof subject, "string");

    for (const method of ["GET", "POST"] as const) {
      const response = await userinfo(fake, tokens.access_token, method);
      assert.equal(response.status, 200);
      assert.equal(contentTypeOf(response), "application/json");

      const profile = (await response.json()) as Profile;
      assert.equal(profile.sub, subject);
      assert.equal(profile.email, "alice@example.invalid");
      assert.equal(profile.name, "Alice Example");
      assert.equal(profile.preferred_username, "alice");
      assert.deepEqual(profile.organization, ["org-a"]);
      assert.deepEqual(profile.groups, ["ursitoare-authors", "team-finance"]);
    }
  });
});

test("C-4fc3edb7 userinfo refuses a missing or bad bearer token", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();

    await assertInvalidToken(await userinfo(fake, undefined));
    await assertInvalidToken(await userinfo(fake, "garbage"));

    for (const flaw of ["expired", "foreign_key", "alg_none"] as const) {
      const token = fake.mintToken({ kind: "access", flaw });
      await assertInvalidToken(await userinfo(fake, token));
    }
  });
});

test("C-9a6dc816 logout ends the session and redirects with the unchanged state", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const tokens = await signIn(fake);

    const response = await logout(fake, {
      id_token_hint: tokens.id_token,
      post_logout_redirect_uri: REDIRECT,
      state: "s2",
    });
    assert.equal(response.status, 302);
    const location = locationOf(response);
    assert.equal(`${location.origin}${location.pathname}`, REDIRECT);
    assert.equal(location.searchParams.get("state"), "s2");

    await assertInvalidToken(await userinfo(fake, tokens.access_token));

    const again = await logout(fake, {
      id_token_hint: tokens.id_token,
      post_logout_redirect_uri: REDIRECT,
      state: "s2",
    });
    assert.equal(again.status, 302);
  });
});

test("C-674cee11 logout refuses an unregistered target and a bad id token hint", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const tokens = await signIn(fake);

    await assertBadLogout(
      await logout(fake, {
        id_token_hint: tokens.id_token,
        post_logout_redirect_uri: "https://evil.example/x",
      }),
    );
    await assertBadLogout(await logout(fake, { id_token_hint: "garbage" }));
    await assertBadLogout(await logout(fake, {}));
    await assertBadLogout(await logout(fake, { id_token_hint: fake.mintToken({ flaw: "alg_none" }) }));
    await assertBadLogout(
      await logout(fake, { id_token_hint: fake.mintToken({ flaw: "foreign_key" }) }),
    );

    const stillLive = await userinfo(fake, tokens.access_token);
    assert.equal(stillLive.status, 200);
  });
});

test("C-a4d2ab09 logout accepts a registered post logout uri and shows a logged out page without one", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    fake.registerRedirect(POST_LOGOUT, { postLogout: true });

    const first = await signIn(fake);
    const redirected = await logout(fake, {
      id_token_hint: first.id_token,
      post_logout_redirect_uri: POST_LOGOUT,
    });
    assert.equal(redirected.status, 302);
    const location = locationOf(redirected);
    assert.equal(`${location.origin}${location.pathname}`, POST_LOGOUT);

    const second = await signIn(fake);
    const page = await logout(fake, { id_token_hint: second.id_token });
    assert.equal(page.status, 200);
    assert.equal(contentTypeOf(page), "text/html");
    const html = await page.text();
    assert.equal(html.includes("You are logged out"), true);
  });
});
