import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance, FastifyRequest } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { Principal, SessionContext } from "../identity/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { defineRoute, registerAuthVerifier, RouteDefinitionError } from "./route.ts";
import type { AuthVerifier } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function permitAllEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-pep-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function session(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  clock: Clock,
): Promise<{ cookie: string; userId: string; csrfToken: string }> {
  let created: { cookie: string; userId: string; csrfToken: string } | undefined;
  await assert.doesNotReject(async () => {
    created = await createTestSession(db, ctx, subject, clock);
  });
  assert.ok(created !== undefined, "createTestSession returns a session");
  return created;
}

function expectDefinitionError(
  run: () => void,
  code: string,
  details: Record<string, string>,
): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof RouteDefinitionError, "expected RouteDefinitionError");
    assert.equal(error.code, code);
    for (const [key, value] of Object.entries(details)) {
      assert.equal(error.details[key], value);
    }
    return true;
  });
}

function expectRefused(response: {
  statusCode: number;
  body: string;
  headers: Record<string, string | number | string[] | undefined>;
}): void {
  assert.equal(response.statusCode, 401);
  assert.deepEqual(JSON.parse(response.body), {
    error: { code: "UNAUTHENTICATED", message: "Authentication required" },
  });
  assert.equal(response.headers["cache-control"], "no-store");
}

function expectUnavailable(response: { statusCode: number; body: string }): void {
  assert.equal(response.statusCode, 503);
  assert.deepEqual(JSON.parse(response.body), {
    error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" },
  });
}

