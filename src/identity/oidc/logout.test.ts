import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildServer } from "../../api/index.ts";
import type { ServerDeps } from "../../api/index.ts";
import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import {
  resolveTenantBy,
  type TenantPool,
} from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import {
  issueCsrfToken,
  provisionTenantIdp,
  registerOidcRoutes,
  resolveSession,
} from "../index.ts";
import type { OidcRoutesDeps, SessionContext } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";
const CALLBACK_URL = "http://127.0.0.1:8080/auth/oidc/callback";
const SIGN_IN_URL = "http://127.0.0.1:8080/sign-in";
const ENGINE_KEY = "k".repeat(64);
const LOGIN_COOKIE = "ursitoare_login";
const SESSION_COOKIE = "ursitoare_session";

interface InjectedResponse {
  statusCode: number;
  body: string;
  headers: Record<string, unknown>;
}

interface InjectOptions {
  method?: string;
  url: string;
  headers?: Record<string, string>;
}

interface LoginStart {
  location: string;
  cookie: string;
  callback: string;
}

interface Setup {
  db: TestDatabase;
  fake: FakeOidc;
  clock: Clock;
  server: FastifyInstance;
}

function serverDeps(): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent" }),
    tracer: noopTracer,
  };
}

function oidcConfig(fake: FakeOidc): {
  issuer: string;
  clientId: string;
  clientSecret: Secret;
} {
  return {
    issuer: fake.issuer,
    clientId: "ursitoare-engine",
    clientSecret: new Secret(fake.clientSecret("ursitoare-engine")),
  };
}

function routeDeps(
  fake: FakeOidc,
  pool: TenantPool,
  clock: Clock,
): OidcRoutesDeps {
  return {
    config: oidcConfig(fake),
    publicBaseUrl: PUBLIC_BASE_URL,
    pool,
    engineKey: { reveal: () => ENGINE_KEY },
    clock,
  };
}

async function registeredServer(deps: OidcRoutesDeps): Promise<FastifyInstance> {
  const server = await buildServer(serverDeps());
  try {
    assert.doesNotThrow(() => {
      registerOidcRoutes(server, deps);
    }, "registerOidcRoutes registers the routes");
    return server;
  } catch (error) {
    await server.close();
    throw error;
  }
}

async function setup(): Promise<Setup> {
  const db = await withTestDatabase();
  const clock = fixedClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, {
      issuer: fake.issuer,
      organization: "org-a",
    });
    fake.registerRedirect(CALLBACK_URL);
    fake.registerRedirect(SIGN_IN_URL, { postLogout: true });
    const server = await registeredServer(routeDeps(fake, db.appPool, clock));
    return { db, fake, clock, server };
  } catch (error) {
    await fake.close();
    await db.close();
    throw error;
  }
}

async function inject(
  server: FastifyInstance,
  options: InjectOptions,
): Promise<InjectedResponse> {
  let response: InjectedResponse | undefined;
  await assert.doesNotReject(async () => {
    response = await server.inject(options);
  }, "server.inject must not reject");
  assert.ok(response !== undefined, "server.inject returns a response");
  return response;
}

function header(response: InjectedResponse, name: string): string {
  const value = response.headers[name];
  assert.equal(typeof value, "string", `the response has a ${name} header`);
  return value as string;
}

function setCookies(response: InjectedResponse): string[] {
  const value = response.headers["set-cookie"];
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === "string");
  }
  return [];
}

function cookieNamed(cookies: readonly string[], name: string): string {
  const prefix = `${name}=`;
  const cookie = cookies.find((entry) => entry.startsWith(prefix));
  assert.ok(cookie !== undefined, `the response sets ${name}`);
  return cookie;
}

function cookieValue(cookies: readonly string[], name: string): string {
  const cookie = cookieNamed(cookies, name);
  const prefix = `${name}=`;
  const rest = cookie.slice(prefix.length);
  const separator = rest.indexOf(";");
  return separator < 0 ? rest : rest.slice(0, separator);
}

function jsonBody(response: InjectedResponse): Record<string, unknown> {
  const parsed = JSON.parse(response.body) as unknown;
  assert.ok(typeof parsed === "object" && parsed !== null, "the body is a JSON object");
  return parsed as Record<string, unknown>;
}

