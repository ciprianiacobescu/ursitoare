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
import { payloadDigest, runRepository, stepRepository } from "../runs/index.ts";
import type { NewRun, RunRecord, StepWrite } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import { registerRunRoutes } from "./run-routes.ts";
import { toRunView, toStepView } from "./run-views.ts";
import type { RunView, StepView } from "./run-views.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerRunRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const FLOW_HASH = "sha256:" + "a".repeat(64);
const INPUT = { invoice: { id: "inv-1", total: 120 } };
const PAID = { payment_id: "pay-1", status: "paid" };
const PAY_ARGS = { vendor_id: "v1", amount: 120, currency: "EUR", reference: "inv-1" };
const STEP_STARTED = "2026-11-02T09:30:00.000000Z";
const STEP_ENDED = "2026-11-02T09:30:01.000000Z";

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string };
}

interface EventRow {
  run_id: string | null;
  type: string;
}

interface StepPage {
  items: StepView[];
  next_cursor: string | null;
}

interface FakeDurable {
  calls: string[];
  cancel(workflowId: string): Promise<void>;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  sessions: Record<string, Session>;
  durable: FakeDurable;
  server: FastifyInstance;
}

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

function stepWrite(
  runId: string,
  nodeId: string,
  seq: number,
  overrides: Partial<StepWrite> = {},
): StepWrite {
  return {
    runId,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt: 1,
    generation: 0,
    seq,
    kind: "block",
    state: "completed",
    input: null,
    output: null,
    outcome: null,
    error: null,
    taint: [],
    policyDecisionId: null,
    idemKey: null,
    startedAt: new Date(STEP_STARTED),
    endedAt: new Date(STEP_ENDED),
    ...overrides,
  };
}

async function seedSteps(h: Harness): Promise<void> {
  const rows: StepWrite[] = [
    stepWrite("run-1", "pay", 2, {
      input: PAY_ARGS,
      output: PAID,
      idemKey: "ik_pay_1",
      policyDecisionId: "dec_1",
      taint: ["untrusted"],
    }),
    stepWrite("run-1", "lookup", 0),
    stepWrite("run-1", "done", 3, {
      kind: "end",
      state: "started",
      endedAt: null,
    }),
    stepWrite("run-1", "route", 1, { kind: "switch", outcome: "active" }),
  ];
  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    for (const row of rows) {
      await stepRepository.upsert(tx, h.a, row);
    }
  });
}

async function serverFor(
  db: TestDatabase,
  engine: PolicyEngine,
  clock: Clock,
  pool: TestDatabase["appPool"],
  engineKey: KeyMaterial,
  durable: FakeDurable,
): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  assert.doesNotThrow(() => {
    registerRunRoutes(server, { pool, clock, ids: sequentialIds(100), engineKey, durable });
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
  const calls: string[] = [];
  const durable: FakeDurable = {
    calls,
    async cancel(workflowId: string): Promise<void> {
      calls.push(workflowId);
    },
  };

  const server = await serverFor(db, engine, clock, db.appPool, keyed, durable);
  return { db, a, b, clock, sessions, durable, server };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function get(server: FastifyInstance, session: Session, url: string) {
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

function cancel(server: FastifyInstance, session: Session, runId: string) {
  return server.inject({
    method: "POST",
    url: `/api/v1/runs/${runId}/cancel`,
    headers: { cookie: session.cookie, "x-csrf-token": session.csrfToken },
  });
}

async function storedRun(h: Harness, ctx: TenantContext, runId: string): Promise<RunRecord> {
  const record = await withTenantTx(h.db.appPool, ctx, (tx) =>
    runRepository.get(tx, ctx, runId),
  );
  assert.ok(record !== null, `run ${runId} is stored`);
  return record;
}

async function storedStepViews(h: Harness, runId: string): Promise<StepView[]> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    stepRepository.list(tx, h.a, runId, { limit: 10 }),
  );
  return result.steps.map(toStepView);
}

async function eventRows(h: Harness, ctx: TenantContext): Promise<EventRow[]> {
  return withTenantTx(h.db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query<EventRow>(
      `SELECT run_id, type
         FROM ursitoare.event
        WHERE tenant_id = $1
        ORDER BY event_id, "time"`,
      [ctx.tenantId],
    );
    return rows;
  });
}

test("C-e2575718 tenant B reaches nothing of tenant A", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    await seedSteps(h);
    const alice = h.sessions["alice"] as Session;
    const mallory = h.sessions["mallory"] as Session;

    const foreignRun = await get(h.server, mallory, "/api/v1/runs/run-3");
    assert.equal(foreignRun.statusCode, 404);
    assert.equal((foreignRun.json() as ErrorBody).error.code, "NOT_FOUND");

    const ownSteps = await get(h.server, mallory, "/api/v1/runs/run-1/steps");
    assert.equal(ownSteps.statusCode, 200);
    assert.deepEqual(ownSteps.json(), { items: [], next_cursor: null });

    const foreignPayload = await get(
      h.server,
      mallory,
      `/api/v1/runs/run-1/payloads/${payloadDigest(PAID)}`,
    );
    assert.equal(foreignPayload.statusCode, 404);
    assert.equal((foreignPayload.json() as ErrorBody).error.code, "NOT_FOUND");

    const foreignCancel = await cancel(h.server, mallory, "run-5");
    assert.equal(foreignCancel.statusCode, 404);
    assert.equal((foreignCancel.json() as ErrorBody).error.code, "NOT_FOUND");

    assert.deepEqual(h.durable.calls, []);
    assert.equal((await storedRun(h, h.a, "run-5")).state, "running");
    assert.deepEqual(await eventRows(h, h.a), []);
    assert.deepEqual(await eventRows(h, h.b), []);

    const aliceRun = await get(h.server, alice, "/api/v1/runs/run-1");
    assert.equal(aliceRun.statusCode, 200);
    assert.deepEqual(aliceRun.json(), toRunView(await storedRun(h, h.a, "run-1")));

    const aliceSteps = await get(h.server, alice, "/api/v1/runs/run-1/steps");
    assert.equal(aliceSteps.statusCode, 200);
    const page = aliceSteps.json() as StepPage;
    assert.deepEqual(
      page.items.map((step) => step.seq),
      [0, 1, 2, 3],
    );
    assert.deepEqual(page.items, await storedStepViews(h, "run-1"));

    const cancelled = await cancel(h.server, alice, "run-5");
    assert.equal(cancelled.statusCode, 202);
    assert.deepEqual(h.durable.calls, ["tenant_a:run-5"]);
    assert.equal((cancelled.json() as RunView).state, "cancelled");
  } finally {
    await closeHarness(h);
  }
});
