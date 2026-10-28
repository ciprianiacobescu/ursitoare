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
  hashRouteKey,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { provisionTenantIdp, registerOidcRoutes, resolveSession } from "../index.ts";
import type { OidcRoutesDeps, SessionContext } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";
const HTTPS_BASE_URL = "https://app.example";
const CALLBACK_URL = "http://127.0.0.1:8080/auth/oidc/callback";
const HTTPS_CALLBACK_URL = "https://app.example/auth/oidc/callback";
const ENGINE_KEY = "k".repeat(64);
const LOGIN_COOKIE = "ursitoare_login";
const SESSION_COOKIE = "ursitoare_session";
const ALICE_EMAIL = "alice@example.invalid";
const MALLORY_EMAIL = "mallory@example.invalid";

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
  loginCookie: string;
  callback: string;
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
  publicBaseUrl: string,
  pool: TenantPool,
  clock: Clock,
): OidcRoutesDeps {
  return {
    config: oidcConfig(fake),
    publicBaseUrl,
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

function assertSessionCookie(cookies: readonly string[], secure: boolean): string {
  const cookie = cookieNamed(cookies, SESSION_COOKIE);
  const pattern = secure
    ? /^ursitoare_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax; Secure$/
    : /^ursitoare_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax$/;
  assert.ok(pattern.test(cookie), "the session cookie has the expected shape");
  assert.equal(cookie.includes("Max-Age"), false, "the session cookie has no Max-Age");
  return cookieValue(cookies, SESSION_COOKIE);
}

function assertLoginCleared(cookies: readonly string[], secure: boolean): void {
  const cookie = cookieNamed(cookies, LOGIN_COOKIE);
  const expected = secure
    ? "ursitoare_login=; Path=/auth/oidc; Max-Age=0; HttpOnly; SameSite=Lax; Secure"
    : "ursitoare_login=; Path=/auth/oidc; Max-Age=0; HttpOnly; SameSite=Lax";
  assert.equal(cookie, expected, "the callback clears the login cookie");
}

async function startLogin(
  server: FastifyInstance,
  fake: FakeOidc,
  url: string,
  username: string,
): Promise<LoginStart & { callback: string }> {
  const response = await inject(server, { method: "GET", url });
  assert.equal(response.statusCode, 302, "login answers a redirect");
  assert.equal(header(response, "cache-control"), "no-store");
  const cookies = setCookies(response);
  const location = header(response, "location");
  const loginCookie = cookieNamed(cookies, LOGIN_COOKIE);
  const cookie = cookieValue(cookies, LOGIN_COOKIE);
  const callback = await completeFakeLogin(fake, location, username);
  return { location, cookie, loginCookie, callback };
}

function callbackPath(callback: string): string {
  const url = new URL(callback);
  return `${url.pathname}${url.search}`;
}

async function sendCallback(
  server: FastifyInstance,
  login: LoginStart,
  extraCookie?: string,
): Promise<InjectedResponse> {
  const cookie = extraCookie === undefined
    ? `${LOGIN_COOKIE}=${login.cookie}`
    : `${LOGIN_COOKIE}=${login.cookie}; ${extraCookie}`;
  return inject(server, {
    method: "GET",
    url: callbackPath(login.callback),
    headers: { cookie },
  });
}

async function signIn(
  server: FastifyInstance,
  fake: FakeOidc,
  username: string,
  url: string,
): Promise<{ sessionId: string; response: InjectedResponse }> {
  const login = await startLogin(server, fake, url, username);
  const response = await sendCallback(server, login);
  assert.equal(response.statusCode, 302, "the callback answers a redirect");
  const sessionId = assertSessionCookie(setCookies(response), false);
  assertLoginCleared(setCookies(response), false);
  return { sessionId, response };
}

async function ownerRows(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query(sql, params);
    return result.rows as Record<string, unknown>[];
  });
}

async function userIdForEmail(
  db: TestDatabase,
  ctx: TenantContext,
  email: string,
): Promise<string> {
  const rows = await ownerRows(
    db,
    ctx,
    'SELECT user_id FROM ursitoare."user" WHERE tenant_id = $1 AND email = $2',
    [ctx.tenantId, email],
  );
  assert.equal(rows.length, 1, `the user ${email} exists`);
  return rows[0]?.["user_id"] as string;
}

