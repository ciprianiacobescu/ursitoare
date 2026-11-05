import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { runRepository } from "../runs/index.ts";
import type { NewRun, RunRecord, TenantPool } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { ERROR_CODES, isRegisteredCode } from "./error-codes.ts";
import { installPep } from "./pep.ts";
import { registerRunRoutes } from "./run-routes.ts";
import type { RunView } from "./run-views.ts";
import { toRunView } from "./run-views.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerRunRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const FLOW_HASH = "sha256:" + "a".repeat(64);
const INPUT = { invoice: { id: "inv-1", total: 120 } };
const PAID = { payment_id: "pay-1", status: "paid" };

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface ListBody {
  items: RunView[];
  next_cursor: string | null;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  sessions: Record<string, Session>;
  server: FastifyInstance;
  keyless: FastifyInstance;
  failing: FastifyInstance;
  nullPool: FastifyInstance;
}

const failingPool: TenantPool = {
  connect: async () => {
    throw new Error("boom");
  },
};

function newRun(
  runId: string,
  ownerTeam: string,
  principalUserId: string,
  overrides: Partial<NewRun> = {},
): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "rf-1-core",
    flowHash: FLOW_HASH,
    ownerTeam,
    mode: "mock",
    trigger: "test",
    principal: { userId: principalUserId, kind: "human" },
    actorChain: [principalUserId],
    input: INPUT,
    mocks: null,
    ...overrides,
  };
}

async function createRun(
  h: Harness,
  ctx: TenantContext,
  run: NewRun,
  at: Date,
): Promise<RunRecord> {
  let record: RunRecord | undefined;
  await withTenantTx(h.db.appPool, ctx, async (tx) => {
    record = await runRepository.create(tx, ctx, run, at);
  });
  assert.ok(record !== undefined, `run ${run.runId} was stored`);
  return record;
}

async function seedFixture(h: Harness): Promise<void> {
  const alice = h.sessions["alice"] as Session;
  const bob = h.sessions["bob"] as Session;
  const dave = h.sessions["dave"] as Session;
  const erin = h.sessions["erin"] as Session;
  const mallory = h.sessions["mallory"] as Session;

  await createRun(
    h,
    h.a,
    newRun("run-1", "finance", alice.userId),
    new Date("2026-11-02T09:00:01Z"),
  );
  await createRun(
    h,
    h.a,
    newRun("run-2", "finance", bob.userId),
    new Date("2026-11-02T09:00:02Z"),
  );
  await createRun(
    h,
    h.a,
    newRun("run-3", "ops", dave.userId, { flowId: "ops-flow", input: { note: "ops" } }),
    new Date("2026-11-02T09:00:03Z"),
  );
  await createRun(
    h,
    h.a,
    newRun("run-4", "finance", erin.userId, { flowId: "rf-2-ap" }),
    new Date("2026-11-02T09:00:04Z"),
  );
  await createRun(
    h,
    h.a,
    newRun("run-5", "finance", alice.userId),
    new Date("2026-11-02T09:00:05Z"),
  );

  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    await runRepository.transition(tx, h.a, "run-1", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-11-02T09:00:02Z"),
    });
    await runRepository.transition(tx, h.a, "run-2", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-11-02T09:00:02Z"),
    });
    await runRepository.transition(tx, h.a, "run-2", {
      state: "completed",
      from: ["running"],
      at: new Date("2026-11-02T09:00:03Z"),
      output: PAID,
    });
    await runRepository.transition(tx, h.a, "run-4", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-11-02T09:00:05Z"),
    });
    await runRepository.transition(tx, h.a, "run-4", {
      state: "failed",
      from: ["running"],
      at: new Date("2026-11-02T09:00:06Z"),
      error: { code: "FLOW_FAILED", message: "flow ended failed", node: "rejected" },
      terminalNode: "rejected",
    });
    await runRepository.transition(tx, h.a, "run-5", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-11-02T09:00:06Z"),
    });
  });

  await createRun(
    h,
    h.b,
    newRun("run-1", "finance", mallory.userId),
    new Date("2026-11-02T09:00:01Z"),
  );
}

