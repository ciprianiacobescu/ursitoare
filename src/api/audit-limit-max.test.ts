import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { appendAuditCommitted } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerAuditRoutes } from "./audit-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";

interface PageBody {
  items: unknown[];
  next_cursor: string | null;
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function setup() {
  const db = await withTestDatabase();
  const clock = fixedClock(T0);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  const { a } = await seedTwoTenants(db);
  const srcDir = await mkdtemp(join(tmpdir(), "api-audit-limit-max-"));
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
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerAuditRoutes(server, { pool: db.appPool, clock, engineKey: { reveal: () => "k".repeat(64) } });
  const alice = await createTestSession(db, a, "alice", clock);
  for (let index = 1; index <= 3; index += 1) {
    await appendAuditCommitted(
      db.appPool,
      a,
      {
        eventType: "role.granted",
        actor: { kind: "user", id: "u_1" },
        target: { kind: "role", id: `r_${String(index)}` },
      },
      { clock: fixedClock(`2026-10-25T09:0${String(index)}:00.000Z`) },
    );
  }
  return { db, server, cookie: alice.cookie };
}

test("C-4af021e5 audit list limit=200 answers the page of limit=199 and limit=201 is refused", async () => {
  const { db, server, cookie } = await setup();
  try {
    const at200 = await server.inject({ method: "GET", url: `/api/v1/audit?limit=200`, headers: { cookie } });
    assert.equal(at200.statusCode, 200, "limit=200 is not a 500");
    const at199 = await server.inject({ method: "GET", url: `/api/v1/audit?limit=199`, headers: { cookie } });
    assert.equal(at199.statusCode, 200);
    const body200 = at200.json() as PageBody;
    const body199 = at199.json() as PageBody;
    assert.ok(body200.items.length <= 200);
    assert.deepEqual(body200.items, body199.items, "same page as limit=199");
    assert.equal(body200.next_cursor, body199.next_cursor);
    const over = await server.inject({ method: "GET", url: `/api/v1/audit?limit=201`, headers: { cookie } });
    assert.equal(over.statusCode, 400);
    assert.equal((over.json() as { error: { code: string } }).error.code, "VALIDATION_FAILED");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-4af021e5 decision list limit=200 answers the page of limit=199 and limit=201 is refused", async () => {
  const { db, server, cookie } = await setup();
  try {
    const at199 = await server.inject({ method: "GET", url: `/api/v1/policy-decisions?limit=199`, headers: { cookie } });
    assert.equal(at199.statusCode, 200);
    const at200 = await server.inject({ method: "GET", url: `/api/v1/policy-decisions?limit=200`, headers: { cookie } });
    assert.equal(at200.statusCode, 200, "limit=200 is not a 500");
    const body199 = at199.json() as PageBody;
    const body200 = at200.json() as PageBody;
    assert.ok(body200.items.length <= 200);
    assert.deepEqual(body200.items.slice(1), body199.items, "same page as limit=199 plus the recorded decision");
    assert.equal(body200.next_cursor, body199.next_cursor);
    const over = await server.inject({ method: "GET", url: `/api/v1/policy-decisions?limit=201`, headers: { cookie } });
    assert.equal(over.statusCode, 400);
    assert.equal((over.json() as { error: { code: string } }).error.code, "VALIDATION_FAILED");
  } finally {
    await server.close();
    await db.close();
  }
});
