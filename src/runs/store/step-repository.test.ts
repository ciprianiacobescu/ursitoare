import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { envelopeStore, payloadDigest, runRepository, stepRepository } from "../index.ts";
import type {
  NewRun,
  PayloadValue,
  RunRecord,
  RunTransition,
  StepRecord,
  StepState,
  StepWrite,
} from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-10-25T09:00:00.000Z");
const CREATED_AT = new Date("2026-10-25T23:59:59.500Z");

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
async function createOk(
  tx: TenantTx,
  ctx: TenantContext,
  run: NewRun,
  at: Date,
): Promise<RunRecord> {
  let result: RunRecord | undefined;
  await assert.doesNotReject(async () => {
    result = await runRepository.create(tx, ctx, run, at);
  });
  assert.ok(result !== undefined, "create returned a record");
  return result;
}

async function transitionOk(
  tx: TenantTx,
  ctx: TenantContext,
  runId: string,
  change: RunTransition,
): Promise<RunRecord | null> {
  let result: RunRecord | null | undefined;
  await assert.doesNotReject(async () => {
    result = await runRepository.transition(tx, ctx, runId, change);
  });
  assert.ok(result !== undefined, "transition returned a record or null");
  return result;
}

async function upsertOk(
  tx: TenantTx,
  ctx: TenantContext,
  step: StepWrite,
): Promise<StepRecord> {
  let result: StepRecord | undefined;
  await assert.doesNotReject(async () => {
    result = await stepRepository.upsert(tx, ctx, step);
  });
  assert.ok(result !== undefined, "upsert returned a step record");
  return result;
}

async function listOk(
  tx: TenantTx,
  ctx: TenantContext,
  runId: string,
  query: { limit: number; afterSeq?: number },
): Promise<{ steps: StepRecord[]; next: number | null }> {
  let result: { steps: StepRecord[]; next: number | null } | undefined;
  await assert.doesNotReject(async () => {
    result = await stepRepository.list(tx, ctx, runId, query);
  });
  assert.ok(result !== undefined, "list returned a step page");
  return result;
}

async function referencedByOk(
  tx: TenantTx,
  ctx: TenantContext,
  runId: string,
  sha256: string,
): Promise<boolean> {
  let result: boolean | undefined;
  await assert.doesNotReject(async () => {
    result = await envelopeStore.referencedBy(tx, ctx, runId, sha256);
  });
  assert.ok(result !== undefined, "referencedBy returned a boolean");
  return result;
}

async function stepRows(
  db: Awaited<ReturnType<typeof withTestDatabase>>,
  ctx: TenantContext,
  runId: string,
): Promise<Array<{ seq: number; runDay: string; startedAt: Date }>> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const { rows } = await tx.query<{ seq: number; run_day: string; started_at: Date }>(
      `SELECT seq, run_day::text AS run_day, started_at
         FROM ursitoare.step_execution
        WHERE run_id = $1
        ORDER BY seq`,
      [runId],
    );
    return rows.map((row) => ({
      seq: row.seq,
      runDay: row.run_day,
      startedAt: row.started_at,
    }));
  });
}

