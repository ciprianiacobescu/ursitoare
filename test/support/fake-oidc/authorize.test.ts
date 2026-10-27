import assert from "node:assert/strict";
import { after, test } from "node:test";

import { startFakeOidc } from "./server.ts";
import type { FakeOidc } from "./types.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT = "http://127.0.0.1:9/cb";
const AUTH_PATH = "/realms/ursitoare/protocol/openid-connect/auth";
const CHALLENGE = "A".repeat(43);

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

type AuthParams = Record<string, string>;

function validParams(overrides: AuthParams = {}): AuthParams {
  return {
    client_id: "ursitoare-engine",
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: "openid profile email",
    state: "s1",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
    ...overrides,
  };
}

function queryOf(params: AuthParams): string {
  return new URLSearchParams(params).toString();
}

function authUrl(fake: FakeOidc, params: AuthParams): string {
  return `${fake.issuer}${AUTH_PATH}?${queryOf(params)}`;
}

function getAuth(fake: FakeOidc, params: AuthParams): Promise<Response> {
  return fetch(authUrl(fake, params), { redirect: "manual" });
}

function postAuth(
  fake: FakeOidc,
  params: AuthParams,
  form: AuthParams,
): Promise<Response> {
  return fetch(authUrl(fake, params), {
    method: "POST",
    redirect: "manual",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, ...form }).toString(),
  });
}

function contentTypeOf(response: Response): string {
  return (response.headers.get("content-type") ?? "").split(";")[0]?.trim() ?? "";
}

function locationOf(response: Response): URL {
  const location = response.headers.get("location");
  assert.ok(location !== null, "expected a Location header");
  return new URL(location);
}

function escapeQuery(value: string): string {
  return value.replaceAll("&", "&amp;");
}

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("C-7e2314fa authorization GET renders the accessible Keycloak form for a valid request", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const params = validParams();
    const query = queryOf(params);
    const response = await fetch(`${fake.issuer}${AUTH_PATH}?${query}`, {
      redirect: "manual",
    });

    assert.equal(response.status, 200);
    assert.equal(contentTypeOf(response), "text/html");
    const html = await response.text();

    assert.equal(html.includes('<html lang="en">'), true);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.equal(count(html, "<h1"), 1);

    const action = escapeQuery(`${AUTH_PATH}?${query}`);
    assert.equal(
      html.includes(`<form id="kc-form-login" method="post" action="${action}"`),
      true,
    );
    assert.equal(html.includes('<label for="username">Username or email</label>'), true);
    assert.equal(
      html.includes(
        '<input id="username" name="username" type="text" autocomplete="username">',
      ),
      true,
    );
    assert.equal(html.includes('<label for="password">Password</label>'), true);
    assert.equal(
      html.includes(
        '<input id="password" name="password" type="password" autocomplete="current-password">',
      ),
      true,
    );
    assert.equal(
      html.includes('<button id="kc-login" type="submit">Sign In</button>'),
      true,
    );

    assert.equal(count(html, "Username or email"), 1);
    assert.equal(count(html, "Password"), 1);
    assert.equal(count(html, "Sign In"), 1);
  });
});

test("C-c07974a7 authorization POST signs alice in and redirects with a fresh one-use code", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const form = { username: "alice", password: fake.passwordOf("alice") };

    const first = await postAuth(fake, validParams(), form);
    assert.equal(first.status, 302);
    const firstLocation = locationOf(first);
    assert.equal(firstLocation.origin + firstLocation.pathname, REDIRECT);
    assert.equal(firstLocation.searchParams.get("state"), "s1");
    const firstCode = firstLocation.searchParams.get("code");
    assert.ok(firstCode !== null);
    assert.ok(firstCode.length >= 43);

    const second = await postAuth(fake, validParams(), form);
    assert.equal(second.status, 302);
    const secondCode = locationOf(second).searchParams.get("code");
    assert.ok(secondCode !== null);
    assert.notEqual(firstCode, secondCode);
  });
});

