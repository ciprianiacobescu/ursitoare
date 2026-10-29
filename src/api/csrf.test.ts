import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds } from "../core/index.ts";
import { resolveSession, verifyCsrfToken } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import type { PepDeps } from "./pep.ts";
import { defineRoute, registerAuthVerifier } from "./route.ts";
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-csrf-src-"));
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

function expectCsrfRefused(response: {
  statusCode: number;
  body: string;
}): void {
  assert.equal(response.statusCode, 403);
  assert.deepEqual(JSON.parse(response.body), {
    error: { code: "CSRF_INVALID", message: "CSRF token missing or invalid" },
  });
}

const hmacVerifier: AuthVerifier = async (_request, auth) => {
  if (auth.kind !== "hmac") {
    return null;
  }
  return {
    principal: {
      tenantId: "tenant_a",
      userId: "service-under-test",
      kind: "service",
      roles: [],
      teams: [],
      actorChain: [],
    },
    tenant: { tenantId: "tenant_a", reviewProfile: "team" },
  };
};

registerAuthVerifier("hmac", hmacVerifier);

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-da8f0a06 a session POST without the current CSRF token or with a foreign origin is refused", async () => {
  assert.equal(typeof installPep, "function");

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
        method: "POST",
        url: "/api/v1/test/echo",
        auth: { kind: "session" },
        action: "read_self",
        schema: { body: { type: "object" } },
        errors: [],
        handler,
      });
    }, "defineRoute");

    const alice = await session(db, a, "alice", clock);
    const bob = await session(db, a, "bob", clock);

    const refused = [
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: { cookie: alice.cookie, "content-type": "application/json" },
        payload: "{}",
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: {
          cookie: alice.cookie,
          "x-csrf-token": "x",
          "content-type": "application/json",
        },
        payload: "{}",
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: {
          cookie: alice.cookie,
          "x-csrf-token": bob.csrfToken,
          "content-type": "application/json",
        },
        payload: "{}",
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: {
          cookie: alice.cookie,
          "x-csrf-token": alice.csrfToken,
          origin: "https://evil.example",
          "content-type": "application/json",
        },
        payload: "{}",
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: {
          cookie: alice.cookie,
          "x-csrf-token": alice.csrfToken,
          origin: "null",
          "content-type": "application/json",
        },
        payload: "{}",
      }),
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: {
          cookie: alice.cookie,
          origin: "https://evil.example",
          "content-type": "application/x-www-form-urlencoded",
        },
        payload: "a=1",
      }),
    ];

    for (const response of refused) {
      expectCsrfRefused(response);
    }
    assert.equal(handlerCalls, 0, "the handler never runs when CSRF is refused");

    const events = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{
        event_type: string;
        actor: { kind: string; id: string };
        payload: { reason?: string; method?: string; route?: string };
      }>(
        "SELECT event_type, actor, payload FROM ursitoare.audit_event WHERE event_type = 'authz.csrf_refused' ORDER BY seq",
      );
      return result.rows;
    });

    assert.equal(events.length, 6);
    assert.deepEqual(
      events.map((event) => event.payload.reason),
      ["token", "token", "token", "origin", "origin", "origin"],
    );
    for (const event of events) {
      assert.equal(event.actor.kind, "user");
      assert.equal(event.actor.id, alice.userId);
      assert.equal(event.payload.method, "POST");
      assert.equal(event.payload.route, "/api/v1/test/echo");
    }
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-3422c6ae C-da8f0a06 a current token and a matching origin pass while a missing token is refused", async () => {
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
        method: "POST",
        url: "/api/v1/test/echo",
        auth: { kind: "session" },
        action: "read_self",
        schema: { body: { type: "object" } },
        errors: [],
        handler,
      });
    }, "defineRoute POST");
    assert.doesNotThrow(() => {
      defineRoute(server, {
        method: "GET",
        url: "/api/v1/test/echo",
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
        url: "/api/v1/test/hmac",
        auth: { kind: "hmac", hmacKind: "delegate" },
        action: "read_self",
        schema: { body: { type: "object" } },
        errors: [],
        handler,
      });
    }, "defineRoute hmac");

    const alice = await session(db, a, "alice", clock);

    expectCsrfRefused(
      await server.inject({
        method: "POST",
        url: "/api/v1/test/echo",
        headers: { cookie: alice.cookie, "content-type": "application/json" },
        payload: "{}",
      }),
    );

    const withoutOrigin = await server.inject({
      method: "POST",
      url: "/api/v1/test/echo",
      headers: {
        cookie: alice.cookie,
        "x-csrf-token": alice.csrfToken,
        "content-type": "application/json",
      },
      payload: "{}",
    });
    assert.equal(withoutOrigin.statusCode, 200);
    assert.deepEqual(withoutOrigin.json(), { ok: true });

    const withMatchingOrigin = await server.inject({
      method: "POST",
      url: "/api/v1/test/echo",
      headers: {
        cookie: alice.cookie,
        "x-csrf-token": alice.csrfToken,
        origin: BASE_URL,
        "content-type": "application/json",
      },
      payload: "{}",
    });
    assert.equal(withMatchingOrigin.statusCode, 200);
    assert.deepEqual(withMatchingOrigin.json(), { ok: true });

    const safeMethod = await server.inject({
      method: "GET",
      url: "/api/v1/test/echo",
      headers: { cookie: alice.cookie },
    });
    assert.equal(safeMethod.statusCode, 200);
    assert.deepEqual(safeMethod.json(), { ok: true });

    const otherKind = await server.inject({
      method: "POST",
      url: "/api/v1/test/hmac",
      headers: { "content-type": "application/json" },
      payload: "{}",
    });
    assert.equal(otherKind.statusCode, 200);
    assert.deepEqual(otherKind.json(), { ok: true });

    const sessionId = alice.cookie.slice("ursitoare_session=".length);
    const resolved = await resolveSession(db.appPool, sessionId, { clock });
    assert.ok(resolved !== null, "alice's session is live");
    assert.equal(await verifyCsrfToken(db.appPool, resolved, alice.csrfToken), true);
    assert.equal(handlerCalls, 4);
  } finally {
    await server.close();
    await db.close();
  }
});
