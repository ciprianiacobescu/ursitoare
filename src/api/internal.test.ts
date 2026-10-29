import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { sequentialIds, systemClock } from "../core/index.ts";
import type { Principal } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { buildInternalServer } from "./internal.ts";
import type { PepDeps } from "./pep.ts";
import { defineRoute, registerAuthVerifier, RouteDefinitionError } from "./route.ts";
import { buildServer } from "./server.ts";
import type { ServerDeps } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const TENANT_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };
const SERVICE_PRINCIPAL: Principal = {
  tenantId: "tenant_a",
  userId: "svc-test",
  kind: "service",
  roles: [],
  teams: [],
  actorChain: [],
};

const engineDirs: string[] = [];

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

function deps(overrides?: Partial<ServerDeps>): ServerDeps {
  return {
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
    ...overrides,
  };
}

async function permitAllEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-internal-src-"));
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

function expectListenerMismatch(run: () => void): void {
  assert.throws(run, (error: unknown) => {
    assert.ok(error instanceof RouteDefinitionError, "expected RouteDefinitionError");
    assert.equal(error.code, "ROUTE_LISTENER_MISMATCH");
    assert.equal(error.details.listener, "internal");
    return true;
  });
}

assert.equal(typeof buildInternalServer, "function");

registerAuthVerifier("service_token", async (request) => {
  if (request.headers["x-test-service"] !== "ok") {
    return null;
  }
  return { principal: SERVICE_PRINCIPAL, tenant: TENANT_A };
});

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-da82873d the internal listener serves only service-token routes and no health", async (t) => {
  const db = await withTestDatabase();
  t.after(async () => {
    await db.close();
  });
  const publicServer = await buildServer(deps());
  t.after(async () => {
    await publicServer.close();
  });

  const engine = await permitAllEngine(systemClock);
  const pep: PepDeps = { pool: db.appPool, engine, clock: systemClock, publicBaseUrl: BASE_URL };

  let internal: FastifyInstance | undefined;
  await assert.doesNotReject(async () => {
    internal = await buildInternalServer({ ...deps(), pep });
  }, "buildInternalServer");
  assert.ok(internal !== undefined, "buildInternalServer returns a server");
  const server: FastifyInstance = internal;
  t.after(async () => {
    await server.close();
  });

  assert.doesNotThrow(() => {
    defineRoute(server, {
      method: "POST",
      url: "/v1/internal/test",
      auth: { kind: "service_token" },
      action: "read_self",
      schema: {},
      errors: [],
      handler: async () => ({ ok: true }),
    });
  }, "defineRoute service_token");

  const accepted = await server.inject({
    method: "POST",
    url: "/v1/internal/test",
    headers: { "x-test-service": "ok" },
  });
  assert.equal(accepted.statusCode, 200);
  assert.deepEqual(accepted.json(), { ok: true });

  const refused = await server.inject({ method: "POST", url: "/v1/internal/test" });
  assert.equal(refused.statusCode, 401);
  assert.deepEqual(refused.json(), {
    error: { code: "UNAUTHENTICATED", message: "Authentication required" },
  });

  expectListenerMismatch(() => {
    defineRoute(server, {
      method: "GET",
      url: "/v1/internal/bearer",
      auth: { kind: "bearer", audience: "ursitoare-mcp" },
      action: "read_self",
      schema: {},
      errors: [],
      handler: async () => ({ ok: true }),
    });
  });
  expectListenerMismatch(() => {
    defineRoute(server, {
      method: "GET",
      url: "/v1/internal/public",
      auth: { kind: "public", reason: "well_known" },
      schema: {},
      errors: [],
      handler: async () => ({ ok: true }),
    });
  });

  const health = await server.inject({ method: "GET", url: "/health" });
  assert.equal(health.statusCode, 404);

  const absent = await publicServer.inject({
    method: "POST",
    url: "/v1/internal/test",
    headers: { "x-test-service": "ok" },
  });
  assert.equal(absent.statusCode, 404);
});