async function serverFor(
  db: TestDatabase,
  engine: PolicyEngine,
  clock: Clock,
  pool: TenantPool | null,
  engineKey: KeyMaterial | null,
): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  assert.doesNotThrow(() => {
    registerRunRoutes(server, { pool, clock, ids: sequentialIds(100), engineKey, durable: null });
  }, "registerRunRoutes");
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
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "dave", roles: ["author"], teams: ["ops"] },
      { subject: "erin", roles: ["author"], teams: ["ops"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["author"], teams: ["finance"] }], clock);

  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "dave", "erin", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);

  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const keyed: KeyMaterial = { reveal: () => "k".repeat(64) };

  const server = await serverFor(db, engine, clock, db.appPool, keyed);
  const keyless = await serverFor(db, engine, clock, db.appPool, null);
  const failing = await serverFor(db, engine, clock, failingPool, keyed);
  const nullPool = await serverFor(db, engine, clock, null, keyed);

  return { db, a, b, clock, sessions, server, keyless, failing, nullPool };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.keyless.close();
  await h.failing.close();
  await h.nullPool.close();
  await h.db.close();
}

function get(server: FastifyInstance, session: Session, url: string) {
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

async function listedIds(
  h: Harness,
  session: Session,
  url: string,
): Promise<string[]> {
  const response = await get(h.server, session, url);
  assert.equal(response.statusCode, 200, `GET ${url}`);
  return (response.json() as ListBody).items.map((item) => item.id);
}

async function storedViews(h: Harness, ids: readonly string[]): Promise<RunView[]> {
  const views: RunView[] = [];
  for (const id of ids) {
    const record = await withTenantTx(h.db.appPool, h.a, (tx) =>
      runRepository.get(tx, h.a, id),
    );
    assert.ok(record !== null, `run ${id} is stored`);
    views.push(toRunView(record));
  }
  return views;
}

test("C-96e47324 the runs failure code is registered with status and message", () => {
  const entry = ERROR_CODES["RUNS_UNAVAILABLE"];
  assert.deepEqual(entry, { status: 503, message: "Runs are unavailable" });
  assert.equal(isRegisteredCode("RUNS_UNAVAILABLE"), true);
});

test("C-55135a13 the run list shows a callers teams and their own runs newest first", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);

    const alice = h.sessions["alice"] as Session;
    const bob = h.sessions["bob"] as Session;
    const dave = h.sessions["dave"] as Session;
    const erin = h.sessions["erin"] as Session;
    const carol = h.sessions["carol"] as Session;
    const mallory = h.sessions["mallory"] as Session;

    assert.deepEqual(await listedIds(h, alice, "/api/v1/runs"), [
      "run-5",
      "run-4",
      "run-2",
      "run-1",
    ]);
    assert.deepEqual(await listedIds(h, bob, "/api/v1/runs"), [
      "run-5",
      "run-4",
      "run-2",
      "run-1",
    ]);
    assert.deepEqual(await listedIds(h, dave, "/api/v1/runs"), ["run-3"]);
    assert.deepEqual(await listedIds(h, erin, "/api/v1/runs"), ["run-4", "run-3"]);
    assert.deepEqual(await listedIds(h, carol, "/api/v1/runs"), []);
    assert.deepEqual(await listedIds(h, mallory, "/api/v1/runs"), ["run-1"]);

    const aliceResponse = await get(h.server, alice, "/api/v1/runs");
    assert.equal(aliceResponse.statusCode, 200);
    const aliceBody = aliceResponse.json() as ListBody;
    assert.deepEqual(
      aliceBody.items,
      await storedViews(h, ["run-5", "run-4", "run-2", "run-1"]),
    );

    const run4 = aliceBody.items.find((item) => item.id === "run-4");
    assert.ok(run4 !== undefined, "alice sees run-4");
    assert.deepEqual(run4.error, {
      code: "FLOW_FAILED",
      message: "flow ended failed",
      node: "rejected",
    });
    assert.equal(run4.terminalNode, "rejected");
    assert.equal(run4.endedAt, "2026-11-02T09:00:06.000000Z");

    const malloryResponse = await get(h.server, mallory, "/api/v1/runs");
    assert.equal(malloryResponse.statusCode, 200);
    const malloryBody = malloryResponse.json() as ListBody;
    assert.equal(malloryBody.items.length, 1);
    assert.equal(malloryBody.items[0]?.principal.userId, mallory.userId);

    const anonymous = await h.server.inject({ method: "GET", url: "/api/v1/runs" });
    assert.equal(anonymous.statusCode, 401);
    assert.equal((anonymous.json() as ErrorBody).error.code, "UNAUTHENTICATED");
  } finally {
    await closeHarness(h);
  }
});