test("C-388a916a authorization rejects a redirect uri or client that is not an exact match", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const cases: ReadonlyArray<readonly [AuthParams, string]> = [
      [validParams({ redirect_uri: `${REDIRECT}/` }), "Invalid parameter: redirect_uri"],
      [validParams({ redirect_uri: `${REDIRECT}?x=1` }), "Invalid parameter: redirect_uri"],
      [validParams({ redirect_uri: "https://evil.example/cb" }), "Invalid parameter: redirect_uri"],
      [validParams({ client_id: "nope" }), "Invalid parameter: client_id"],
    ];

    for (const [params, message] of cases) {
      const response = await getAuth(fake, params);
      assert.equal(response.status, 400);
      assert.equal(contentTypeOf(response), "text/html");
      assert.equal(response.headers.get("location"), null);
      const html = await response.text();
      assert.equal(html.includes(message), true);
      assert.equal(html.includes("<form"), false);
    }
  });
});

test("C-63de56cb redirects are stored as given and belong to their client", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    fake.registerRedirect("http://127.0.0.1:9");
    fake.registerRedirect("http://127.0.0.1:9/m", { clientId: "ursitoare-mcp" });

    const engineBare = await getAuth(
      fake,
      validParams({ redirect_uri: "http://127.0.0.1:9" }),
    );
    assert.equal(engineBare.status, 200);
    assert.equal((await engineBare.text()).includes("<form"), true);

    const engineWithSlash = await getAuth(
      fake,
      validParams({ redirect_uri: "http://127.0.0.1:9/" }),
    );
    assert.equal(engineWithSlash.status, 400);
    assert.equal(
      (await engineWithSlash.text()).includes("Invalid parameter: redirect_uri"),
      true,
    );

    const engineOnMcp = await getAuth(
      fake,
      validParams({ redirect_uri: "http://127.0.0.1:9/m" }),
    );
    assert.equal(engineOnMcp.status, 400);
    assert.equal(
      (await engineOnMcp.text()).includes("Invalid parameter: redirect_uri"),
      true,
    );

    const mcpOnMcp = await getAuth(
      fake,
      validParams({ client_id: "ursitoare-mcp", redirect_uri: "http://127.0.0.1:9/m" }),
    );
    assert.equal(mcpOnMcp.status, 200);
    assert.equal((await mcpOnMcp.text()).includes("<form"), true);
  });
});

test("C-d4e4e5a6 protocol errors redirect to the client with the unchanged state and no code", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const cases: ReadonlyArray<readonly [AuthParams, string]> = [
      [validParams({ code_challenge_method: "plain" }), "invalid_request"],
      [validParams({ code_challenge: "" }), "invalid_request"],
      [validParams({ response_type: "token" }), "unsupported_response_type"],
      [validParams({ scope: "profile" }), "invalid_scope"],
    ];

    for (const [params, expectedError] of cases) {
      const response = await getAuth(fake, params);
      assert.equal(response.status, 302);
      const location = locationOf(response);
      assert.equal(location.origin + location.pathname, REDIRECT);
      assert.equal(location.searchParams.get("error"), expectedError);
      assert.equal(location.searchParams.get("state"), "s1");
      assert.equal(location.searchParams.has("code"), false);
    }
  });
});

test("C-ba36cf88 C-8905a65e wrong password and unknown user look alike and the password is never echoed", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();

    const alicePassword = fake.passwordOf("alice");
    const submitted = `wrong-${alicePassword}`;
    const alice = await postAuth(fake, validParams(), {
      username: "alice",
      password: submitted,
    });
    assert.equal(alice.status, 200);
    assert.equal(alice.headers.get("location"), null);
    const aliceHtml = await alice.text();
    assert.equal(
      aliceHtml.includes(
        '<p id="input-error" role="alert">Invalid username or password.</p>',
      ),
      true,
    );
    assert.equal(
      aliceHtml.includes(
        '<input id="username" name="username" type="text" autocomplete="username" value="alice">',
      ),
      true,
    );
    assert.equal(aliceHtml.includes(submitted), false);

    const evePassword = "any-password-eve-chooses";
    const eve = await postAuth(fake, validParams(), {
      username: "eve",
      password: evePassword,
    });
    assert.equal(eve.status, 200);
    assert.equal(eve.headers.get("location"), null);
    const eveHtml = await eve.text();
    assert.equal(
      eveHtml.includes(
        '<p id="input-error" role="alert">Invalid username or password.</p>',
      ),
      true,
    );
    assert.equal(
      eveHtml.includes(
        '<input id="username" name="username" type="text" autocomplete="username" value="eve">',
      ),
      true,
    );
    assert.equal(eveHtml.includes(evePassword), false);
  });
});