test("C-f48b0c8c step upsert records one row per attempt key", async () => {
  assert.equal(typeof stepRepository.upsert, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_1"), CREATED_AT));

    const started = await withTenantTx(db.appPool, a, (tx) =>
      upsertOk(
        tx,
        a,
        STEP("r_1", "classify", 0, {
          input: { vendor: "acme" },
          startedAt: new Date("2026-10-25T23:59:59.600Z"),
        }),
      ),
    );
    assert.deepEqual(started, {
      runId: "r_1",
      nodeId: "classify",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 0,
      kind: "block",
      state: "started",
      inputRef: payloadDigest({ vendor: "acme" }),
      outputRef: null,
      outcome: null,
      error: null,
      taint: [],
      policyDecisionId: null,
      idemKey: null,
      startedAt: "2026-10-25T23:59:59.600000Z",
      endedAt: null,
    });

    const idemKey = `ik1_${"b".repeat(64)}`;
    const completed = await withTenantTx(db.appPool, a, (tx) =>
      upsertOk(
        tx,
        a,
        STEP("r_1", "classify", 0, {
          state: "completed",
          output: { verdict: "approve" },
          outcome: "approve",
          taint: ["untrusted"],
          policyDecisionId: "pd_1",
          idemKey,
          seq: 7,
          startedAt: new Date("2026-10-26T00:00:05Z"),
          endedAt: new Date("2026-10-27T00:00:00Z"),
        }),
      ),
    );
    assert.deepEqual(completed, {
      runId: "r_1",
      nodeId: "classify",
      effectSeq: 0,
      turn: 0,
      attempt: 1,
      generation: 0,
      seq: 0,
      kind: "block",
      state: "completed",
      inputRef: payloadDigest({ vendor: "acme" }),
      outputRef: payloadDigest({ verdict: "approve" }),
      outcome: "approve",
      error: null,
      taint: ["untrusted"],
      policyDecisionId: "pd_1",
      idemKey,
      startedAt: "2026-10-25T23:59:59.600000Z",
      endedAt: "2026-10-27T00:00:00.000000Z",
    });

    const rows = await stepRows(db, a, "r_1");
    assert.equal(rows.length, 1, "the same key keeps one row");
    assert.equal(rows[0]?.seq, 0);
    assert.equal(rows[0]?.runDay, "2026-10-25");
    assert.equal(rows[0]?.startedAt.toISOString(), "2026-10-25T23:59:59.600Z");

    const secondAttempt = await withTenantTx(db.appPool, a, (tx) =>
      upsertOk(tx, a, STEP("r_1", "classify", 1, { attempt: 2 })),
    );
    assert.equal(secondAttempt.attempt, 2);
    assert.equal(secondAttempt.seq, 1);
    assert.equal((await stepRows(db, a, "r_1")).length, 2, "a new attempt is a second row");
  } finally {
    await db.close();
  }
});

test("C-f48b0c8c step upsert refuses invalid steps and duplicate seq", async () => {
  assert.equal(typeof stepRepository.upsert, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_1"), CREATED_AT));

    await withTenantTx(db.appPool, a, (tx) => upsertOk(tx, a, STEP("r_1", "classify", 0)));
    await withTenantTx(db.appPool, a, (tx) =>
      upsertOk(tx, a, STEP("r_1", "classify", 1, { attempt: 2 })),
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => stepRepository.upsert(tx, a, STEP("r_1", "route", 1))),
      { code: "RUN_DATA_INVALID" },
      "a step whose seq already exists is refused",
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        stepRepository.upsert(tx, a, STEP("r_missing", "classify", 0)),
      ),
      { code: "RUN_DATA_INVALID" },
      "a step of an unknown run is refused",
    );

    const invalid: StepWrite[] = [
      STEP("r_1", "Bad-Node", 5),
      STEP("r_1", "classify", 5, { attempt: 0 }),
      STEP("r_1", "classify", 5, { state: "done" as StepState }),
      STEP("r_1", "classify", 5, { taint: [""] }),
      STEP("r_1", "classify", 5, { outcome: "o\u0000" }),
      STEP("r_1", "classify", 5, { taint: ["t\u0000"] }),
      STEP("r_1", "classify", 5, { policyDecisionId: "p\u0000" }),
      STEP("r_1", "classify", 5, { idemKey: "i\u0000" }),
    ];
    for (const step of invalid) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) => stepRepository.upsert(tx, a, step)),
        { code: "RUN_DATA_INVALID" },
        `${step.nodeId} seq ${step.seq}`,
      );
    }

    assert.equal((await stepRows(db, a, "r_1")).length, 2, "refused steps leave two rows");
  } finally {
    await db.close();
  }
});

