import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

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
  items: { seq: string }[];
  next_cursor: string | null;
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function walk(
  server: FastifyInstance,
  cookie: string,
  order: "asc" | "desc",
): Promise<string[][]> {
  const pages: string[][] = [];
  let cursor: string | null = null;
  do {
    const query: string =
      `/api/v1/audit?order=${order}&limit=5` +
      (cursor === null ? "" : `&cursor=${encodeURIComponent(cursor)}`);
    const response = await server.inject({ method: "GET", url: query, headers: { cookie } });
    assert.equal(response.statusCode, 200, "the list answers 200");
    const body = response.json() as PageBody;
    pages.push(body.items.map((item) => item.seq));
    cursor = body.next_cursor;
  } while (cursor !== null && pages.length < 10);
  return pages;
}

test("C-0ff607fa audit events are listed in numeric seq order across pages", async () => {
  const db = await withTestDatabase();
  const clock = fixedClock(T0);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  try {
    const { a } = await seedTwoTenants(db);
    const srcDir = await mkdtemp(join(tmpdir(), "api-audit-seq-order-"));
    engineDirs.push(srcDir);
    const engine = await createPolicyEngine({
      srcDir,
      tenantPolicies: [
        {
          id: "t-all",
          layer: "tenant",
          text: '@id("t-all") permit (principal, action, resource);',
        },
      ],
      clock,
      ids: sequentialIds(200),
      logger: createLogger({ level: "silent", destination: silentDestination }),
    });
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
    registerAuditRoutes(server, { pool: db.appPool, clock, engineKey: { reveal: () => "k".repeat(64) } });
    const alice = await createTestSession(db, a, "alice", clock);

    for (let index = 1; index <= 12; index += 1) {
      await appendAuditCommitted(
        db.appPool,
        a,
        {
          eventType: "role.granted",
          actor: { kind: "user", id: "u_1" },
          target: { kind: "role", id: `r_${String(index)}` },
        },
        { clock: fixedClock(`2026-10-25T09:${String(index).padStart(2, "0")}:00.000Z`) },
      );
    }

    assert.deepEqual(
      await walk(server, alice.cookie, "desc"),
      [
        ["12", "11", "10", "9", "8"],
        ["7", "6", "5", "4", "3"],
        ["2", "1"],
      ],
      "desc pages follow numeric seq",
    );
    assert.deepEqual(
      await walk(server, alice.cookie, "asc"),
      [
        ["1", "2", "3", "4", "5"],
        ["6", "7", "8", "9", "10"],
        ["11", "12"],
      ],
      "asc pages follow numeric seq",
    );
  } finally {
    await server.close();
    await db.close();
  }
});