test("C-4a2fee15 the run list filters pages and refuses bad queries", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    const alice = h.sessions["alice"] as Session;
    const mallory = h.sessions["mallory"] as Session;

    assert.deepEqual(await listedIds(h, alice, "/api/v1/runs?flowId=rf-1-core"), [
      "run-5",
      "run-2",
      "run-1",
    ]);
    assert.deepEqual(await listedIds(h, alice, "/api/v1/runs?state=failed"), ["run-4"]);
    assert.deepEqual(
      await listedIds(h, alice, "/api/v1/runs?flowId=rf-1-core&state=failed"),
      [],
    );

    const first = await get(h.server, alice, "/api/v1/runs?limit=2");
    assert.equal(first.statusCode, 200);
    const firstPage = first.json() as ListBody;
    assert.deepEqual(
      firstPage.items.map((item) => item.id),
      ["run-5", "run-4"],
    );
    assert.ok(firstPage.next_cursor !== null, "the first page has a cursor");
    const cursor = firstPage.next_cursor;

    const second = await get(
      h.server,
      alice,
      `/api/v1/runs?limit=2&cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(second.statusCode, 200);
    const secondPage = second.json() as ListBody;
    assert.deepEqual(
      secondPage.items.map((item) => item.id),
      ["run-2", "run-1"],
    );
    assert.equal(secondPage.next_cursor, null);

    const replacement = cursor.slice(-1) === "A" ? "B" : "A";
    const changed = cursor.slice(0, -1) + replacement;
    const tampered = await get(
      h.server,
      alice,
      `/api/v1/runs?cursor=${encodeURIComponent(changed)}`,
    );
    assert.equal(tampered.statusCode, 400);
    assert.equal((tampered.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const foreign = await get(
      h.server,
      mallory,
      `/api/v1/runs?cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(foreign.statusCode, 400);
    assert.equal((foreign.json() as ErrorBody).error.code, "CURSOR_INVALID");

    for (const query of ["state=bogus", "limit=0", "limit=201", "flowId=Bad_Id"]) {
      const bad = await get(h.server, alice, `/api/v1/runs?${query}`);
      assert.equal(bad.statusCode, 400, query);
      assert.equal((bad.json() as ErrorBody).error.code, "VALIDATION_FAILED", query);
    }

    const keylessAll = await get(h.keyless, alice, "/api/v1/runs?limit=5");
    assert.equal(keylessAll.statusCode, 200);
    const keylessPaged = await get(h.keyless, alice, "/api/v1/runs?limit=2");
    assert.equal(keylessPaged.statusCode, 503);
    assert.equal((keylessPaged.json() as ErrorBody).error.code, "ENGINE_KEY_REQUIRED");
    const keylessCursor = await get(
      h.keyless,
      alice,
      `/api/v1/runs?cursor=${encodeURIComponent(cursor)}`,
    );
    assert.equal(keylessCursor.statusCode, 503);
    assert.equal((keylessCursor.json() as ErrorBody).error.code, "ENGINE_KEY_REQUIRED");

    const broken = await get(h.failing, alice, "/api/v1/runs");
    assert.equal(broken.statusCode, 500);
    const brokenBody = broken.json() as ErrorBody;
    assert.equal(brokenBody.error.code, "INTERNAL");
    assert.equal(brokenBody.error.message, "Internal server error");
    assert.equal(broken.body.includes("boom"), false);
  } finally {
    await closeHarness(h);
  }
});

test("C-42e9e9e8 a list without a pool answers RUNS_UNAVAILABLE", async () => {
  const h = await createHarness();
  try {
    const alice = h.sessions["alice"] as Session;
    const response = await get(h.nullPool, alice, "/api/v1/runs");
    assert.equal(response.statusCode, 503);
    const body = response.json() as ErrorBody;
    assert.equal(body.error.code, "RUNS_UNAVAILABLE");
    assert.equal(body.error.message, "Runs are unavailable");

    const anonymous = await h.nullPool.inject({ method: "GET", url: "/api/v1/runs" });
    assert.equal(anonymous.statusCode, 401);
    assert.equal((anonymous.json() as ErrorBody).error.code, "UNAUTHENTICATED");
  } finally {
    await closeHarness(h);
  }
});
