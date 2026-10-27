import assert from "node:assert/strict";
import http from "node:http";
import { after, test } from "node:test";

import { FakeOidcError, oidcContract, startFakeOidc } from "./index.ts";
import type { FakeOidc, OidcContractCredentials } from "./index.ts";

const NOW = new Date("2026-10-25T12:00:00Z");
const REDIRECT = "http://127.0.0.1:9/cb";
const AUTH_PATH = "/realms/ursitoare/protocol/openid-connect/auth";
const TOKEN_PATH = "/realms/ursitoare/protocol/openid-connect/token";
const USERINFO_PATH = "/realms/ursitoare/protocol/openid-connect/userinfo";
const LOGOUT_PATH = "/realms/ursitoare/protocol/openid-connect/logout";
const VERIFIER = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
const CHALLENGE = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
const SCOPE = "openid profile email organization";
const REDACTED = "[redacted]";

const CHECK_NAMES = [
  "discovery document",
  "jwks keys",
  "code flow with PKCE",
  "claims of the id token",
  "userinfo with the access token",
  "wrong password shows the error",
  "plain PKCE is refused",
  "code is single use",
  "redirect uri must match exactly",
  "logout ends the session",
] as const;

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

function credentialsFor(fake: FakeOidc): OidcContractCredentials {
  return {
    clientId: "ursitoare-engine",
    clientSecret: fake.clientSecret("ursitoare-engine"),
    redirectUri: REDIRECT,
    username: "alice",
    password: fake.passwordOf("alice"),
    organization: "org-a",
    groups: ["ursitoare-authors", "team-finance"],
  };
}

function credentialsLiteral(): OidcContractCredentials {
  return {
    clientId: "ursitoare-engine",
    clientSecret: "stub-client-secret",
    redirectUri: REDIRECT,
    username: "alice",
    password: "stub-user-password",
    organization: "org-a",
    groups: ["ursitoare-authors", "team-finance"],
  };
}

function authUrlOf(fake: FakeOidc): string {
  const params = new URLSearchParams({
    client_id: "ursitoare-engine",
    redirect_uri: REDIRECT,
    response_type: "code",
    scope: SCOPE,
    state: "s1",
    nonce: "n-1",
    code_challenge: CHALLENGE,
    code_challenge_method: "S256",
  });
  return `${fake.url}${AUTH_PATH}?${params.toString()}`;
}

type StubProvider = Readonly<{ baseUrl: string; close(): Promise<void> }>;

function startBrokenProvider(): Promise<StubProvider> {
  return new Promise<StubProvider>((resolve, reject) => {
    let baseUrl = "";
    const server = http.createServer((request, response) => {
      const path = new URL(request.url ?? "/", "http://placeholder.invalid").pathname;
      if (path === "/.well-known/openid-configuration") {
        response.writeHead(200, { "content-type": "application/json" });
        response.end(JSON.stringify({ issuer: baseUrl }));
        return;
      }
      response.writeHead(404, { "content-type": "application/json" });
      response.end(JSON.stringify({ error: "not_found" }));
    });
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (address === null || typeof address === "string") {
        reject(new Error("the stub provider has no TCP address"));
        return;
      }
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve({
        baseUrl,
        close: () =>
          new Promise<void>((done, fail) => {
            server.closeAllConnections();
            server.close((error) => {
              if (error === undefined) done();
              else fail(error);
            });
          }),
      });
    });
  });
}

for (const name of CHECK_NAMES) {
  test(`C-34b4df4c ${name}`, async () => {
    await assert.doesNotReject(async () => {
      const fake = await startFake();
      const checks = oidcContract(fake.issuer, credentialsFor(fake));
      const check = checks.find((candidate) => candidate.name === name);
      assert.ok(check !== undefined, `the contract does not expose the check ${name}`);
      await check.run();
    });
  });
}

test("C-34b4df4c the contract exposes the ten named checks in the documented order", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const checks = oidcContract(fake.issuer, credentialsFor(fake));
    assert.deepEqual(
      checks.map((check) => check.name),
      [...CHECK_NAMES],
    );
  });
});

