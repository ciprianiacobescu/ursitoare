import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { createFlow } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
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
const CREATED_AT = "2026-10-25T09:00:00.000000Z";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  server: FastifyInstance;
  keyless: FastifyInstance;
  alice: Session;
  dave: Session;
  carol: Session;
  mallory: Session;
}

interface ErrorBody {
  error: { code: string };
}

interface ListBody {
  items: { flowId: string }[];
  next_cursor: string | null;
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function engineFor(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-flow-routes-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
}

async function serverFor(
  db: TestDatabase,
  clock: Clock,
  keyed: boolean,
): Promise<FastifyInstance> {
  const engine = await engineFor(clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  assert.doesNotThrow(() => {
    registerFlowRoutes(server, {
      pool: db.appPool,
      clock,
      engineKey: keyed ? { reveal: () => "k".repeat(64) } : null,
    });
  }, "registerFlowRoutes");
  return server;
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "dave", roles: ["author"], teams: ["ops"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["author"], teams: ["finance"] }], clock);

  const server = await serverFor(db, clock, true);
  const keyless = await serverFor(db, clock, false);
  return {
    db,
    a,
    b,
    server,
    keyless,
    alice: await createTestSession(db, a, "alice", clock),
    dave: await createTestSession(db, a, "dave", clock),
    carol: await createTestSession(db, a, "carol", clock),
    mallory: await createTestSession(db, b, "mallory", clock),
  };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.keyless.close();
  await h.db.close();
}

function post(h: Harness, session: Session, payload: unknown, key?: string) {
  const headers: Record<string, string> = {
    cookie: session.cookie,
    "x-csrf-token": session.csrfToken,
  };
  if (key !== undefined) headers["idempotency-key"] = key;
  return h.server.inject({ method: "POST", url: "/api/v1/flows", headers, payload: payload as never });
}

function get(server: FastifyInstance, session: Session, url: string) {
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

async function seedFlows(
  h: Harness,
  ctx: TenantContext,
  owner: Session,
  rows: readonly (readonly [string, string])[],
): Promise<void> {
  const clock = fixedClock(NOW);
  await withTenantTx(h.db.appPool, ctx, async (tx) => {
    for (const [name, ownerTeam] of rows) {
      await createFlow(tx, ctx, { name, ownerTeam }, { kind: "user", userId: owner.userId }, { clock });
    }
  });
}

test("C-e41f985e flows are created read replayed and refused over HTTP", async () => {
  const h = await createHarness();
  try {
    const first = await post(h, h.alice, { name: "rf-1-core", ownerTeam: "finance" }, "k1");
    assert.equal(first.statusCode, 201);
    const expected = {
      flowId: "rf-1-core",
      ownerTeam: "finance",
      createdBy: h.alice.userId,
      createdAt: CREATED_AT,
      versionCount: 0,
      latest: null,
    };
    assert.deepEqual(first.json(), expected);

    const replay = await post(h, h.alice, { name: "rf-1-core", ownerTeam: "finance" }, "k1");
    assert.equal(replay.statusCode, 201);
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.deepEqual(replay.json(), expected);

    const reused = await post(h, h.alice, { name: "rf-1-b", ownerTeam: "finance" }, "k1");
    assert.equal(reused.statusCode, 422);
    assert.equal((reused.json() as ErrorBody).error.code, "IDEMPOTENCY_KEY_REUSED");

    const dup = await post(h, h.alice, { name: "rf-1-core", ownerTeam: "finance" }, "k2");
    assert.equal(dup.statusCode, 409);
    assert.equal((dup.json() as ErrorBody).error.code, "ALREADY_EXISTS");

    for (const [i, body] of [
      { name: "Bad_Name", ownerTeam: "finance" },
      { name: "x-2", ownerTeam: "Fin ance" },
      { name: "x-1", ownerTeam: "finance", tenantId: "tenant_b" },
    ].entries()) {
      const bad = await post(h, h.alice, body, `bad-${i}`);
      assert.equal(bad.statusCode, 400);
      assert.equal((bad.json() as ErrorBody).error.code, "VALIDATION_FAILED");
    }

    const read = await get(h.server, h.alice, "/api/v1/flows/rf-1-core");
    assert.equal(read.statusCode, 200);
    assert.deepEqual(read.json(), expected);

    const ghost = await get(h.server, h.alice, "/api/v1/flows/ghost");
    assert.equal(ghost.statusCode, 404);
    assert.equal((ghost.json() as ErrorBody).error.code, "NOT_FOUND");

    const events = await listAuditEvents(h.db.appPool, h.a, {
      filter: { eventType: "flow.created" },
      order: "asc",
      limit: 50,
    });
    assert.equal(events.length, 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-538382af lists show the callers teams and page with the cursor contract", async () => {
  const h = await createHarness();
  try {
    await seedFlows(h, h.a, h.alice, [
      ["alpha", "finance"],
      ["beta", "finance"],
      ["gamma", "finance"],
      ["ops-one", "ops"],
    ]);
    await seedFlows(h, h.b, h.mallory, [["b-one", "finance"]]);

    const ids = async (session: Session) => {
      const res = await get(h.server, session, "/api/v1/flows");
      assert.equal(res.statusCode, 200);
      return (res.json() as ListBody).items.map((item) => item.flowId);
    };
    assert.deepEqual(await ids(h.dave), ["ops-one"]);
    assert.deepEqual(await ids(h.carol), []);
    assert.deepEqual(await ids(h.mallory), ["b-one"]);

    const first = await get(h.server, h.alice, "/api/v1/flows?limit=2");
    assert.equal(first.statusCode, 200);
    const page1 = first.json() as ListBody;
    assert.deepEqual(
      page1.items.map((item) => item.flowId),
      ["alpha", "beta"],
    );
    assert.equal(typeof page1.next_cursor, "string");
    const cursor = page1.next_cursor ?? "";

    const second = await get(
      h.server,
      h.alice,
      `/api/v1/flows?limit=2&cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(second.statusCode, 200);
    const page2 = second.json() as ListBody;
    assert.deepEqual(
      page2.items.map((item) => item.flowId),
      ["gamma"],
    );
    assert.equal(page2.next_cursor, null);

    const last = cursor.slice(-1) === "A" ? "B" : "A";
    const edited = cursor.slice(0, -1) + last;
    const tampered = await get(
      h.server,
      h.alice,
      `/api/v1/flows?limit=2&cursor=${encodeURIComponent(edited)}`,
    );
    assert.equal(tampered.statusCode, 400);
    assert.equal((tampered.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const foreign = await get(
      h.server,
      h.alice,
      `/api/v1/flows/alpha/versions?cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(foreign.statusCode, 400);
    assert.equal((foreign.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const all = await get(h.keyless, h.alice, "/api/v1/flows?limit=3");
    assert.equal(all.statusCode, 200);
    assert.equal((all.json() as ListBody).items.length, 3);
    const paged = await get(h.keyless, h.alice, "/api/v1/flows?limit=2");
    assert.equal(paged.statusCode, 503);
    assert.equal((paged.json() as ErrorBody).error.code, "ENGINE_KEY_REQUIRED");
    const withCursor = await get(
      h.keyless,
      h.alice,
      `/api/v1/flows?cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(withCursor.statusCode, 503);
    assert.equal((withCursor.json() as ErrorBody).error.code, "ENGINE_KEY_REQUIRED");
  } finally {
    await closeHarness(h);
  }
});
