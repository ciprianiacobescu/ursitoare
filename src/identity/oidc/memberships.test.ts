import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildServer } from "../../api/index.ts";
import type { ServerDeps } from "../../api/index.ts";
import { Secret } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import { withTenantTx, type TenantContext, type TenantPool } from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import {
  loadMemberships,
  provisionTenantIdp,
  registerOidcRoutes,
  setGroupMapping,
} from "../index.ts";
import type { MembershipSet, OidcRoutesDeps } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";
const CALLBACK_URL = "http://127.0.0.1:8080/auth/oidc/callback";
const ENGINE_KEY = "k".repeat(64);
const LOGIN_COOKIE = "ursitoare_login";
const SESSION_COOKIE = "ursitoare_session";
const ALICE_EMAIL = "alice@example.invalid";
const MALLORY_EMAIL = "mallory@example.invalid";
const OPERATOR = { kind: "operator", name: "seed" } as const;

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

function routeDeps(fake: FakeOidc, pool: TenantPool, clock: Clock): OidcRoutesDeps {
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

function poolRefusingMemberships(pool: TenantPool): TenantPool {
  const wrapped = {
    async connect() {
      const client = await pool.connect();
      return new Proxy(client, {
        get(target, property, receiver) {
          if (property === "query") {
            const raw = target as unknown as {
              query: (query: unknown, values?: unknown) => Promise<unknown>;
            };
            return (query: unknown, values?: unknown) => {
              const text =
                typeof query === "string"
                  ? query
                  : (query as { text?: unknown } | null)?.text;
              if (typeof text === "string" && text.includes("ursitoare.membership")) {
                return Promise.reject(new Error("membership statements are unavailable"));
              }
              return raw.query(query, values);
            };
          }
          const value = Reflect.get(target, property, receiver) as unknown;
          return typeof value === "function" ? value.bind(target) : value;
        },
      });
    },
  };
  return wrapped as unknown as TenantPool;
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

function assertSessionCookie(cookies: readonly string[]): string {
  const cookie = cookieNamed(cookies, SESSION_COOKIE);
  assert.ok(
    /^ursitoare_session=[A-Za-z0-9_-]{43}; Path=\/; HttpOnly; SameSite=Lax$/.test(cookie),
    "the session cookie has the expected shape",
  );
  return cookieValue(cookies, SESSION_COOKIE);
}

function callbackPath(callback: string): string {
  const url = new URL(callback);
  return `${url.pathname}${url.search}`;
}

async function startLogin(
  server: FastifyInstance,
  fake: FakeOidc,
  username: string,
): Promise<LoginStart> {
  const response = await inject(server, { method: "GET", url: "/auth/oidc/login" });
  assert.equal(response.statusCode, 302, "login answers a redirect");
  const cookies = setCookies(response);
  const location = header(response, "location");
  const cookie = cookieValue(cookies, LOGIN_COOKIE);
  const callback = await completeFakeLogin(fake, location, username);
  return { location, cookie, callback };
}

async function sendCallback(
  server: FastifyInstance,
  login: LoginStart,
): Promise<InjectedResponse> {
  return inject(server, {
    method: "GET",
    url: callbackPath(login.callback),
    headers: { cookie: `${LOGIN_COOKIE}=${login.cookie}` },
  });
}

async function signIn(
  server: FastifyInstance,
  fake: FakeOidc,
  username: string,
): Promise<InjectedResponse> {
  return sendCallback(server, await startLogin(server, fake, username));
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

async function ownerExec(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(sql, params);
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

async function memberships(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<MembershipSet> {
  let result: MembershipSet | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) => loadMemberships(tx, ctx, userId));
  }, "loadMemberships resolves");
  assert.ok(result !== undefined, "loadMemberships returns a value");
  return result;
}

async function mapGroup(
  db: TestDatabase,
  ctx: TenantContext,
  input: { issuer: string; group: string; roleId?: string; teamId?: string },
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      await setGroupMapping(tx, ctx, input, OPERATOR);
    }, "setGroupMapping resolves");
  });
}

