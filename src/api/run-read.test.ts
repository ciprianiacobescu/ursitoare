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
import type { NewRun, RunRecord, StepWrite, TenantPool } from "../runs/index.ts";
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
const OPS_INPUT = { note: "ops" };
const STEP_STARTED = "2026-11-02T09:30:00.000000Z";
const STEP_ENDED = "2026-11-02T09:30:01.000000Z";

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

interface StepPage {
  items: StepView[];
  next_cursor: string | null;
}

interface PayloadBody {
  sha256: string;
  mediaType: string;
  size: number;
  data: unknown;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  sessions: Record<string, Session>;
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
    newRun("run-3", "ops", dave.userId, { flowId: "ops-flow", input: OPS_INPUT }),
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

  return { db, a, b, clock, sessions, server };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function get(server: FastifyInstance, session: Session, url: string) {
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

function assertForbidden(response: { statusCode: number; json(): unknown }): void {
  assert.equal(response.statusCode, 403);
  const body = response.json() as ErrorBody;
  assert.equal(body.error.code, "FORBIDDEN");
  assert.equal(typeof body.error.details?.decisionId, "string");
}

async function storedRunView(h: Harness, ctx: TenantContext, runId: string): Promise<RunView> {
  const record = await withTenantTx(h.db.appPool, ctx, (tx) =>
    runRepository.get(tx, ctx, runId),
  );
  assert.ok(record !== null, `run ${runId} is stored`);
  return toRunView(record);
}

async function storedStepViews(h: Harness, runId: string): Promise<StepView[]> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    stepRepository.list(tx, h.a, runId, { limit: 10 }),
  );
  return result.steps.map(toStepView);
}

test("C-30c3a628 a run is read by its owner team and its initiator", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    const alice = h.sessions["alice"] as Session;
    const bob = h.sessions["bob"] as Session;
    const dave = h.sessions["dave"] as Session;
    const erin = h.sessions["erin"] as Session;
    const carol = h.sessions["carol"] as Session;
    const mallory = h.sessions["mallory"] as Session;

    const run1 = await storedRunView(h, h.a, "run-1");
    assert.equal(run1.state, "running");
    assert.equal(run1.startedAt, "2026-11-02T09:00:02.000000Z");

    const aliceRead = await get(h.server, alice, "/api/v1/runs/run-1");
    assert.equal(aliceRead.statusCode, 200);
    assert.deepEqual(aliceRead.json(), run1);

    const bobRead = await get(h.server, bob, "/api/v1/runs/run-1");
    assert.equal(bobRead.statusCode, 200);
    assert.deepEqual(bobRead.json(), run1);

    const erinRun4 = await get(h.server, erin, "/api/v1/runs/run-4");
    assert.equal(erinRun4.statusCode, 200);
    assert.deepEqual(erinRun4.json(), await storedRunView(h, h.a, "run-4"));

    const erinRun3 = await get(h.server, erin, "/api/v1/runs/run-3");
    assert.equal(erinRun3.statusCode, 200);
    assert.deepEqual(erinRun3.json(), await storedRunView(h, h.a, "run-3"));

    assertForbidden(await get(h.server, erin, "/api/v1/runs/run-1"));

    const daveRun3 = await get(h.server, dave, "/api/v1/runs/run-3");
    assert.equal(daveRun3.statusCode, 200);
    assert.deepEqual(daveRun3.json(), await storedRunView(h, h.a, "run-3"));

    assertForbidden(await get(h.server, dave, "/api/v1/runs/run-1"));
    assertForbidden(await get(h.server, carol, "/api/v1/runs/run-1"));

    const malloryRead = await get(h.server, mallory, "/api/v1/runs/run-1");
    assert.equal(malloryRead.statusCode, 200);
    const malloryView = malloryRead.json() as RunView;
    assert.deepEqual(malloryView, await storedRunView(h, h.b, "run-1"));
    assert.equal(malloryView.principal.userId, mallory.userId);

    const missing = await get(h.server, alice, "/api/v1/runs/run-9");
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.json() as ErrorBody).error.code, "NOT_FOUND");

    const malformed = await get(h.server, alice, "/api/v1/runs/bad%20id");
    assert.equal(malformed.statusCode, 400);
    assert.equal((malformed.json() as ErrorBody).error.code, "VALIDATION_FAILED");
  } finally {
    await closeHarness(h);
  }
});