test("C-81c01272 a broken provider fails the discovery and jwks checks with AssertionError", async () => {
  await assert.doesNotReject(async () => {
    const provider = await startBrokenProvider();
    try {
      const checks = oidcContract(provider.baseUrl, credentialsLiteral());
      for (const name of ["discovery document", "jwks keys"]) {
        const check = checks.find((candidate) => candidate.name === name);
        assert.ok(check !== undefined, `the contract does not expose the check ${name}`);
        await assert.rejects(
          check.run(),
          (error: unknown) => error instanceof assert.AssertionError,
        );
      }
    } finally {
      await provider.close();
    }
  });
});

test("C-be50043b every contract check reports FAKE_OIDC_CONTRACT_UNREACHABLE for a closed port", async () => {
  await assert.doesNotReject(async () => {
    const closed = await startFakeOidc({ now: () => NOW });
    const baseUrl = closed.issuer;
    await closed.close();

    const checks = oidcContract(baseUrl, credentialsLiteral());
    assert.equal(checks.length, CHECK_NAMES.length);
    for (const check of checks) {
      await assert.rejects(check.run(), (error: unknown) => {
        assert.ok(error instanceof FakeOidcError);
        assert.equal(error.code, "FAKE_OIDC_CONTRACT_UNREACHABLE");
        return true;
      });
    }
  });
});

test("C-642bcf7e a full flow records the request log with every secret redacted", async () => {
  await assert.doesNotReject(async () => {
    const fake = await startFake();
    const password = fake.passwordOf("alice");
    const clientSecret = fake.clientSecret("ursitoare-engine");
    const authUrl = authUrlOf(fake);

    const form = await fetch(authUrl, { redirect: "manual" });
    assert.equal(form.status, 200);
    await form.text();

    const signIn = await fetch(authUrl, {
      method: "POST",
      redirect: "manual",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ username: "alice", password }).toString(),
    });
    assert.equal(signIn.status, 302);
    const location = signIn.headers.get("location");
    assert.ok(location !== null);
    const code = new URL(location).searchParams.get("code");
    assert.ok(code !== null);

    const exchange = await fetch(`${fake.url}${TOKEN_PATH}`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${Buffer.from(`ursitoare-engine:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT,
        code_verifier: VERIFIER,
      }).toString(),
    });
    assert.equal(exchange.status, 200);
    const tokens = (await exchange.json()) as { access_token: string; id_token: string };

    const profile = await fetch(`${fake.url}${USERINFO_PATH}`, {
      redirect: "manual",
      headers: { authorization: `Bearer ${tokens.access_token}` },
    });
    assert.equal(profile.status, 200);
    await profile.text();

    const logout = await fetch(
      `${fake.url}${LOGOUT_PATH}?${new URLSearchParams({
        id_token_hint: tokens.id_token,
        post_logout_redirect_uri: REDIRECT,
        state: "s2",
      }).toString()}`,
      { redirect: "manual" },
    );
    assert.equal(logout.status, 302);
    await logout.text();

    const log = fake.requests();
    const serialized = JSON.stringify(log);
    for (const secret of [
      password,
      clientSecret,
      code,
      VERIFIER,
      tokens.access_token,
      tokens.id_token,
    ]) {
      assert.equal(serialized.includes(secret), false, "a secret reached the request log");
    }
    assert.equal(serialized.includes("Basic"), false);

    const signInEntry = log.find(
      (entry) => entry.method === "POST" && entry.path === AUTH_PATH,
    );
    assert.ok(signInEntry !== undefined);
    assert.equal(signInEntry.form["password"], REDACTED);
    assert.equal(signInEntry.form["username"], "alice");

    const logoutEntry = log.find((entry) => entry.path === LOGOUT_PATH);
    assert.ok(logoutEntry !== undefined);
    assert.equal(logoutEntry.query["id_token_hint"], REDACTED);
    assert.equal(logoutEntry.query["state"], "s2");

    const formEntry = log.find((entry) => entry.method === "GET" && entry.path === AUTH_PATH);
    assert.ok(formEntry !== undefined);
    assert.equal(formEntry.query["state"], "s1");
    assert.equal(formEntry.query["nonce"], "n-1");
    assert.equal(formEntry.query["code_challenge"], CHALLENGE);

    for (const entry of log) {
      assert.equal(typeof entry.path, "string");
      assert.equal(typeof entry.status, "number");
    }

    const first = fake.requests();
    first.pop();
    const second = fake.requests();
    assert.equal(second.length, first.length + 1);
  });
});