function assertNoColumnHolds(rows: readonly Record<string, unknown>[], secrets: readonly string[]): void {
  for (const row of rows) {
    for (const value of Object.values(row)) {
      const candidates: string[] =
        typeof value === "string"
          ? [value]
          : value instanceof Buffer
            ? [value.toString("hex"), value.toString("base64url"), value.toString("utf8")]
            : [];
      for (const secret of secrets) {
        for (const candidate of candidates) {
          assert.notEqual(candidate, secret, "no session column holds a cookie value");
        }
      }
    }
  }
}

async function resolveWith(
  db: TestDatabase,
  cookie: string,
  clock: Clock,
): Promise<SessionContext | null> {
  let session: SessionContext | null | undefined;
  await assert.doesNotReject(async () => {
    session = await resolveSession(db.appPool, cookie, { clock });
  }, "resolveSession resolves");
  assert.ok(session !== undefined, "resolveSession returns a value");
  return session;
}

test("C-6370f2de Sign in", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc({ now: () => new Date(NOW) });
  const clock = fixedClock(NOW);
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: fake.issuer, organization: "org-b" });
    fake.registerRedirect(CALLBACK_URL);

    const server = await registeredServer(routeDeps(fake, PUBLIC_BASE_URL, db.appPool, clock));
    try {
      const aliceLogin = await startLogin(
        server,
        fake,
        "/auth/oidc/login?return_to=/flows",
        "alice",
      );
      const aliceResponse = await sendCallback(server, aliceLogin);
      assert.equal(aliceResponse.statusCode, 302);
      assert.equal(header(aliceResponse, "location"), "/flows");
      assert.equal(header(aliceResponse, "cache-control"), "no-store");
      const aliceCookies = setCookies(aliceResponse);
      const aliceSessionId = assertSessionCookie(aliceCookies, false);
      assertLoginCleared(aliceCookies, false);

      const malloryLogin = await startLogin(server, fake, "/auth/oidc/login", "mallory");
      const malloryResponse = await sendCallback(server, malloryLogin);
      assert.equal(malloryResponse.statusCode, 302);
      assert.equal(header(malloryResponse, "location"), "/");
      const malloryCookies = setCookies(malloryResponse);
      const mallorySessionId = assertSessionCookie(malloryCookies, false);
      assertLoginCleared(malloryCookies, false);

      assert.notEqual(aliceSessionId, mallorySessionId);

      const aliceUserId = await userIdForEmail(db, a, ALICE_EMAIL);
      const malloryUserId = await userIdForEmail(db, b, MALLORY_EMAIL);

      const aliceRows = await ownerRows(
        db,
        a,
        `SELECT session_id_hash, user_id, created_at, last_seen_at, expires_at,
                idle_timeout_s, revoked_at, end_session_hint
           FROM ursitoare.session`,
      );
      assert.equal(aliceRows.length, 1, "tenant A holds one session row");
      const aliceRow = aliceRows[0];
      assert.ok(aliceRow !== undefined);
      assert.equal(aliceRow["user_id"], aliceUserId);
      assert.equal(aliceRow["idle_timeout_s"], 1800);
      assert.equal(aliceRow["revoked_at"], null);
      const aliceCreated = (aliceRow["created_at"] as Date).getTime();
      const aliceExpires = (aliceRow["expires_at"] as Date).getTime();
      assert.equal(aliceExpires - aliceCreated, 43_200_000, "the session expires after 12 hours");

      const malloryRows = await ownerRows(
        db,
        b,
        "SELECT user_id, idle_timeout_s, revoked_at FROM ursitoare.session",
      );
      assert.equal(malloryRows.length, 1, "tenant B holds one session row");
      assert.equal(malloryRows[0]?.["user_id"], malloryUserId);
      assert.equal(malloryRows[0]?.["revoked_at"], null);

      const aliceSession = await resolveWith(db, aliceSessionId, clock);
      assert.ok(aliceSession !== null, "alice's cookie resolves");
      assert.deepEqual(aliceSession.tenant, a);
      assert.equal(aliceSession.userId, aliceUserId);

      const mallorySession = await resolveWith(db, mallorySessionId, clock);
      assert.ok(mallorySession !== null, "mallory's cookie resolves");
      assert.deepEqual(mallorySession.tenant, b);
      assert.equal(mallorySession.userId, malloryUserId);

      assertNoColumnHolds(aliceRows, [aliceSessionId, aliceLogin.cookie]);
      assertNoColumnHolds(malloryRows, [mallorySessionId, malloryLogin.cookie]);
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-fb2efece Repeat sign-in, https", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc({ now: () => new Date(NOW) });
  const clock = fixedClock(NOW);
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);
    fake.registerRedirect(HTTPS_CALLBACK_URL);

    const httpServer = await registeredServer(routeDeps(fake, PUBLIC_BASE_URL, db.appPool, clock));
    const httpsServer = await registeredServer(routeDeps(fake, HTTPS_BASE_URL, db.appPool, clock));
    try {
      const first = await signIn(httpServer, fake, "alice", "/auth/oidc/login?return_to=/flows");
      assert.equal(header(first.response, "location"), "/flows");

      const httpsLogin = await startLogin(
        httpsServer,
        fake,
        "/auth/oidc/login?return_to=/flows",
        "alice",
      );
      assert.equal(
        httpsLogin.loginCookie.endsWith("; Secure"),
        true,
        "the https login cookie is Secure",
      );

      const httpsResponse = await sendCallback(httpsServer, httpsLogin);
      assert.equal(httpsResponse.statusCode, 302);
      assert.equal(header(httpsResponse, "location"), "/flows");
      const httpsCookies = setCookies(httpsResponse);
      const secondSessionId = assertSessionCookie(httpsCookies, true);
      assertLoginCleared(httpsCookies, true);
      assert.notEqual(secondSessionId, first.sessionId);

      const users = await ownerRows(
        db,
        a,
        'SELECT count(*)::text AS count FROM ursitoare."user"',
      );
      assert.equal(Number(users[0]?.["count"]), 1, "alice has one user row");

      const sessions = await ownerRows(
        db,
        a,
        "SELECT count(*)::text AS count FROM ursitoare.session",
      );
      assert.equal(Number(sessions[0]?.["count"]), 2, "alice has two sessions");

      assert.ok((await resolveWith(db, first.sessionId, clock)) !== null);
      assert.ok((await resolveWith(db, secondSessionId, clock)) !== null);
    } finally {
      await httpServer.close();
      await httpsServer.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-14c6114a Session fixation", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc({ now: () => new Date(NOW) });
  const clock = fixedClock(NOW);
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    const server = await registeredServer(routeDeps(fake, PUBLIC_BASE_URL, db.appPool, clock));
    try {
      const login = await startLogin(
        server,
        fake,
        "/auth/oidc/login?return_to=/flows",
        "alice",
      );
      const chosen = "B".repeat(43);
      const response = await sendCallback(server, login, `${SESSION_COOKIE}=${chosen}`);
      assert.equal(response.statusCode, 302);
      assert.equal(header(response, "location"), "/flows");

      const cookies = setCookies(response);
      const newSessionId = assertSessionCookie(cookies, false);
      assertLoginCleared(cookies, false);
      assert.notEqual(newSessionId, chosen, "the new session cookie differs from the chosen one");

      assert.equal(await resolveWith(db, chosen, clock), null, "the chosen value resolves to null");

      const rows = await ownerRows(db, a, "SELECT session_id_hash FROM ursitoare.session");
      const chosenHash = hashRouteKey(chosen);
      for (const row of rows) {
        assert.equal(
          (row["session_id_hash"] as Buffer).equals(chosenHash),
          false,
          "no row stores the hash of the chosen value",
        );
      }

      const created = await resolveWith(db, newSessionId, clock);
      assert.ok(created !== null, "the new session resolves");
      assert.deepEqual(created.tenant, a);
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});
