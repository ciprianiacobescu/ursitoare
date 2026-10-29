import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import type { KeyObject } from "node:crypto";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { buildServer } from "../../api/index.ts";
import type { ServerDeps } from "../../api/index.ts";
import { verifyChain } from "../../audit/index.ts";
import { Secret } from "../../config/index.ts";
import { sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { createLogger, noopTracer } from "../../observability/index.ts";
import type { Logger } from "../../observability/index.ts";
import {
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../../tenancy/index.ts";
import { startFakeOidc } from "../../../test/support/fake-oidc/index.ts";
import type { FakeOidc } from "../../../test/support/fake-oidc/index.ts";
import { completeFakeLogin } from "../../../test/support/oidc-login.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { provisionTenantIdp, registerOidcRoutes } from "../index.ts";
import type { OidcRoutesDeps } from "../index.ts";

const NOW = "2026-10-25T12:00:00.000Z";
const PUBLIC_BASE_URL = "http://127.0.0.1:8080";
const CALLBACK_URL = "http://127.0.0.1:8080/auth/oidc/callback";
const ENGINE_KEY = "k".repeat(64);
const LOGIN_COOKIE = "ursitoare_login";
const ALICE_EMAIL = "alice@example.invalid";

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

interface MutableClock extends Clock {
  advance(ms: number): void;
}

interface Captured {
  logger: Logger;
  lines: string[];
}

interface TestKey {
  kid: string;
  privateKey: KeyObject;
  jwk: Record<string, unknown>;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(ms: number): void {
      millis += ms;
    },
  };
}

function serverDeps(logger: Logger): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger,
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
  fetchImpl?: typeof fetch,
): OidcRoutesDeps {
  return {
    config: oidcConfig(fake),
    publicBaseUrl: PUBLIC_BASE_URL,
    pool,
    engineKey: { reveal: () => ENGINE_KEY },
    clock,
    ...(fetchImpl === undefined ? {} : { fetch: fetchImpl }),
  };
}

