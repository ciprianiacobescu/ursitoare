import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import {
  appendEvent,
  createRunStore,
  envelopeStore,
  payloadDigest,
  runRepository,
  stepRepository,
} from "../index.ts";
import type {
  NewRun,
  RunStore,
  StepWrite,
} from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-10-25T09:00:00.000Z");
const T1 = new Date("2026-10-25T09:00:01.000Z");
const STEP_A_AT = new Date("2026-10-25T09:00:00.000Z");
const STEP_B_AT = new Date("2026-10-25T09:00:02.000Z");

function NEW_RUN(runId: string, overrides: Partial<NewRun> = {}): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "rf-1-core",
    flowHash: FLOW_HASH,
    ownerTeam: "finance",
    mode: "mock",
    trigger: "test",
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    input: { invoice: { id: "inv-1", total: 120 } },
    mocks: null,
    ...overrides,
  };
}

function STEP(runId: string, nodeId: string, seq: number, overrides: Partial<StepWrite> = {}): StepWrite {
  return {
    runId,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt: 1,
    generation: 0,
    seq,
    kind: "block",
    state: "started",
    input: null,
    output: null,
    outcome: null,
    error: null,
    taint: [],
    policyDecisionId: null,
    idemKey: null,
    startedAt: AT,
    endedAt: null,
    ...overrides,
  };
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
function storeOk(pool: Parameters<typeof createRunStore>[0]): RunStore {
  let store: RunStore | undefined;
  assert.doesNotThrow(() => {
    store = createRunStore(pool);
  });
  assert.ok(store !== undefined, "createRunStore returned a store");
  return store;
}

async function createStoreOk(
  store: RunStore,
  ctx: TenantContext,
  run: NewRun,
  at: Date,
) {
  let result: Awaited<ReturnType<RunStore["createRun"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.createRun(ctx, run, at);
  });
  assert.ok(result !== undefined, "createRun returned a record");
  return result;
}

async function getRunStoreOk(store: RunStore, ctx: TenantContext, runId: string) {
  let result: Awaited<ReturnType<RunStore["getRun"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.getRun(ctx, runId);
  });
  assert.ok(result !== undefined, "getRun returned a record or null");
  return result;
}

async function transitionStoreOk(
  store: RunStore,
  ctx: TenantContext,
  runId: string,
  change: Parameters<RunStore["transition"]>[2],
) {
  let result: Awaited<ReturnType<RunStore["transition"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.transition(ctx, runId, change);
  });
  assert.ok(result !== undefined, "transition returned a record or null");
  return result;
}

async function recordStepStoreOk(store: RunStore, ctx: TenantContext, step: StepWrite) {
  let result: Awaited<ReturnType<RunStore["recordStep"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.recordStep(ctx, step);
  });
  assert.ok(result !== undefined, "recordStep returned a step record");
  return result;
}

async function listStepsStoreOk(
  store: RunStore,
  ctx: TenantContext,
  runId: string,
  q: { limit: number; afterSeq?: number },
) {
  let result: Awaited<ReturnType<RunStore["listSteps"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.listSteps(ctx, runId, q);
  });
  assert.ok(result !== undefined, "listSteps returned a page");
  return result;
}

async function getPayloadStoreOk(store: RunStore, ctx: TenantContext, sha256: string) {
  let result: Awaited<ReturnType<RunStore["getPayload"]>> | undefined;
  await assert.doesNotReject(async () => {
    result = await store.getPayload(ctx, sha256);
  });
  assert.ok(result !== undefined, "getPayload returned a stored payload or null");
  return result;
}

async function countRows(
  db: TestDatabase,
  ctx: TenantContext,
  table: string,
): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
    return Number(rows[0]?.n);
  });
}

