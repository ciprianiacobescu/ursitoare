import assert from "node:assert/strict";
import { after, before, test } from "node:test";

import { completeFakeLogin } from "../oidc-login.ts";
import { oidcApi } from "./oidc-part.ts";
import type { E2eStack } from "./stack.ts";
import { startE2eStack } from "./stack.ts";

assert.equal(typeof startE2eStack, "function");

let stack: E2eStack | undefined;

before(async () => {
  stack = await startE2eStack({ port: 0, controlPort: 0 });
});

after(async () => {
  await stack?.close();
});

function running(): E2eStack {
  assert.ok(stack !== undefined);
  return stack;
}

function cookieValue(response: Response, name: string): string | undefined {
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(";")[0] ?? "";
    if (pair.startsWith(`${name}=`)) {
      return pair.slice(name.length + 1);
    }
  }
  return undefined;
}

async function signIn(current: E2eStack, username: string): Promise<string> {
  const fake = oidcApi(current.handles).fake;
  const login = await fetch(`${current.url}/auth/oidc/login?return_to=%2F`, { redirect: "manual" });
  const authorizationUrl = login.headers.get("location") ?? "";
  const loginCookie = cookieValue(login, "ursitoare_login") ?? "";
  const callbackUrl = await completeFakeLogin(fake, authorizationUrl, username);
  const callback = await fetch(callbackUrl, {
    redirect: "manual",
    headers: { cookie: `ursitoare_login=${loginCookie}` },
  });
  return cookieValue(callback, "ursitoare_session") ?? "";
}

function meOf(current: E2eStack, session: string | null): Promise<Response> {
  const headers: Record<string, string> = session === null ? {} : { cookie: `ursitoare_session=${session}` };
  return fetch(`${current.url}/api/v1/me`, { headers });
}

function logoutOf(current: E2eStack, session: string, csrf: string | null): Promise<Response> {
  const headers: Record<string, string> = { cookie: `ursitoare_session=${session}` };
  if (csrf !== null) {
    headers["x-csrf-token"] = csrf;
  }
  return fetch(`${current.url}/auth/oidc/logout`, { method: "POST", headers });
}

test("C-79192192: alice and mallory see their own tenant through the real engine", async () => {
  const current = running();
  assert.equal(current.handles.has("tenant-b"), true);

  const fake = oidcApi(current.handles).fake;
  const seedResponse = await fetch(`${current.controlUrl}/seed`);
  assert.equal(seedResponse.status, 200);
  const seed = (await seedResponse.json()) as { users: Record<string, { password: string }> };
  assert.deepEqual(Object.keys(seed.users).sort(), ["alice", "bob", "carol", "mallory"]);
  for (const username of ["alice", "bob", "carol", "mallory"]) {
    assert.equal(seed.users[username]?.password, fake.passwordOf(username));
  }

  const aliceSession = await signIn(current, "alice");
  const mallorySession = await signIn(current, "mallory");
  assert.ok(aliceSession.length > 0);
  assert.ok(mallorySession.length > 0);

  const aliceMe = await meOf(current, aliceSession);
  assert.equal(aliceMe.status, 200);
  const aliceText = await aliceMe.text();
  const alice = JSON.parse(aliceText) as {
    user: { displayName: string };
    tenant: { name: string };
    capabilities: string[];
    csrfToken: string;
  };
  assert.equal(alice.user.displayName, "Alice Example");
  assert.equal(alice.tenant.name, "E2E tenant");
  assert.ok(alice.capabilities.includes("read_self"));

  const malloryMe = await meOf(current, mallorySession);
  assert.equal(malloryMe.status, 200);
  const malloryText = await malloryMe.text();
  assert.equal((JSON.parse(malloryText) as { tenant: { name: string } }).tenant.name, "Tenant B");
  assert.equal(malloryText.includes("E2E tenant"), false);
  assert.equal(aliceText.includes("Tenant B"), false);

  const anonymous = await meOf(current, null);
  assert.equal(anonymous.status, 401);
  assert.equal(((await anonymous.json()) as { error: { code: string } }).error.code, "UNAUTHENTICATED");

  const refused = await logoutOf(current, aliceSession, null);
  assert.equal(refused.status, 403);
  assert.equal(((await refused.json()) as { error: { code: string } }).error.code, "OIDC_CSRF_INVALID");

  const accepted = await logoutOf(current, aliceSession, alice.csrfToken);
  assert.equal(accepted.status, 200);
  assert.equal(typeof ((await accepted.json()) as { redirect: unknown }).redirect, "string");

  const ended = await meOf(current, aliceSession);
  assert.equal(ended.status, 401);
});