function errorBody(response: InjectedResponse): { code: string; message: string } {
  const body = jsonBody(response);
  const error = body["error"];
  assert.ok(typeof error === "object" && error !== null, "the body holds an error envelope");
  const record = error as Record<string, unknown>;
  assert.equal(typeof record["code"], "string", "the error has a code");
  assert.equal(typeof record["message"], "string", "the error has a message");
  return { code: record["code"] as string, message: record["message"] as string };
}

function callbackPath(callback: string): string {
  const url = new URL(callback);
  return `${url.pathname}${url.search}`;
}

async function startLogin(
  server: FastifyInstance,
  fake: FakeOidc,
): Promise<LoginStart> {
  const response = await inject(server, { method: "GET", url: "/auth/oidc/login" });
  assert.equal(response.statusCode, 302, "login answers a redirect");
  const cookies = setCookies(response);
  const location = header(response, "location");
  const cookie = cookieValue(cookies, LOGIN_COOKIE);
  const callback = await completeFakeLogin(fake, location, "alice");
  return { location, cookie, callback };
}

async function signIn(server: FastifyInstance, fake: FakeOidc): Promise<string> {
  const login = await startLogin(server, fake);
  const response = await inject(server, {
    method: "GET",
    url: callbackPath(login.callback),
    headers: { cookie: `${LOGIN_COOKIE}=${login.cookie}` },
  });
  assert.equal(response.statusCode, 302, "the callback answers a redirect");
  const sessionId = cookieValue(setCookies(response), SESSION_COOKIE);
  assert.match(sessionId, /^[A-Za-z0-9_-]{43}$/, "the session cookie has 43 characters");
  return sessionId;
}

async function issue(
  db: TestDatabase,
  session: SessionContext,
  clock: Clock,
): Promise<string> {
  let token: string | undefined;
  await assert.doesNotReject(async () => {
    token = await issueCsrfToken(db.appPool, session, { clock });
  });
  assert.ok(token !== undefined, "issueCsrfToken returns a token");
  return token;
}

async function resolve(
  db: TestDatabase,
  cookie: string,
  clock: Clock,
): Promise<SessionContext | null> {
  let session: SessionContext | null | undefined;
  await assert.doesNotReject(async () => {
    session = await resolveSession(db.appPool, cookie, { clock });
  });
  assert.ok(session !== undefined, "resolveSession resolves");
  return session;
}

function clearedSessionCookie(response: InjectedResponse): string {
  return cookieNamed(setCookies(response), SESSION_COOKIE);
}

function assertSessionCookieCleared(cookie: string): void {
  assert.match(
    cookie,
    /^ursitoare_session=; Path=\/; Max-Age=0; HttpOnly; SameSite=Lax$/,
    "the session cookie is cleared",
  );
}

async function logout(
  server: FastifyInstance,
  sessionId: string,
  csrfToken?: string,
): Promise<InjectedResponse> {
  const headers: Record<string, string> = { cookie: `${SESSION_COOKIE}=${sessionId}` };
  if (csrfToken !== undefined) headers["x-csrf-token"] = csrfToken;
  return inject(server, { method: "POST", url: "/auth/oidc/logout", headers });
}

