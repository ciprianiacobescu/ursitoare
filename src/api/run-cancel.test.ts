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
import { payloadDigest, runRepository } from "../runs/index.ts";
import type { NewRun, RunRecord, RunState } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import { registerRunRoutes } from "./run-routes.ts";
import { toRunView } from "./run-views.ts";
import type { RunView } from "./run-views.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerRunRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const ENDED_AT = "2026-11-02T10:00:00.000000Z";
const FLOW_HASH = "sha256:" + "a".repeat(64);
const INPUT = { invoice: { id: "inv-1", total: 120 } };
const PAID = { payment_id: "pay-1", status: "paid" };

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: { decisionId?: string; reason?: string };
  };
}

interface EventRow {
  run_id: string | null;
  type: string;
  data: unknown;
}

interface CancelBehaviour {
  (workflowId: string): Promise<void>;
}

interface FakeDurable {
  calls: string[];
  cancel(workflowId: string): Promise<void>;
  setBehaviour(next: CancelBehaviour): void;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  sessions: Record<string, Session>;
  durable: FakeDurable;
  server: FastifyInstance;
  nullPool: FastifyInstance;
  noRuntime: FastifyInstance;
}

function createDurable(initial?: CancelBehaviour): FakeDurable {
  let behaviour: CancelBehaviour = initial ?? (async () => {});
  const calls: string[] = [];
  return {
    calls,
    async cancel(workflowId: string): Promise<void> {
      calls.push(workflowId);
      await behaviour(workflowId);
    },
    setBehaviour(next: CancelBehaviour): void {
      behaviour = next;
    },
  };
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

async function serverFor(
  db: TestDatabase,
  engine: PolicyEngine,
  clock: Clock,
  pool: TestDatabase["appPool"] | null,
  engineKey: KeyMaterial | null,
  durable: FakeDurable | null,
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

  const durable = createDurable();
  const server = await serverFor(db, engine, clock, db.appPool, keyed, durable);
  const nullPool = await serverFor(db, engine, clock, null, keyed, durable);
  const noRuntime = await serverFor(db, engine, clock, db.appPool, keyed, null);

  return { db, a, b, clock, sessions, durable, server, nullPool, noRuntime };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.nullPool.close();
  await h.noRuntime.close();
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

function cancelWithoutCsrf(server: FastifyInstance, session: Session, runId: string) {
  return server.inject({
    method: "POST",
    url: `/api/v1/runs/${runId}/cancel`,
    headers: { cookie: session.cookie },
  });
}

function assertRunUnavailable(response: { statusCode: number; json(): unknown }): void {
  assert.equal(response.statusCode, 503);
  const body = response.json() as ErrorBody;
  assert.equal(body.error.code, "RUNS_UNAVAILABLE");
  assert.equal(body.error.message, "Runs are unavailable");
}

function assertRefused(response: { statusCode: number; json(): unknown }): void {
  assert.equal(response.statusCode, 422);
  const body = response.json() as ErrorBody;
  assert.equal(body.error.code, "OPERATION_REFUSED");
  assert.deepEqual(body.error.details, { reason: "run_not_active" });
}

function assertForbidden(response: { statusCode: number; json(): unknown }): void {
  assert.equal(response.statusCode, 403);
  const body = response.json() as ErrorBody;
  assert.equal(body.error.code, "FORBIDDEN");
  assert.equal(typeof body.error.details?.decisionId, "string");
}

async function storedRun(h: Harness, ctx: TenantContext, runId: string): Promise<RunRecord> {
  const record = await withTenantTx(h.db.appPool, ctx, (tx) =>
    runRepository.get(tx, ctx, runId),
  );
  assert.ok(record !== null, `run ${runId} is stored`);
  return record;
}

async function storedRunView(h: Harness, ctx: TenantContext, runId: string): Promise<RunView> {
  return toRunView(await storedRun(h, ctx, runId));
}

async function storedState(h: Harness, ctx: TenantContext, runId: string): Promise<RunState> {
  return (await storedRun(h, ctx, runId)).state;
}

async function eventRows(h: Harness, ctx: TenantContext): Promise<EventRow[]> {
  return withTenantTx(h.db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query<EventRow>(
      `SELECT run_id, type, data
         FROM ursitoare.event
        WHERE tenant_id = $1
        ORDER BY event_id, "time"`,
      [ctx.tenantId],
    );
    return rows;
  });
}

function eventData(event: EventRow | undefined): { by?: unknown; from?: unknown } {
  assert.ok(event !== undefined, "the event is present");
  return event.data as { by?: unknown; from?: unknown };
}

test("C-f05105e2 cancelling an active run stops it once and records the event", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    const alice = h.sessions["alice"] as Session;
    const dave = h.sessions["dave"] as Session;

    const first = await cancel(h.server, alice, "run-1");
    assert.equal(first.statusCode, 202);
    const firstView = first.json() as RunView;
    assert.deepEqual(firstView, await storedRunView(h, h.a, "run-1"));
    assert.equal(firstView.state, "cancelled");
    assert.equal(firstView.startedAt, "2026-11-02T09:00:02.000000Z");
    assert.equal(firstView.endedAt, ENDED_AT);

    const second = await cancel(h.server, dave, "run-3");
    assert.equal(second.statusCode, 202);
    const secondView = second.json() as RunView;
    assert.deepEqual(secondView, await storedRunView(h, h.a, "run-3"));
    assert.equal(secondView.state, "cancelled");
    assert.equal(secondView.startedAt, null);
    assert.equal(secondView.endedAt, ENDED_AT);

    assert.deepEqual(h.durable.calls, ["tenant_a:run-1", "tenant_a:run-3"]);

    const afterFirstTwo = (await eventRows(h, h.a)).filter(
      (event) => event.type === "run.cancelled",
    );
    assert.equal(afterFirstTwo.length, 2);
    const run1Event = afterFirstTwo.find((event) => event.run_id === "run-1");
    const run3Event = afterFirstTwo.find((event) => event.run_id === "run-3");
    assert.deepEqual(eventData(run1Event), { by: alice.userId, from: "running" });
    assert.deepEqual(eventData(run3Event), { by: dave.userId, from: "queued" });

    const read = await get(h.server, alice, "/api/v1/runs/run-1");
    assert.equal(read.statusCode, 200);
    assert.equal((read.json() as RunView).state, "cancelled");

    const concurrent = await Promise.all([
      cancel(h.server, alice, "run-5"),
      cancel(h.server, alice, "run-5"),
    ]);
    const statuses = concurrent.map((response) => response.statusCode).sort();
    assert.deepEqual(statuses, [202, 422]);

    const accepted = concurrent.find((response) => response.statusCode === 202);
    const refused = concurrent.find((response) => response.statusCode === 422);
    assert.ok(accepted !== undefined, "one concurrent cancel is accepted");
    assert.ok(refused !== undefined, "one concurrent cancel is refused");
    assert.deepEqual(accepted.json(), await storedRunView(h, h.a, "run-5"));
    assertRefused(refused);
    assert.equal(await storedState(h, h.a, "run-5"), "cancelled");

    const events = (await eventRows(h, h.a)).filter((event) => event.type === "run.cancelled");
    assert.equal(events.length, 3);
    assert.equal(events.filter((event) => event.run_id === "run-5").length, 1);

    const laterCalls = h.durable.calls.slice(2);
    assert.ok(laterCalls.length === 1 || laterCalls.length === 2, "one or two run-5 cancels");
    for (const call of laterCalls) {
      assert.equal(call, "tenant_a:run-5");
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-c4e29aa6 cancel refusals leave the run alone", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    const alice = h.sessions["alice"] as Session;
    const bob = h.sessions["bob"] as Session;
    const erin = h.sessions["erin"] as Session;

    assertRefused(await cancel(h.server, alice, "run-2"));

    const firstRun1 = await cancel(h.server, alice, "run-1");
    assert.equal(firstRun1.statusCode, 202);
    assertRefused(await cancel(h.server, alice, "run-1"));

    const noToken = await cancelWithoutCsrf(h.server, alice, "run-5");
    assert.equal(noToken.statusCode, 403);
    assert.equal((noToken.json() as ErrorBody).error.code, "CSRF_INVALID");

    assertForbidden(await cancel(h.server, bob, "run-5"));
    assertForbidden(await cancel(h.server, erin, "run-4"));

    h.durable.setBehaviour(async () => {
      throw new Error("postgres://app:pw@db/x");
    });
    const rejected = await cancel(h.server, alice, "run-5");
    assertRunUnavailable(rejected);
    assert.equal(rejected.body.includes("postgres"), false);
    assert.equal(await storedState(h, h.a, "run-5"), "running");
    assert.equal(
      (await eventRows(h, h.a)).filter(
        (event) => event.type === "run.cancelled" && event.run_id === "run-5",
      ).length,
      0,
    );

    h.durable.setBehaviour(async () => {
      await withTenantTx(h.db.appPool, h.a, async (tx) => {
        await runRepository.transition(tx, h.a, "run-5", {
          state: "completed",
          from: ["running"],
          at: new Date(NOW),
        });
      });
    });
    assertRefused(await cancel(h.server, alice, "run-5"));
    assert.equal(await storedState(h, h.a, "run-5"), "completed");
    assert.equal(
      (await eventRows(h, h.a)).filter(
        (event) => event.type === "run.cancelled" && event.run_id === "run-5",
      ).length,
      0,
    );

    assert.deepEqual(h.durable.calls, [
      "tenant_a:run-1",
      "tenant_a:run-5",
      "tenant_a:run-5",
    ]);
  } finally {
    await closeHarness(h);
  }
});

