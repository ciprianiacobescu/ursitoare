import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { appendAuditCommitted, listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, listPolicyDecisions } from "../pdp/index.ts";
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

async function setup(withKey: boolean, auditRows: number) {
  const db = await withTestDatabase();
  const clock = fixedClock(T0);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  const { a } = await seedTwoTenants(db);
  const srcDir = await mkdtemp(join(tmpdir(), "api-audit-next-page-"));
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
  registerAuditRoutes(server, {
    pool: db.appPool,
    clock,
    engineKey: withKey ? { reveal: () => "k".repeat(64) } : null,
  });
  const alice = await createTestSession(db, a, "alice", clock);
  for (let index = 1; index <= auditRows; index += 1) {
    await appendAuditCommitted(
      db.appPool,
      a,
      {
        eventType: "role.granted",
        actor: { kind: "user", id: "u_1" },
        target: { kind: "role", id: `r_${String(index)}` },
      },
      { clock: fixedClock(T0) },
    );
  }
  return { db, a, server, cookie: alice.cookie };
}

async function recordDecisions(
  server: Awaited<ReturnType<typeof setup>>["server"],
  cookie: string,
  count: number,
): Promise<void> {
  for (let index = 0; index < count; index += 1) {
    await server.inject({ method: "GET", url: "/api/v1/audit?limit=1", headers: { cookie } });
  }
}

test("C-893f2503 audit store accepts limit 201 so a handler can look one row past 200", async () => {
  const { db, a, server } = await setup(true, 3);
  try {
    let rows: unknown[] = [];
    await assert.doesNotReject(async () => {
      rows = await listAuditEvents(db.appPool, a, { order: "asc", limit: 201 });
    });
    assert.equal(rows.length, 3);
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-893f2503 decision store accepts limit 201 so a handler can look one row past 200", async () => {
  const { db, a, server, cookie } = await setup(true, 0);
  try {
    await recordDecisions(server, cookie, 3);
    let rows: unknown[] = [];
    await assert.doesNotReject(async () => {
      rows = await listPolicyDecisions(db.appPool, a, { order: "asc", limit: 201 });
    });
    assert.ok(rows.length >= 3);
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-893f2503 audit list limit=200 with 201 rows and a key gives next_cursor and item 201 on page 2", async () => {
  const { db, server, cookie } = await setup(true, 201);
  try {
    const first = await server.inject({
      method: "GET",
      url: "/api/v1/audit?limit=200&order=asc",
      headers: { cookie },
    });
    assert.equal(first.statusCode, 200);
    const page1 = first.json() as PageBody;
    assert.equal(page1.items.length, 200);
    assert.notEqual(page1.next_cursor, null);
    const second = await server.inject({
      method: "GET",
      url: `/api/v1/audit?limit=200&order=asc&cursor=${encodeURIComponent(page1.next_cursor ?? "")}`,
      headers: { cookie },
    });
    assert.equal(second.statusCode, 200);
    const page2 = second.json() as PageBody;
    assert.equal(page2.items.length, 1);
    assert.equal(page2.next_cursor, null);
    const seen = new Set(page1.items.map((item) => JSON.stringify(item)));
    assert.ok(!seen.has(JSON.stringify(page2.items[0])));
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-893f2503 audit list limit=200 with 201 rows and no key is refused with ENGINE_KEY_REQUIRED", async () => {
  const { db, server, cookie } = await setup(false, 201);
  try {
    const answer = await server.inject({
      method: "GET",
      url: "/api/v1/audit?limit=200",
      headers: { cookie },
    });
    assert.equal(answer.statusCode, 503);
    assert.equal((answer.json() as { error: { code: string } }).error.code, "ENGINE_KEY_REQUIRED");
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-893f2503 decision list limit=200 with 201 decisions and a key gives next_cursor and a page 2", async () => {
  const { db, server, cookie } = await setup(true, 0);
  try {
    await recordDecisions(server, cookie, 205);
    const first = await server.inject({
      method: "GET",
      url: "/api/v1/policy-decisions?limit=200&order=asc",
      headers: { cookie },
    });
    assert.equal(first.statusCode, 200);
    const page1 = first.json() as PageBody;
    assert.equal(page1.items.length, 200);
    assert.notEqual(page1.next_cursor, null);
    const second = await server.inject({
      method: "GET",
      url: `/api/v1/policy-decisions?limit=200&order=asc&cursor=${encodeURIComponent(page1.next_cursor ?? "")}`,
      headers: { cookie },
    });
    assert.equal(second.statusCode, 200);
    const page2 = second.json() as PageBody;
    assert.ok(page2.items.length >= 1);
    const seen = new Set(page1.items.map((item) => JSON.stringify(item)));
    assert.ok(!seen.has(JSON.stringify(page2.items[0])));
  } finally {
    await server.close();
    await db.close();
  }
});

test("C-893f2503 decision list limit=200 with 201 decisions and no key is refused with ENGINE_KEY_REQUIRED", async () => {
  const { db, server, cookie } = await setup(false, 0);
  try {
    await recordDecisions(server, cookie, 205);
    const answer = await server.inject({
      method: "GET",
      url: "/api/v1/policy-decisions?limit=200",
      headers: { cookie },
    });
    assert.equal(answer.statusCode, 503);
    assert.equal((answer.json() as { error: { code: string } }).error.code, "ENGINE_KEY_REQUIRED");
  } finally {
    await server.close();
    await db.close();
  }
});