async function seedReferencedRun(
  db: Awaited<ReturnType<typeof withTestDatabase>>,
  a: TenantContext,
  input: PayloadValue,
  mocks: PayloadValue,
  output: PayloadValue,
): Promise<void> {
  await withTenantTx(db.appPool, a, async (tx) => {
    await createOk(tx, a, NEW_RUN("r_1", { input, mocks }), AT);
    await transitionOk(tx, a, "r_1", {
      state: "completed",
      from: ["queued"],
      at: new Date("2026-10-25T09:00:04.000Z"),
      output,
    });
  });
}

test("C-101276df steps page by seq with an exclusive cursor", async () => {
  assert.equal(typeof stepRepository.list, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    await withTenantTx(db.appPool, a, async (tx) => {
      await createOk(tx, a, NEW_RUN("r_1"), AT);
      await upsertOk(tx, a, STEP("r_1", "c", 2, { input: { stage: "classify" }, output: { routed: "finance" } }));
      await upsertOk(tx, a, STEP("r_1", "a", 0));
      await upsertOk(tx, a, STEP("r_1", "d", 3));
      await upsertOk(tx, a, STEP("r_1", "b", 1));
    });

    const page1 = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, "r_1", { limit: 2 }),
    );
    assert.deepEqual(
      page1.steps.map((step) => step.seq),
      [0, 1],
    );
    assert.equal(page1.next, 1);

    const page2 = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, "r_1", { limit: 2, afterSeq: 1 }),
    );
    assert.deepEqual(
      page2.steps.map((step) => step.seq),
      [2, 3],
    );
    assert.equal(page2.next, null);

    const empty = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, "r_1", { limit: 10, afterSeq: 3 }),
    );
    assert.deepEqual(empty, { steps: [], next: null });

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) => listOk(tx, a, "r_unknown", { limit: 10 })),
      { steps: [], next: null },
    );
    assert.equal(
      await withTenantTx(db.appPool, b, (tx) => listOk(tx, b, "r_1", { limit: 10 })),
      { steps: [], next: null },
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => stepRepository.list(tx, a, "r_1", { limit: 0 })),
      { code: "RUN_DATA_INVALID" },
      "a zero limit is refused",
    );
  } finally {
    await db.close();
  }
});

test("C-101276df referencedBy reports only the run own payloads", async () => {
  assert.equal(typeof envelopeStore.referencedBy, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const input: PayloadValue = { invoice: { id: "inv-1", total: 120 } };
    const mocks: PayloadValue = { lookup: { status: "ok" } };
    const output: PayloadValue = { verdict: "approve" };
    const stepInput: PayloadValue = { stage: "classify", vendor: "acme" };
    const stepOutput: PayloadValue = { routed: "finance" };
    const otherRunInput: PayloadValue = { secret: "r2-only" };
    await seedReferencedRun(db, a, input, mocks, output);

    await withTenantTx(db.appPool, a, async (tx) => {
      await upsertOk(
        tx,
        a,
        STEP("r_1", "c", 0, { input: stepInput, output: stepOutput }),
      );
      await createOk(tx, a, NEW_RUN("r_2", { input: { invoice: { id: "inv-2" } } }), AT);
      await upsertOk(tx, a, STEP("r_2", "classify", 0, { input: otherRunInput }));
    });

    for (const value of [input, mocks, output, stepInput, stepOutput]) {
      assert.equal(
        await withTenantTx(db.appPool, a, (tx) =>
          referencedByOk(tx, a, "r_1", payloadDigest(value)),
        ),
        true,
        "the run references its own payload",
      );
    }

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        referencedByOk(tx, a, "r_1", payloadDigest(otherRunInput)),
      ),
      false,
      "another run's payload is not referenced",
    );
    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        referencedByOk(tx, a, "r_1", payloadDigest({ never: "stored" })),
      ),
      false,
      "an unstored payload is not referenced",
    );
    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        referencedByOk(tx, a, "r_unknown", payloadDigest(input)),
      ),
      false,
      "an unknown run references nothing",
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => envelopeStore.referencedBy(tx, a, "r_1", "xyz")),
      { code: "RUN_DATA_INVALID" },
      "a malformed digest is refused",
    );
  } finally {
    await db.close();
  }
});