async function registeredServer(deps: OidcRoutesDeps): Promise<FastifyInstance> {
  const server = await buildServer(serverDeps(createLogger({ level: "silent" })));
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

async function registeringServer(
  deps: OidcRoutesDeps,
  logger: Logger,
): Promise<FastifyInstance> {
  const server = await buildServer(serverDeps(logger));
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

async function assertRefusal(
  response: InjectedResponse,
  expectedCode: string,
): Promise<void> {
  assert.equal(response.statusCode, 302, "a refusal is a redirect");
  assert.equal(
    header(response, "location"),
    `/sign-in?error=${expectedCode}`,
    "the refusal names the stable code",
  );
  assert.equal(header(response, "cache-control"), "no-store");
  const cookies = setCookies(response);
  assert.equal(cookieValue(cookies, LOGIN_COOKIE), "", "the login cookie is cleared");
}

function callbackPath(callback: string): string {
  const url = new URL(callback);
  return `${url.pathname}${url.search}`;
}

function mutateCallback(
  callback: string,
  mutate: (params: URLSearchParams) => void,
): string {
  const url = new URL(callback);
  mutate(url.searchParams);
  return `${url.pathname}${url.search}`;
}

function queryValue(callback: string, name: string): string {
  const value = new URL(callback).searchParams.get(name);
  assert.ok(value !== null, `the callback carries ${name}`);
  return value;
}

async function startLogin(
  server: FastifyInstance,
  fake: FakeOidc,
  username: string,
  url = "/auth/oidc/login",
): Promise<LoginStart> {
  const response = await inject(server, { method: "GET", url });
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
): Promise<InjectedResponse> {
  const login = await startLogin(server, fake, username);
  const response = await sendCallback(server, login);
  assert.equal(response.statusCode, 302, "the callback answers a redirect");
  return response;
}

function captureLogger(): Captured {
  const lines: string[] = [];
  const logger = createLogger({
    level: "info",
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  });
  return { logger, lines };
}

function records(captured: Captured): Record<string, unknown>[] {
  return captured.lines
    .filter((line) => line.trim() !== "")
    .map((line) => JSON.parse(line) as Record<string, unknown>);
}

function refusalWarnings(captured: Captured): Record<string, unknown>[] {
  return records(captured).filter((record) => record["msg"] === "sign-in refused");
}

function lastWarning(captured: Captured): Record<string, unknown> {
  const warning = refusalWarnings(captured).at(-1);
  assert.ok(warning !== undefined, "a sign-in refused warning was logged");
  return warning;
}

function failingPool(pool: TenantPool, failAt: number): TenantPool {
  let calls = 0;
  const wrapped = {
    connect: (): Promise<unknown> => {
      calls += 1;
      if (calls === failAt) {
        return Promise.reject(new Error("boom"));
      }
      return pool.connect();
    },
  };
  return wrapped as unknown as TenantPool;
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function testKey(kid: string): TestKey {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2_048 });
  const exported = publicKey.export({ format: "jwk" });
  const n = exported.n;
  const e = exported.e;
  if (typeof n !== "string" || typeof e !== "string") {
    throw new Error("the test key has no modulus or exponent");
  }
  return {
    kid,
    privateKey,
    jwk: { kty: "RSA", use: "sig", alg: "RS256", kid, n, e },
  };
}

function signToken(key: TestKey, claims: Record<string, unknown>): string {
  const header = { alg: "RS256", typ: "JWT", kid: key.kid };
  const input = `${base64url(header)}.${base64url(claims)}`;
  const signature = sign("sha256", Buffer.from(input, "utf8"), key.privateKey).toString("base64url");
  return `${input}.${signature}`;
}

function claimsFor(
  fake: FakeOidc,
  nonce: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  const iat = Math.floor(Date.parse(NOW) / 1000);
  return {
    iss: fake.issuer,
    sub: "subject-alice",
    aud: "ursitoare-engine",
    azp: "ursitoare-engine",
    iat,
    exp: iat + 300,
    nonce,
    email: ALICE_EMAIL,
    email_verified: true,
    name: "Alice Example",
    preferred_username: "alice",
    organization: ["org-a"],
    ...overrides,
  };
}

interface FetchSwap {
  token?: () => string | null;
  extraJwks?: () => Record<string, unknown>[];
}

function responseWithJson(status: number, value: unknown): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });
}

function swappingFetch(swap: FetchSwap): typeof fetch {
  const realFetch = globalThis.fetch;
  return async (
    input: Parameters<typeof fetch>[0],
    init?: Parameters<typeof fetch>[1],
  ): Promise<Response> => {
    const url =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.toString()
          : input.url;
    const path = new URL(url).pathname;
    const response = await realFetch(input, init);

    if (swap.extraJwks !== undefined && path.endsWith("/certs")) {
      const document = (await response.json()) as { keys?: unknown[] };
      const keys = [...(Array.isArray(document.keys) ? document.keys : []), ...swap.extraJwks()];
      return responseWithJson(response.status, { ...document, keys });
    }

    if (swap.token !== undefined && path.endsWith("/token")) {
      const text = await response.text();
      let document: Record<string, unknown>;
      try {
        document = JSON.parse(text) as Record<string, unknown>;
      } catch {
        return new Response(text, { status: response.status });
      }
      const replacement = swap.token();
      if (replacement !== null) document["id_token"] = replacement;
      return responseWithJson(response.status, document);
    }

    return response;
  };
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

async function disableUser(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(
      'UPDATE ursitoare."user" SET state = $3 WHERE tenant_id = $1 AND user_id = $2',
      [ctx.tenantId, userId, "disabled"],
    );
  });
}

async function sessionCount(db: TestDatabase, ctx: TenantContext): Promise<number> {
  const rows = await ownerRows(
    db,
    ctx,
    "SELECT count(*)::text AS count FROM ursitoare.session",
    [],
  );
  return Number(rows[0]?.["count"]);
}

async function auditRows(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<Record<string, unknown>[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query(
      "SELECT event_type, actor, payload FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
      [ctx.tenantId],
    );
    return result.rows as Record<string, unknown>[];
  });
}