test("C-42e9e9e8 no pool and no runtime answer RUNS_UNAVAILABLE", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    const alice = h.sessions["alice"] as Session;

    assertRunUnavailable(await get(h.nullPool, alice, "/api/v1/runs"));
    assertRunUnavailable(await get(h.nullPool, alice, "/api/v1/runs/run-1"));
    assertRunUnavailable(await get(h.nullPool, alice, "/api/v1/runs/run-1/steps"));
    assertRunUnavailable(
      await get(
        h.nullPool,
        alice,
        `/api/v1/runs/run-1/payloads/${payloadDigest(INPUT)}`,
      ),
    );
    assertRunUnavailable(await cancel(h.nullPool, alice, "run-1"));

    assertRunUnavailable(await cancel(h.noRuntime, alice, "run-5"));
    assertRunUnavailable(await cancel(h.noRuntime, alice, "run-2"));
    assert.equal(await storedState(h, h.a, "run-5"), "running");

    const list = await get(h.noRuntime, alice, "/api/v1/runs");
    assert.equal(list.statusCode, 200);
    const body = list.json() as { items: RunView[]; next_cursor: string | null };
    assert.deepEqual(
      body.items.map((item) => item.id),
      ["run-5", "run-4", "run-2", "run-1"],
    );
  } finally {
    await closeHarness(h);
  }
});