async function snapshotCounts(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<Record<string, number>> {
  const tables = ["ursitoare.run", "ursitoare.step_execution", "ursitoare.envelope_payload", "ursitoare.event"];
  const counts: Record<string, number> = {};
  for (const table of tables) {
    counts[table] = await countRows(db, ctx, table);
  }
  return counts;
}

test("C-9bff3a45 two tenants never see each other run data", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const store = storeOk(db.appPool);

    const aInput = { who: "a" };
    const bInput = { who: "b" };
    const aInputDigest = payloadDigest(aInput);
    const bInputDigest = payloadDigest(bInput);

    const aRun = await createStoreOk(store, a, NEW_RUN("r_1", { input: aInput }), AT);
    const bRun = await createStoreOk(store, b, NEW_RUN("r_1", { input: bInput }), AT);
    assert.equal(aRun.inputRef, aInputDigest);
    assert.equal(bRun.inputRef, bInputDigest);

    await recordStepStoreOk(store, a, STEP("r_1", "n1", 0, { startedAt: STEP_A_AT }));
    await recordStepStoreOk(store, b, STEP("r_1", "n1", 0, { startedAt: STEP_B_AT }));

    const running = await transitionStoreOk(store, a, "r_1", {
      state: "running",
      from: ["queued"],
      at: T1,
    });
    assert.ok(running !== null, "A's run starts");
    assert.equal(running.state, "running");

    const aStored = await getRunStoreOk(store, a, "r_1");
    assert.ok(aStored !== null, "A reads its run");
    assert.equal(aStored.inputRef, aInputDigest);
    assert.equal(aStored.state, "running");

    const bStored = await getRunStoreOk(store, b, "r_1");
    assert.ok(bStored !== null, "B reads its run");
    assert.equal(bStored.inputRef, bInputDigest);
    assert.equal(bStored.state, "queued");

    assert.equal(
      await getPayloadStoreOk(store, b, aInputDigest),
      null,
      "B cannot read A's payload by digest",
    );

    const aSteps = await listStepsStoreOk(store, a, "r_1", { limit: 10 });
    const bSteps = await listStepsStoreOk(store, b, "r_1", { limit: 10 });
    assert.equal(aSteps.steps.length, 1, "A lists only its own step");
    assert.equal(bSteps.steps.length, 1, "B lists only its own step");
    assert.equal(aSteps.steps[0]?.startedAt, "2026-10-25T09:00:00.000000Z");
    assert.equal(bSteps.steps[0]?.startedAt, "2026-10-25T09:00:02.000000Z");

    const beforeA = await snapshotCounts(db, a);
    const beforeB = await snapshotCounts(db, b);

    const mismatchRun = NEW_RUN("r_mismatch");
    const mismatchStep = STEP("r_1", "n1", 1);
    const mismatchValue = { probe: true };
    const aDigest = payloadDigest(aInput);

    await withTenantTx(db.appPool, b, async (tx: TenantTx) => {
      const calls: Array<{ name: string; call: () => Promise<unknown> }> = [
        { name: "runRepository.create", call: () => runRepository.create(tx, a, mismatchRun, AT) },
        { name: "runRepository.get", call: () => runRepository.get(tx, a, "r_1") },
        {
          name: "runRepository.list",
          call: () => runRepository.list(tx, a, { limit: 10, filter: { sql: "true", values: [] } }),
        },
        {
          name: "runRepository.transition",
          call: () =>
            runRepository.transition(tx, a, "r_1", {
              state: "running",
              from: ["queued"],
              at: T1,
            }),
        },
        { name: "stepRepository.upsert", call: () => stepRepository.upsert(tx, a, mismatchStep) },
        { name: "stepRepository.list", call: () => stepRepository.list(tx, a, "r_1", { limit: 10 }) },
        { name: "envelopeStore.put", call: () => envelopeStore.put(tx, a, mismatchValue) },
        { name: "envelopeStore.get", call: () => envelopeStore.get(tx, a, aDigest) },
        {
          name: "envelopeStore.referencedBy",
          call: () => envelopeStore.referencedBy(tx, a, "r_1", aDigest),
        },
        {
          name: "appendEvent",
          call: () =>
            appendEvent(tx, a, {
              eventId: "ev_mismatch",
              runId: "r_1",
              correlationId: null,
              type: "run.created",
              data: {},
              time: AT,
            }),
        },
      ];

      for (const { name, call } of calls) {
        await assert.rejects(call(), { code: "RUN_DATA_INVALID" }, name);
      }
    });

    assert.deepEqual(await snapshotCounts(db, a), beforeA, "A gains no row");
    assert.deepEqual(await snapshotCounts(db, b), beforeB, "B gains no row");
  } finally {
    await db.close();
  }
});
