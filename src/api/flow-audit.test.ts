import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { contentHash, parseFlowText } from "../authoring/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { readTestFlowText } from "../../test/support/catalogue/flows.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerFlowRoutes } from "./flow-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-10-25T09:00:00Z";

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function poolFailingAudit(pool: TenantPool): TenantPool {
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
              if (typeof text === "string" && text.includes("audit_")) {
                return Promise.reject(new Error("audit statements are unavailable"));
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

async function serverOn(
  db: TestDatabase,
  routePool: TenantPool,
): Promise<FastifyInstance> {
  const clock = fixedClock(NOW);
  const srcDir = await mkdtemp(join(tmpdir(), "api-flow-audit-src-"));
  engineDirs.push(srcDir);
  const engine = await createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerFlowRoutes(server, {
    pool: routePool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) },
    catalogueFor: async () => loadTestCatalogue(),
  });
  return server;
}

test("C-94dc4b8c the flow routes audit each change once and roll back on a failed append", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = fixedClock(NOW);
    await seedFlowActors(db, a, [{ subject: "alice", roles: ["author"], teams: ["finance"] }], clock);
    const alice = await createTestSession(db, a, "alice", clock);
    const headers = { cookie: alice.cookie, "x-csrf-token": alice.csrfToken };
    const server = await serverOn(db, db.appPool);
    const failing = await serverOn(db, poolFailingAudit(db.appPool));
    try {
      const t1 = readTestFlowText("rf-1-core");
      const parsed = parseFlowText(t1, "yaml");
      assert.ok(parsed.ok, "the test text parses");
      const hash = contentHash(parsed.doc);

      const created = await server.inject({
        method: "POST",
        url: "/api/v1/flows",
        headers,
        payload: { name: "rf-1-core", ownerTeam: "finance" },
      });
      assert.equal(created.statusCode, 201);
      for (let i = 0; i < 2; i += 1) {
        const saved = await server.inject({
          method: "POST",
          url: "/api/v1/flows/rf-1-core/versions",
          headers,
          payload: { format: "yaml", text: t1 },
        });
        assert.equal(saved.statusCode, i === 0 ? 201 : 200);
      }
      const validated = await server.inject({
        method: "POST",
        url: `/api/v1/flows/rf-1-core/versions/${hash}/validate`,
        headers,
      });
      assert.equal(validated.statusCode, 200);
      const result = (validated.json() as { result: { warnings: unknown[] } }).result;
      const read = await server.inject({
        method: "GET",
        url: `/api/v1/flows/rf-1-core/versions/${hash}`,
        headers: { cookie: alice.cookie },
      });
      assert.equal(read.statusCode, 200);

      const t2 = JSON.stringify({ ...(parsed.doc as Record<string, unknown>), description: "second" });
      const refused = await failing.inject({
        method: "POST",
        url: "/api/v1/flows/rf-1-core/versions",
        headers,
        payload: { format: "json", text: t2 },
      });
      assert.equal(refused.statusCode, 500);
      assert.equal((refused.json() as { error: { code: string } }).error.code, "INTERNAL");

      const events = await listAuditEvents(db.appPool, a, { filter: {}, order: "asc", limit: 50 });
      const flowEvents = events.filter((event) => event.eventType.startsWith("flow."));
      assert.deepEqual(
        flowEvents.map((event) => event.eventType),
        ["flow.created", "flow.version_saved", "flow.version_validated"],
      );
      assert.deepEqual(flowEvents[0]?.target, { kind: "flow", id: "rf-1-core" });
      assert.deepEqual(flowEvents[0]?.payload, { ownerTeam: "finance" });
      assert.deepEqual(flowEvents[1]?.target, { kind: "flow_version", id: hash });
      assert.deepEqual(flowEvents[1]?.actor, { kind: "user", id: alice.userId });
      assert.deepEqual(flowEvents[1]?.payload, { flowId: "rf-1-core", number: 1, surface: "yaml" });
      assert.deepEqual(flowEvents[2]?.payload, {
        flowId: "rf-1-core",
        ok: true,
        errors: 0,
        warnings: result.warnings.length,
        state: "validated",
      });

      const flow = await server.inject({
        method: "GET",
        url: "/api/v1/flows/rf-1-core",
        headers: { cookie: alice.cookie },
      });
      assert.equal((flow.json() as { versionCount: number }).versionCount, 1);
    } finally {
      await server.close();
      await failing.close();
    }
  } finally {
    await db.close();
  }
});