test("C-9d33c4ce Refuses a missing, altered or expired login cookie with OIDC_LOGIN_EXPIRED", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  try {
    await seedTwoTenants(db);
    fake.registerRedirect(CALLBACK_URL);
    const server = await registeredServer(routeDeps(fake, db.appPool, clock));
    try {
      const missing = await inject(server, { method: "GET", url: "/auth/oidc/callback" });
      await assertRefusal(missing, "OIDC_LOGIN_EXPIRED");

      const alteredLogin = await startLogin(server, fake, "alice");
      const first = alteredLogin.cookie.charAt(0);
      const alteredValue = `${first === "A" ? "B" : "A"}${alteredLogin.cookie.slice(1)}`;
      const altered = await inject(server, {
        method: "GET",
        url: callbackPath(alteredLogin.callback),
        headers: { cookie: `${LOGIN_COOKIE}=${alteredValue}` },
      });
      await assertRefusal(altered, "OIDC_LOGIN_EXPIRED");

      const oldLogin = await startLogin(server, fake, "alice");
      clock.advance(601_000);
      const old = await sendCallback(server, oldLogin);
      await assertRefusal(old, "OIDC_LOGIN_EXPIRED");
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-9d33c4ce Refuses a wrong or missing state, a malformed authorization response and an unreachable provider", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  const captured = captureLogger();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);
    const server = await registeringServer(
      routeDeps(fake, db.appPool, clock),
      captured.logger,
    );
    try {
      const login = await startLogin(server, fake, "alice");

      const send = async (url: string): Promise<InjectedResponse> =>
        inject(server, {
          method: "GET",
          url,
          headers: { cookie: `${LOGIN_COOKIE}=${login.cookie}` },
        });

      const wrongState = await send(
        mutateCallback(login.callback, (params) => params.set("state", "z".repeat(43))),
      );
      await assertRefusal(wrongState, "OIDC_STATE_MISMATCH");

      const noState = await send(
        mutateCallback(login.callback, (params) => params.delete("state")),
      );
      await assertRefusal(noState, "OIDC_BAD_REQUEST");

      const noCode = await send(
        mutateCallback(login.callback, (params) => params.delete("code")),
      );
      await assertRefusal(noCode, "OIDC_BAD_REQUEST");

      const providerError = await send(
        mutateCallback(login.callback, (params) => params.set("error", "access_denied")),
      );
      await assertRefusal(providerError, "OIDC_EXCHANGE_FAILED");

      const providerErrorWrongState = await send(
        mutateCallback(login.callback, (params) => {
          params.set("state", "y".repeat(43));
          params.set("error", "access_denied");
        }),
      );
      await assertRefusal(providerErrorWrongState, "OIDC_STATE_MISMATCH");

      await fake.close();
      const unreachable = await send(callbackPath(login.callback));
      await assertRefusal(unreachable, "OIDC_PROVIDER_UNAVAILABLE");
      const warning = lastWarning(captured);
      assert.equal(warning["code"], "OIDC_PROVIDER_UNAVAILABLE");
      assert.equal(warning["reason"], "network");

      assert.equal(await sessionCount(db, a), 0, "no refused callback creates a session");
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-9d33c4ce Refuses hostile ID tokens with OIDC_TOKEN_INVALID and two organizations as OIDC_UNKNOWN_TENANT", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  const captured = captureLogger();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    let nextToken: (() => string | null) | null = null;
    const transport = swappingFetch({
      token: () => (nextToken === null ? null : nextToken()),
    });
    const server = await registeringServer(
      routeDeps(fake, db.appPool, clock, transport),
      captured.logger,
    );
    try {
      const flaws = [
        { flaw: "wrong_aud", reason: "audience" },
        { flaw: "alg_none", reason: "alg" },
        { flaw: "wrong_nonce", reason: "nonce" },
        { flaw: "expired", reason: "expired" },
      ] as const;

      for (const { flaw, reason } of flaws) {
        const login = await startLogin(server, fake, "alice");
        const nonce = queryValue(login.location, "nonce");
        nextToken = () => fake.mintToken({ kind: "id", flaw, nonce });
        const response = await sendCallback(server, login);
        nextToken = null;
        await assertRefusal(response, "OIDC_TOKEN_INVALID");
        const warning = lastWarning(captured);
        assert.equal(warning["code"], "OIDC_TOKEN_INVALID");
        assert.equal(warning["reason"], reason, "the refusal logs the verification reason");
      }

      const twoOrganizationsLogin = await startLogin(server, fake, "alice");
      const twoOrganizationsNonce = queryValue(twoOrganizationsLogin.location, "nonce");
      nextToken = () =>
        fake.mintToken({ kind: "id", flaw: "two_organizations", nonce: twoOrganizationsNonce });
      const twoOrganizations = await sendCallback(server, twoOrganizationsLogin);
      nextToken = null;
      await assertRefusal(twoOrganizations, "OIDC_UNKNOWN_TENANT");

      const mallory = await sendCallback(server, await startLogin(server, fake, "mallory"));
      await assertRefusal(mallory, "OIDC_UNKNOWN_TENANT");

      assert.equal(await sessionCount(db, a), 0, "no refused callback creates a session");
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-9d33c4ce Refuses a disabled user, a padded subject and a failing first connect", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    const key = testKey("padded-subject-key");
    let nextToken: (() => string | null) | null = null;
    const transport = swappingFetch({
      token: () => (nextToken === null ? null : nextToken()),
      extraJwks: () => [key.jwk],
    });
    const server = await registeredServer(routeDeps(fake, db.appPool, clock, transport));
    try {
      await signIn(server, fake, "alice");
      await disableUser(db, a, await userIdForEmail(db, a, ALICE_EMAIL));

      const disabled = await sendCallback(server, await startLogin(server, fake, "alice"));
      await assertRefusal(disabled, "OIDC_USER_DISABLED");

      const paddedLogin = await startLogin(server, fake, "alice");
      const paddedNonce = queryValue(paddedLogin.location, "nonce");
      nextToken = () =>
        signToken(key, claimsFor(fake, paddedNonce, { sub: " s" }));
      const padded = await sendCallback(server, paddedLogin);
      nextToken = null;
      await assertRefusal(padded, "OIDC_TOKEN_INVALID");
    } finally {
      await server.close();
    }

    const failingServer = await registeredServer(
      routeDeps(fake, failingPool(db.appPool, 1), clock),
    );
    try {
      const login = await startLogin(failingServer, fake, "alice");
      const failed = await sendCallback(failingServer, login);
      await assertRefusal(failed, "OIDC_INTERNAL");
    } finally {
      await failingServer.close();
    }

    assert.equal(await sessionCount(db, a), 1, "refusals create no session");
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-5f76283c C-9c4e9faf Replayed callback code is refused and logs a reason", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  const captured = captureLogger();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);
    const server = await registeringServer(routeDeps(fake, db.appPool, clock), captured.logger);
    try {
      const login = await startLogin(server, fake, "alice");
      const first = await sendCallback(server, login);
      assert.equal(first.statusCode, 302);
      assert.equal(header(first, "location"), "/");

      const replay = await sendCallback(server, login);
      await assertRefusal(replay, "OIDC_EXCHANGE_FAILED");
      assert.equal(await sessionCount(db, a), 1, "a replayed code creates no second session");

      const warning = lastWarning(captured);
      assert.equal(warning["code"], "OIDC_EXCHANGE_FAILED");
      assert.equal(warning["reason"], "status");
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-bab5127d Audits refusals once the tenant is known", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: fake.issuer, organization: "org-b" });
    fake.registerRedirect(CALLBACK_URL);

    const key = testKey("audit-refusal-key");
    let nextToken: (() => string | null) | null = null;
    const transport = swappingFetch({
      token: () => (nextToken === null ? null : nextToken()),
      extraJwks: () => [key.jwk],
    });
    const server = await registeredServer(routeDeps(fake, db.appPool, clock, transport));
    try {
      await signIn(server, fake, "alice");
      await disableUser(db, a, await userIdForEmail(db, a, ALICE_EMAIL));

      const disabled = await sendCallback(server, await startLogin(server, fake, "alice"));
      await assertRefusal(disabled, "OIDC_USER_DISABLED");

      const paddedLogin = await startLogin(server, fake, "alice");
      const paddedNonce = queryValue(paddedLogin.location, "nonce");
      nextToken = () => signToken(key, claimsFor(fake, paddedNonce, { sub: " s" }));
      const padded = await sendCallback(server, paddedLogin);
      nextToken = null;
      await assertRefusal(padded, "OIDC_TOKEN_INVALID");

      const malloryServer = await registeredServer(
        routeDeps(fake, failingPool(db.appPool, 2), clock),
      );
      try {
        const mallory = await sendCallback(
          malloryServer,
          await startLogin(malloryServer, fake, "mallory"),
        );
        await assertRefusal(mallory, "OIDC_INTERNAL");
      } finally {
        await malloryServer.close();
      }

      const unknownLogin = await startLogin(server, fake, "alice");
      const unknownNonce = queryValue(unknownLogin.location, "nonce");
      nextToken = () =>
        signToken(key, claimsFor(fake, unknownNonce, { organization: ["org-z"] }));
      const unknown = await sendCallback(server, unknownLogin);
      nextToken = null;
      await assertRefusal(unknown, "OIDC_UNKNOWN_TENANT");

      const wrongAudienceLogin = await startLogin(server, fake, "alice");
      const wrongAudienceNonce = queryValue(wrongAudienceLogin.location, "nonce");
      nextToken = () =>
        fake.mintToken({ kind: "id", flaw: "wrong_aud", nonce: wrongAudienceNonce });
      const wrongAudience = await sendCallback(server, wrongAudienceLogin);
      nextToken = null;
      await assertRefusal(wrongAudience, "OIDC_TOKEN_INVALID");

      const failingServer = await registeredServer(
        routeDeps(fake, failingPool(db.appPool, 1), clock),
      );
      try {
        const failed = await sendCallback(failingServer, await startLogin(failingServer, fake, "alice"));
        await assertRefusal(failed, "OIDC_INTERNAL");
      } finally {
        await failingServer.close();
      }

      const refusalsA = (await auditRows(db, a)).filter(
        (row) => row["event_type"] === "auth.login_refused",
      );
      assert.equal(refusalsA.length, 2, "tenant A holds two refusal events");
      assert.deepEqual(
        refusalsA.map((row) => row["payload"]),
        [{ code: "OIDC_USER_DISABLED" }, { code: "OIDC_TOKEN_INVALID" }],
        "tenant A's refusals are in order",
      );
      for (const row of refusalsA) {
        assert.deepEqual(row["actor"], { kind: "system", id: "oidc" });
      }

      const refusalsB = (await auditRows(db, b)).filter(
        (row) => row["event_type"] === "auth.login_refused",
      );
      assert.equal(refusalsB.length, 1, "tenant B holds one refusal event");
      assert.deepEqual(refusalsB[0]?.["payload"], { code: "OIDC_INTERNAL" });
      assert.deepEqual(refusalsB[0]?.["actor"], { kind: "system", id: "oidc" });

      const chainA = await verifyChain(db.appPool, a);
      const chainB = await verifyChain(db.appPool, b);
      assert.equal(chainA.ok, true, "tenant A's chain verifies");
      assert.equal(chainB.ok, true, "tenant B's chain verifies");
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-9c4e9faf Refusal logs hold code and reason but no code, state, cookie, token or email", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  const captured = captureLogger();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    const key = testKey("log-refusal-key");
    let nextToken: (() => string | null) | null = null;
    const transport = swappingFetch({
      token: () => (nextToken === null ? null : nextToken()),
      extraJwks: () => [key.jwk],
    });
    const server = await registeringServer(
      routeDeps(fake, db.appPool, clock, transport),
      captured.logger,
    );
    try {
      const forbidden: string[] = [ALICE_EMAIL];

      const login = await startLogin(server, fake, "alice");
      const nonce = queryValue(login.location, "nonce");
      const authorizationCode = queryValue(login.callback, "code");
      const state = queryValue(login.callback, "state");
      const idToken = fake.mintToken({ kind: "id", flaw: "wrong_aud", nonce });
      nextToken = () => idToken;
      const response = await sendCallback(server, login);
      nextToken = null;
      await assertRefusal(response, "OIDC_TOKEN_INVALID");
      forbidden.push(authorizationCode, state, login.cookie, idToken);

      const warning = lastWarning(captured);
      assert.equal(warning["code"], "OIDC_TOKEN_INVALID");
      assert.equal(warning["reason"], "audience");

      const paddedLogin = await startLogin(server, fake, "alice");
      const paddedNonce = queryValue(paddedLogin.location, "nonce");
      const paddedToken = signToken(key, claimsFor(fake, paddedNonce, { sub: " s" }));
      nextToken = () => paddedToken;
      const padded = await sendCallback(server, paddedLogin);
      nextToken = null;
      await assertRefusal(padded, "OIDC_TOKEN_INVALID");
      assert.equal(lastWarning(captured)["code"], "OIDC_TOKEN_INVALID");
      forbidden.push(
        queryValue(paddedLogin.callback, "code"),
        queryValue(paddedLogin.callback, "state"),
        paddedLogin.cookie,
        paddedToken,
      );

      for (const line of captured.lines) {
        for (const secret of forbidden) {
          assert.equal(
            line.includes(secret),
            false,
            "a log line holds no code, state, cookie, token or email",
          );
        }
      }
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-9c4e9faf A failing refusal audit logs one error line and appends no event", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  const captured = captureLogger();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    const signInServer = await registeringServer(
      routeDeps(fake, db.appPool, clock),
      captured.logger,
    );
    try {
      await signIn(signInServer, fake, "alice");
    } finally {
      await signInServer.close();
    }
    await disableUser(db, a, await userIdForEmail(db, a, ALICE_EMAIL));
    captured.lines.length = 0;

    const failingServer = await registeringServer(
      routeDeps(fake, failingPool(db.appPool, 3), clock),
      captured.logger,
    );
    try {
      const login = await startLogin(failingServer, fake, "alice");
      const response = await sendCallback(failingServer, login);
      await assertRefusal(response, "OIDC_USER_DISABLED");

      const errorLines = records(captured).filter(
        (record) => record["msg"] === "sign-in audit failed",
      );
      assert.equal(errorLines.length, 1, "one audit failure is logged");

      const refusals = (await auditRows(db, a)).filter(
        (row) => row["event_type"] === "auth.login_refused",
      );
      assert.equal(refusals.length, 0, "a failed audit appends no event");
    } finally {
      await failingServer.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});

test("C-bab5127d Keeps the refusal redirect when the failure is not about the tenant", async () => {
  const db = await withTestDatabase();
  const clock = mutableClock(NOW);
  const fake = await startFakeOidc({ now: () => clock.now() });
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: fake.issuer, organization: "org-a" });
    fake.registerRedirect(CALLBACK_URL);

    const key = testKey("no-tenant-refusal-key");
    let nextToken: (() => string | null) | null = null;
    const transport = swappingFetch({
      token: () => (nextToken === null ? null : nextToken()),
      extraJwks: () => [key.jwk],
    });
    const server = await registeredServer(routeDeps(fake, db.appPool, clock, transport));
    try {
      const unknownLogin = await startLogin(server, fake, "alice");
      const unknownNonce = queryValue(unknownLogin.location, "nonce");
      nextToken = () =>
        signToken(key, claimsFor(fake, unknownNonce, { organization: ["org-z"] }));
      const unknown = await sendCallback(server, unknownLogin);
      nextToken = null;
      await assertRefusal(unknown, "OIDC_UNKNOWN_TENANT");

      const wrongAudienceLogin = await startLogin(server, fake, "alice");
      const wrongAudienceNonce = queryValue(wrongAudienceLogin.location, "nonce");
      nextToken = () =>
        fake.mintToken({ kind: "id", flaw: "wrong_aud", nonce: wrongAudienceNonce });
      const wrongAudience = await sendCallback(server, wrongAudienceLogin);
      nextToken = null;
      await assertRefusal(wrongAudience, "OIDC_TOKEN_INVALID");

      assert.equal(
        (await auditRows(db, a)).length,
        0,
        "a token that never named a tenant appends nothing",
      );
    } finally {
      await server.close();
    }
  } finally {
    await fake.close();
    await db.close();
  }
});