test("C-1be56c70 steps are listed in seq order and paged", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    await seedSteps(h);
    const alice = h.sessions["alice"] as Session;

    const first = await get(h.server, alice, "/api/v1/runs/run-1/steps?limit=3");
    assert.equal(first.statusCode, 200);
    const firstPage = first.json() as StepPage;
    assert.deepEqual(
      firstPage.items.map((step) => step.seq),
      [0, 1, 2],
    );
    assert.ok(firstPage.next_cursor !== null, "the first step page has a cursor");

    const stored = await storedStepViews(h, "run-1");
    assert.deepEqual(firstPage.items, stored.slice(0, 3));

    const second = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/steps?limit=3&cursor=${encodeURIComponent(firstPage.next_cursor)}`,
    );
    assert.equal(second.statusCode, 200);
    const secondPage = second.json() as StepPage;
    assert.deepEqual(
      secondPage.items.map((step) => step.seq),
      [3],
    );
    assert.equal(secondPage.next_cursor, null);
    assert.deepEqual([...firstPage.items, ...secondPage.items], stored);

    const pay = firstPage.items.find((step) => step.seq === 2);
    assert.ok(pay !== undefined, "the seq 2 step is on the first page");
    assert.deepEqual(pay, {
      seq: 2,
      nodeId: "pay",
      kind: "block",
      effectSeq: 0,
      attempt: 1,
      state: "completed",
      outcome: null,
      error: null,
      inputRef: payloadDigest(PAY_ARGS),
      outputRef: payloadDigest(PAID),
      idemKey: "ik_pay_1",
      policyDecisionId: "dec_1",
      taint: ["untrusted"],
      startedAt: STEP_STARTED,
      endedAt: STEP_ENDED,
    });

    const done = secondPage.items.find((step) => step.seq === 3);
    assert.ok(done !== undefined, "the seq 3 step is on the second page");
    assert.equal(done.state, "started");
    assert.equal(done.endedAt, null);

    const crossRun = await get(
      h.server,
      alice,
      `/api/v1/runs/run-2/steps?cursor=${encodeURIComponent(firstPage.next_cursor)}`,
    );
    assert.equal(crossRun.statusCode, 400);
    assert.equal((crossRun.json() as ErrorBody).error.code, "CURSOR_INVALID");

    const empty = await get(h.server, alice, "/api/v1/runs/run-2/steps");
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), { items: [], next_cursor: null });

    const stranger = await get(h.server, alice, "/api/v1/runs/run-3/steps");
    assert.equal(stranger.statusCode, 403);
    assert.equal((stranger.json() as ErrorBody).error.code, "FORBIDDEN");

    const missing = await get(h.server, alice, "/api/v1/runs/run-9/steps");
    assert.equal(missing.statusCode, 404);
    assert.equal((missing.json() as ErrorBody).error.code, "NOT_FOUND");
  } finally {
    await closeHarness(h);
  }
});

test("C-931a72ff a payload is served only through a run that references it", async () => {
  const h = await createHarness();
  try {
    await seedFixture(h);
    await seedSteps(h);
    const alice = h.sessions["alice"] as Session;
    const dave = h.sessions["dave"] as Session;

    const inputDigest = payloadDigest(INPUT);
    const paidDigest = payloadDigest(PAID);
    const opsDigest = payloadDigest(OPS_INPUT);

    const inputResponse = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/payloads/${inputDigest}`,
    );
    assert.equal(inputResponse.statusCode, 200);
    assert.equal(inputResponse.headers["cache-control"], "no-store");
    assert.deepEqual(inputResponse.json(), {
      sha256: inputDigest,
      mediaType: "application/json",
      size: 38,
      data: INPUT,
    });

    const paidResponse = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/payloads/${paidDigest}`,
    );
    assert.equal(paidResponse.statusCode, 200);
    assert.deepEqual((paidResponse.json() as PayloadBody).data, PAID);

    const unreferenced = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/payloads/${opsDigest}`,
    );
    assert.equal(unreferenced.statusCode, 404);
    assert.equal((unreferenced.json() as ErrorBody).error.code, "NOT_FOUND");

    const zero = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/payloads/${"0".repeat(64)}`,
    );
    assert.equal(zero.statusCode, 404);
    assert.equal((zero.json() as ErrorBody).error.code, "NOT_FOUND");

    await withTenantTx(h.db.ownerPool, h.a, async (tx) => {
      await tx.query(
        "DELETE FROM ursitoare.envelope_payload WHERE tenant_id = $1 AND sha256 = $2",
        [h.a.tenantId, paidDigest],
      );
    });
    const expired = await get(
      h.server,
      alice,
      `/api/v1/runs/run-1/payloads/${paidDigest}`,
    );
    assert.equal(expired.statusCode, 404);
    assert.equal((expired.json() as ErrorBody).error.code, "NOT_FOUND");

    for (const malformed of ["a".repeat(63), "A".repeat(64), "zz"]) {
      const response = await get(
        h.server,
        alice,
        `/api/v1/runs/run-1/payloads/${malformed}`,
      );
      assert.equal(response.statusCode, 400, malformed);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", malformed);
    }

    const daveOps = await get(
      h.server,
      dave,
      `/api/v1/runs/run-3/payloads/${opsDigest}`,
    );
    assert.equal(daveOps.statusCode, 200);
    assert.deepEqual((daveOps.json() as PayloadBody).data, OPS_INPUT);

    const daveInput = await get(
      h.server,
      dave,
      `/api/v1/runs/run-1/payloads/${inputDigest}`,
    );
    assert.equal(daveInput.statusCode, 403);
    assert.equal((daveInput.json() as ErrorBody).error.code, "FORBIDDEN");
  } finally {
    await closeHarness(h);
  }
});