async function auditRows(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<Record<string, unknown>[]> {
  return ownerRows(
    db,
    ctx,
    `SELECT event_type, actor, target, payload FROM ursitoare.audit_event
     WHERE tenant_id = $1 ORDER BY seq`,
    [ctx.tenantId],
  );
}

test("C-5b09c7d9 Sign-in applies the mappings", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc({ now: () => new Date(NOW) });
  const clock = fixedClock(NOW);
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: fake.issuer, organization: "org-b" });
    fake.registerRedirect(CALLBACK_URL);

    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')",
      [a.tenantId],
    );
    await mapGroup(db, a, {
      issuer: fake.issuer,
      group: "ursitoare-authors",
      roleId: "author",
    });
    await mapGroup(db, a, {
      issuer: fake.issuer,
      group: "team-finance",
      teamId: "finance",
    });
    await mapGroup(db, b, {
      issuer: fake.issuer,
      group: "ursitoare-authors",
      roleId: "author",
    });

    const server = await registeredServer(routeDeps(fake, db.appPool, clock));
    try {
      const aliceFirst = await signIn(server, fake, "alice");
      assert.equal(aliceFirst.statusCode, 302, "alice's first callback is a redirect");
      assertSessionCookie(setCookies(aliceFirst));

      const aliceSecond = await signIn(server, fake, "alice");
      assert.equal(aliceSecond.statusCode, 302, "alice's second callback is a redirect");
      assertSessionCookie(setCookies(aliceSecond));

      const mallory = await signIn(server, fake, "mallory");
      assert.equal(mallory.statusCode, 302, "mallory's callback is a redirect");
      assertSessionCookie(setCookies(mallory));

      const aliceUserId = await userIdForEmail(db, a, ALICE_EMAIL);
      const malloryUserId = await userIdForEmail(db, b, MALLORY_EMAIL);

      assert.deepEqual(await memberships(db, a, aliceUserId), {
        roles: ["author"],
        teams: ["finance"],
      });
      assert.deepEqual(await memberships(db, b, malloryUserId), {
        roles: ["author"],
        teams: [],
      });

      const aliceMembershipRows = await ownerRows(
        db,
        a,
        "SELECT membership_id FROM ursitoare.membership WHERE tenant_id = $1 AND user_id = $2",
        [a.tenantId, aliceUserId],
      );
      assert.equal(aliceMembershipRows.length, 2, "alice has two membership rows");

      const events = (await auditRows(db, a)).filter(
        (row) => row["event_type"] === "identity.memberships_synced",
      );
      assert.equal(events.length, 1, "tenant A holds one memberships_synced event");
      assert.deepEqual(events[0]?.["target"], { kind: "user", id: aliceUserId });
      assert.deepEqual(events[0]?.["actor"], { kind: "system", id: "oidc" });
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-e3d072a4 A failing sync refuses the sign-in", async () => {
  const db = await withTestDatabase();
  const fake = await startFakeOidc({ now: () => new Date(NOW) });
  const clock = fixedClock(NOW);
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);
    await mapGroup(db, a, {
      issuer: fake.issuer,
      group: "ursitoare-authors",
      roleId: "author",
    });

    const server = await registeredServer(
      routeDeps(fake, poolRefusingMemberships(db.appPool), clock),
    );
    try {
      const response = await signIn(server, fake, "alice");
      assert.equal(response.statusCode, 302, "the refusal is a redirect");
      assert.equal(header(response, "location"), "/sign-in?error=OIDC_INTERNAL");
      const cookies = setCookies(response);
      assert.equal(cookieValue(cookies, LOGIN_COOKIE), "", "the login cookie is cleared");

      const sessions = await ownerRows(
        db,
        a,
        "SELECT 1 FROM ursitoare.session WHERE tenant_id = $1",
        [a.tenantId],
      );
      assert.equal(sessions.length, 0, "no session row exists");

      const memberships = await ownerRows(
        db,
        a,
        "SELECT 1 FROM ursitoare.membership WHERE tenant_id = $1",
        [a.tenantId],
      );
      assert.equal(memberships.length, 0, "no membership row exists");

      const refusals = (await auditRows(db, a)).filter(
        (row) => row["event_type"] === "auth.login_refused",
      );
      assert.equal(refusals.length, 1, "tenant A holds one login_refused event");
      assert.deepEqual(refusals[0]?.["payload"], { code: "OIDC_INTERNAL" });
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});