assert.equal(typeof installPep, "function");

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-97e53f5d a session request without a live session is refused before the body is parsed", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    const deps: PepDeps = { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL };
    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");

    let handlerCalls = 0;
    const handler = async (): Promise<{ ok: boolean }> => {
      handlerCalls += 1;
      return { ok: true };
    };
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/whoami",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler,
      });
    }, "defineRoute GET");
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "POST",
        url: "/api/v1/test/whoami",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler,
      });
    }, "defineRoute POST");

    const alice = await session(db, a, "alice", clock);

    const refused = [
      await server.inject({ method: "GET", url: "/api/v1/test/whoami" }),
      await server.inject({
        method: "GET",
        url: "/api/v1/test/whoami",
        headers: { cookie: "ursitoare_session=bad" },
      }),
      await server.inject({
        method: "GET",
        url: "/api/v1/test/whoami",
        headers: { cookie: `ursitoare_session=${"A".repeat(43)}` },
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/whoami",
        headers: { "content-type": "application/json" },
        payload: "{bad",
      }),
    ];
    for (const response of refused) {
      expectRefused(response);
    }

    clock.advance(13 * 3_600);
    expectRefused(
      await server.inject({
        method: "GET",
        url: "/api/v1/test/whoami",
        headers: { cookie: alice.cookie },
      }),
    );

    assert.equal(handlerCalls, 0, "the handler never runs without a live session");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-0a031758 a live session sets the principal from the session alone", async () => {
  const db = await withTestDatabase();
  const server = await testServer();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    const deps: PepDeps = { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL };
    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");

    let seen: {
      principal: Principal | undefined;
      tenant: TenantContext | undefined;
      session: SessionContext | undefined;
      body: unknown;
    } = { principal: undefined, tenant: undefined, session: undefined, body: undefined };
    const handler = async (request: FastifyRequest) => {
      seen = {
        principal: request.principal,
        tenant: request.tenant,
        session: request.sessionContext,
        body: request.body,
      };
      return { ok: true };
    };
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "POST",
        url: "/api/v1/test/whoami",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler,
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);

    const response = await server.inject({
      method: "POST",
      url: "/api/v1/test/whoami?tenant_id=tenant_b",
      headers: {
        cookie: alice.cookie,
        "x-tenant-id": "tenant_b",
        "x-csrf-token": alice.csrfToken,
        origin: BASE_URL,
        "content-type": "application/json",
      },
      payload: JSON.stringify({ tenantId: "tenant_b" }),
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });

    const principal = seen.principal;
    assert.ok(principal !== undefined, "the handler sees a principal");
    assert.equal(principal.tenantId, "tenant_a");
    assert.equal(principal.userId, alice.userId);
    assert.equal(principal.kind, "human");
    assert.equal(typeof principal.sessionId, "string");
    assert.notEqual(principal.sessionId, alice.cookie, "the session reference is not the cookie");
    assert.deepEqual(principal, {
      tenantId: "tenant_a",
      userId: alice.userId,
      kind: "human",
      sessionId: principal.sessionId,
      roles: [],
      teams: [],
      actorChain: [],
    });
    assert.equal(seen.tenant?.tenantId, "tenant_a");
    assert.equal(seen.session?.userId, alice.userId);
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-500709e4 authentication failures answer AUTHZ_UNAVAILABLE and run no handler", async () => {
  const db = await withTestDatabase();
  const servers: FastifyInstance[] = [];
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const engine = await permitAllEngine(clock);
    const alice = await session(db, a, "alice", clock);

    let handlerCalls = 0;
    const handler = async (): Promise<{ ok: boolean }> => {
      handlerCalls += 1;
      return { ok: true };
    };

    const poolNullServer = await testServer();
    servers.push(poolNullServer);
    assert.doesNotThrow(() => {
      installPep(poolNullServer, {
        pool: null,
        engine,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep pool null");
    assert.doesNotThrow(() => {
      defineRoute(poolNullServer, {
        method: "GET",
        url: "/api/v1/test/authz",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler,
      });
    }, "defineRoute pool null");
    expectUnavailable(
      await poolNullServer.inject({
        method: "GET",
        url: "/api/v1/test/authz",
        headers: { cookie: alice.cookie },
      }),
    );

    const engineNullServer = await testServer();
    servers.push(engineNullServer);
    assert.doesNotThrow(() => {
      installPep(engineNullServer, {
        pool: db.appPool,
        engine: null,
        clock,
        publicBaseUrl: BASE_URL,
      });
    }, "installPep engine null");
    assert.doesNotThrow(() => {
      defineRoute(engineNullServer, {
        method: "GET",
        url: "/api/v1/test/authz",
        auth: { kind: "session" },
        action: "read_self",
        schema: {},
        errors: [],
        handler,
      });
    }, "defineRoute engine null");
    expectUnavailable(
      await engineNullServer.inject({
        method: "GET",
        url: "/api/v1/test/authz",
        headers: { cookie: alice.cookie },
      }),
    );

    const verifier: AuthVerifier = async (_request, auth) => {
      if (auth.kind === "hmac" && auth.hmacKind === "mismatch") {
        return {
          principal: {
            tenantId: "tenant_b",
            userId: "bob",
            kind: "service",
            roles: [],
            teams: [],
            actorChain: [],
          },
          tenant: { tenantId: "tenant_a", reviewProfile: "team" },
        };
      }
      throw new Error("verifier failed");
    };
    assert.doesNotThrow(() => {
      registerAuthVerifier("hmac", verifier);
    }, "registerAuthVerifier");

    for (const hmacKind of ["throws", "mismatch"]) {
      const hmacServer = await testServer();
      servers.push(hmacServer);
      assert.doesNotThrow(() => {
        installPep(hmacServer, {
          pool: db.appPool,
          engine,
          clock,
          publicBaseUrl: BASE_URL,
        });
      }, `installPep ${hmacKind}`);
      assert.doesNotThrow(() => {
        defineRoute(hmacServer, {
          method: "GET",
          url: `/api/v1/test/hmac-${hmacKind}`,
          auth: { kind: "hmac", hmacKind },
          action: "read_self",
          schema: {},
          errors: [],
          handler,
        });
      }, `defineRoute ${hmacKind}`);
      expectUnavailable(
        await hmacServer.inject({ method: "GET", url: `/api/v1/test/hmac-${hmacKind}` }),
      );
    }

    assert.equal(handlerCalls, 0, "the handler never runs when authentication cannot run");
  } finally {
    for (const server of servers) {
      await server.close();
    }
    await db.close();
  }
});

test("C-2ae6619c a server carries one PEP and refuses an invalid public base url", async () => {
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
  const server = await testServer();
  const otherServer = await testServer();
  try {
    const deps: PepDeps = {
      pool: null,
      engine,
      clock,
      publicBaseUrl: BASE_URL,
    };
    assert.doesNotThrow(() => {
      installPep(server, deps);
    }, "installPep");
    expectDefinitionError(
      () => {
        installPep(server, deps);
      },
      "ROUTE_DUPLICATE",
      { what: "pep" },
    );
    expectDefinitionError(
      () => {
        installPep(otherServer, { ...deps, publicBaseUrl: "not a url" });
      },
      "ROUTE_DEF_INVALID",
      { reason: "public_base_url" },
    );
  } finally {
    await server.close();
    await otherServer.close();
  }
});