test("C-3b93c8c2 Logout revokes the session and returns the provider end-session URL", async () => {
  const { db, fake, clock, server } = await setup();
  try {
    const sessionId = await signIn(server, fake);
    const session = await resolve(db, sessionId, clock);
    assert.ok(session !== null, "the signed-in session resolves");
    const csrfToken = await issue(db, session, clock);

    const response = await logout(server, sessionId, csrfToken);
    assert.equal(response.statusCode, 200, "logout answers 200");
    const body = jsonBody(response);
    const redirect = body["redirect"];
    assert.equal(typeof redirect, "string", "logout returns a redirect URL");
    assert.ok(redirect !== undefined, "the redirect URL is present");

    const target = new URL(redirect as string);
    assert.equal(
      (target.searchParams.get("id_token_hint") ?? "").length > 0,
      true,
      "the redirect carries the id token hint",
    );
    assert.equal(
      target.searchParams.get("post_logout_redirect_uri"),
      SIGN_IN_URL,
      "the redirect targets the sign-in page",
    );
    assert.equal(
      target.searchParams.get("client_id"),
      "ursitoare-engine",
      "the redirect names the client",
    );
    assert.equal(
      (redirect as string).includes(
        "post_logout_redirect_uri=http%3A%2F%2F127.0.0.1%3A8080%2Fsign-in",
      ),
      true,
      "the post-logout redirect URI is percent-encoded",
    );

    assertSessionCookieCleared(clearedSessionCookie(response));
    assert.equal(await resolve(db, sessionId, clock), null, "the session no longer resolves");
    assert.equal(
      await resolveTenantBy(db.appPool, "session", sessionId),
      null,
      "the session route is removed",
    );

    const landing = await fetch(redirect as string, { redirect: "manual" });
    assert.equal(landing.status, 302, "the fake answers the end-session request with a redirect");
    assert.equal(landing.headers.get("location"), SIGN_IN_URL);
    await landing.text();
  } finally {
    await server.close();
    await fake.close();
    await db.close();
  }
});

test("C-92e85da7 Logout without a valid CSRF token or session is refused", async () => {
  const { db, fake, clock, server } = await setup();
  try {
    const sessionId = await signIn(server, fake);

    const noHeader = await logout(server, sessionId);
    assert.equal(noHeader.statusCode, 403, "a missing CSRF header is refused");
    assert.equal(errorBody(noHeader)["code"], "OIDC_CSRF_INVALID");
    assert.ok((await resolve(db, sessionId, clock)) !== null, "the session survives a CSRF refusal");

    const wrongHeader = await logout(server, sessionId, "x".repeat(43));
    assert.equal(wrongHeader.statusCode, 403, "a wrong CSRF token is refused");
    assert.equal(errorBody(wrongHeader)["code"], "OIDC_CSRF_INVALID");
    assert.ok((await resolve(db, sessionId, clock)) !== null, "the session survives a wrong token");

    const noCookie = await inject(server, {
      method: "POST",
      url: "/auth/oidc/logout",
      headers: { "x-csrf-token": "x".repeat(43) },
    });
    assert.equal(noCookie.statusCode, 401, "a logout without a session cookie is unauthenticated");
    const noCookieError = errorBody(noCookie);
    assert.equal(noCookieError.code, "UNAUTHENTICATED");
    assert.equal(noCookieError.message, "Authentication required");
    assertSessionCookieCleared(clearedSessionCookie(noCookie));

    const unknownCookie = await logout(server, "Z".repeat(43), "x".repeat(43));
    assert.equal(unknownCookie.statusCode, 401, "an unknown session cookie is unauthenticated");
    assert.equal(errorBody(unknownCookie)["code"], "UNAUTHENTICATED");
    assertSessionCookieCleared(clearedSessionCookie(unknownCookie));
  } finally {
    await server.close();
    await fake.close();
    await db.close();
  }
});

test("C-33a7a137 A provider-down logout still revokes the session", async () => {
  const { db, fake, clock, server } = await setup();
  try {
    const sessionId = await signIn(server, fake);
    const session = await resolve(db, sessionId, clock);
    assert.ok(session !== null, "the signed-in session resolves");
    const csrfToken = await issue(db, session, clock);

    await fake.close();

    const offlineServer = await registeredServer(routeDeps(fake, db.appPool, clock));
    try {
      const response = await logout(offlineServer, sessionId, csrfToken);
      assert.equal(response.statusCode, 200, "logout answers 200 without a provider");
      const body = jsonBody(response);
      assert.equal(body["redirect"], SIGN_IN_URL, "the redirect falls back to the sign-in page");
      assertSessionCookieCleared(clearedSessionCookie(response));
      assert.equal(await resolve(db, sessionId, clock), null, "the session is revoked");
      assert.equal(
        await resolveTenantBy(db.appPool, "session", sessionId),
        null,
        "the session route is removed",
      );
    } finally {
      await offlineServer.close();
    }
  } finally {
    await server.close();
    await fake.close();
    await db.close();
  }
});
