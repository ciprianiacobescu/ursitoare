import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../../tenancy/index.ts";
import { envelopeStore, payloadDigest, runRepository } from "../index.ts";
import type {
  NewRun,
  RunMode,
  RunRecord,
  RunState,
  RunTransition,
  StoredPayload,
} from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-10-25T08:00:00.000Z");
const T1 = new Date("2026-10-25T09:00:01.000Z");
const T2 = new Date("2026-10-25T09:00:02.000Z");
const T3 = new Date("2026-10-25T09:00:03.000Z");
const T4 = new Date("2026-10-25T09:00:04.000Z");
const T5 = new Date("2026-10-25T09:00:05.000Z");

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

async function getOk(
  tx: TenantTx,
  ctx: TenantContext,
  runId: string,
): Promise<RunRecord | null> {
  let result: RunRecord | null | undefined;
  await assert.doesNotReject(async () => {
    result = await runRepository.get(tx, ctx, runId);
  });
  assert.ok(result !== undefined, "get returned a record or null");
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

async function getPayloadOk(
  tx: TenantTx,
  ctx: TenantContext,
  sha256: string,
): Promise<StoredPayload | null> {
  let result: StoredPayload | null | undefined;
  await assert.doesNotReject(async () => {
    result = await envelopeStore.get(tx, ctx, sha256);
  });
  assert.ok(result !== undefined, "get returned a stored payload or null");
  return result;
}

async function countRows(
  pool: TenantPool,
  ctx: TenantContext,
  table: string,
): Promise<number> {
  return withTenantTx(pool, ctx, async (tx) => {
    const { rows } = await tx.query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
    return Number(rows[0]?.n);
  });
}

test("C-ad92c640 create stores a queued run once with content addressed payloads", async () => {
  assert.equal(typeof runRepository.create, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const first = await withTenantTx(db.appPool, a, (tx) =>
      createOk(
        tx,
        a,
        NEW_RUN("r_1", { mocks: { lookup: { status: "ok" } } }),
        new Date("2026-10-25T23:59:59.500Z"),
      ),
    );

    const input = { invoice: { id: "inv-1", total: 120 } };
    const inputDigest = payloadDigest(input);
    const mocksDigest = payloadDigest({ lookup: { status: "ok" } });
    assert.deepEqual(first, {
      runId: "r_1",
      lineageId: "r_1",
      parentRunId: null,
      flowId: "rf-1-core",
      flowHash: FLOW_HASH,
      ownerTeam: "finance",
      mode: "mock",
      trigger: "test",
      state: "queued",
      principal: { userId: "u_alice", kind: "human" },
      actorChain: ["u_alice"],
      inputRef: inputDigest,
      mocksRef: mocksDigest,
      outputRef: null,
      error: null,
      terminalNode: null,
      runDay: "2026-10-25",
      createdAt: "2026-10-25T23:59:59.500000Z",
      startedAt: null,
      endedAt: null,
    });

    const inputPayload = await withTenantTx(db.appPool, a, (tx) =>
      getPayloadOk(tx, a, inputDigest),
    );
    assert.ok(inputPayload !== null, "the input payload is stored");
    assert.deepEqual(inputPayload.data, input);

    const mocksPayload = await withTenantTx(db.appPool, a, (tx) =>
      getPayloadOk(tx, a, mocksDigest),
    );
    assert.ok(mocksPayload !== null, "the mocks payload is stored");
    assert.deepEqual(mocksPayload.data, { lookup: { status: "ok" } });

    const second = await withTenantTx(db.appPool, a, (tx) =>
      createOk(
        tx,
        a,
        NEW_RUN("r_1", { input: { other: true }, flowId: "rf-2" }),
        new Date("2026-10-26T08:00:00Z"),
      ),
    );
    assert.deepEqual(second, first);

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        getPayloadOk(tx, a, payloadDigest({ other: true })),
      ),
      null,
      "a losing create stores no new payload",
    );
  } finally {
    await db.close();
  }
});

test("C-ad92c640 concurrent create stores one run and returns the same record", async () => {
  assert.equal(typeof runRepository.create, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const [one, two] = await Promise.all([
      withTenantTx(db.appPool, a, (tx) =>
        createOk(tx, a, NEW_RUN("r_2", { input: { x: 1 } }), AT),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        createOk(tx, a, NEW_RUN("r_2", { input: { x: 2 } }), AT),
      ),
    ]);
    assert.deepEqual(one, two);

    const inputRef = one.inputRef;
    assert.ok(inputRef !== null, "the winning run has an input reference");
    assert.ok(
      [payloadDigest({ x: 1 }), payloadDigest({ x: 2 })].includes(inputRef),
      "the reference is one of the two inputs",
    );
    const payload = await withTenantTx(db.appPool, a, (tx) =>
      getPayloadOk(tx, a, inputRef),
    );
    assert.ok(payload !== null, "the winning input payload is stored");

    const runs = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ run_id: string }>(
        "SELECT run_id FROM ursitoare.run WHERE run_id = 'r_2'",
      );
      return rows.map((row) => row.run_id);
    });
    assert.deepEqual(runs, ["r_2"]);
    assert.equal(await countRows(db.appPool, a, "ursitoare.step_execution"), 0);
    assert.equal(await countRows(db.appPool, a, "ursitoare.event"), 0);
  } finally {
    await db.close();
  }
});

test("C-ad92c640 create refuses invalid runs and unknown tenants", async () => {
  assert.equal(typeof runRepository.create, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_1"), AT));
    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_2"), AT));

    const invalidRuns: NewRun[] = [
      NEW_RUN("bad id"),
      NEW_RUN("r_bad_mode", { mode: "dry" as RunMode }),
      NEW_RUN("r_long_chain", {
        actorChain: Array.from({ length: 33 }, (_, index) => `u${index}`),
      }),
      NEW_RUN("r_nan_input", { input: Number.NaN }),
      NEW_RUN("r_null_user", { principal: { userId: "u\u0000x", kind: "human" } }),
      NEW_RUN("r_null_chain", { actorChain: ["a\u0000"] }),
    ];
    for (const run of invalidRuns) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) => runRepository.create(tx, a, run, AT)),
        { code: "RUN_DATA_INVALID" },
        run.runId,
      );
    }

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        runRepository.create(tx, a, NEW_RUN("r_bad_at"), new Date("not a time")),
      ),
      { code: "RUN_DATA_INVALID" },
      "an invalid at is refused",
    );

    const tenantX: TenantContext = { tenantId: "tenant_x", reviewProfile: "solo" };
    await assert.rejects(
      withTenantTx(db.appPool, tenantX, (tx) =>
        runRepository.create(tx, tenantX, NEW_RUN("r_x"), AT),
      ),
      { code: "RUN_DATA_INVALID", message: "unknown_tenant" },
      "a tenant with no row is refused",
    );

    const runIds = await withTenantTx(db.appPool, a, async (tx) => {
      const { rows } = await tx.query<{ run_id: string }>(
        "SELECT run_id FROM ursitoare.run ORDER BY run_id",
      );
      return rows.map((row) => row.run_id);
    });
    assert.deepEqual(runIds, ["r_1", "r_2"]);
  } finally {
    await db.close();
  }
});

test("C-544dbbea transition applies only from the listed states", async () => {
  assert.equal(typeof runRepository.transition, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    const created = await withTenantTx(db.appPool, a, (tx) =>
      createOk(tx, a, NEW_RUN("r_1"), AT),
    );
    assert.equal(created.state, "queued");

    const running = await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_1", { state: "running", from: ["queued"], at: T1 }),
    );
    assert.ok(running !== null, "the queued run starts");
    assert.equal(running.state, "running");
    assert.equal(running.startedAt, "2026-10-25T09:00:01.000000Z");

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_1", { state: "running", from: ["queued"], at: T2 }),
      ),
      null,
      "a second start from queued does not apply",
    );
    const unchanged = await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, "r_1"));
    assert.deepEqual(unchanged, running);

    const runningAgain = await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_1", {
        state: "running",
        from: ["queued", "running"],
        at: T3,
      }),
    );
    assert.ok(runningAgain !== null, "running may transition to running");
    assert.equal(runningAgain.startedAt, "2026-10-25T09:00:01.000000Z");

    const output = { verdict: "approve" };
    const completed = await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_1", {
        state: "completed",
        from: ["running"],
        at: T4,
        output,
        terminalNode: "end_ok",
      }),
    );
    assert.ok(completed !== null, "the running run completes");
    assert.equal(completed.state, "completed");
    assert.equal(completed.endedAt, "2026-10-25T09:00:04.000000Z");
    assert.equal(completed.terminalNode, "end_ok");
    const outputDigest = payloadDigest(output);
    assert.equal(completed.outputRef, outputDigest);
    const outputPayload = await withTenantTx(db.appPool, a, (tx) =>
      getPayloadOk(tx, a, outputDigest),
    );
    assert.ok(outputPayload !== null, "the output payload is stored");
    assert.deepEqual(outputPayload.data, output);

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_1", {
          state: "cancelled",
          from: ["queued", "running"],
          at: T5,
          output: { late: true },
        }),
      ),
      null,
      "a completed run does not cancel",
    );
    const stillCompleted = await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, "r_1"));
    assert.deepEqual(stillCompleted, completed);
    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        getPayloadOk(tx, a, payloadDigest({ late: true })),
      ),
      null,
      "a refused transition stores no payload",
    );

    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_1", { state: "running", from: [], at: T5 }),
      ),
      null,
    );
    assert.equal(
      await withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_unknown", { state: "running", from: ["queued"], at: T5 }),
      ),
      null,
    );

    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_4"), AT));
    await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_4", { state: "running", from: ["queued"], at: T1 }),
    );
    const failure = {
      code: "FLOW_FAILED",
      message: "node classify failed",
      node: "classify",
    };
    const failed = await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_4", { state: "failed", from: ["running"], at: T4, error: failure }),
    );
    assert.ok(failed !== null, "the running run fails");
    assert.equal(failed.state, "failed");
    assert.deepEqual(failed.error, failure);
  } finally {
    await db.close();
  }
});

test("C-544dbbea a transition race leaves one state and invalid changes are refused", async () => {
  assert.equal(typeof runRepository.transition, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await withTenantTx(db.appPool, a, (tx) => createOk(tx, a, NEW_RUN("r_5"), AT));
    await withTenantTx(db.appPool, a, (tx) =>
      transitionOk(tx, a, "r_5", { state: "running", from: ["queued"], at: T1 }),
    );

    const [first, second] = await Promise.all([
      withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_5", { state: "completed", from: ["running"], at: T4 }),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        transitionOk(tx, a, "r_5", { state: "cancelled", from: ["running"], at: T5 }),
      ),
    ]);
    const winners = [first, second].filter((record): record is RunRecord => record !== null);
    assert.equal(winners.length, 1, "exactly one concurrent transition applies");
    const winner = winners[0];
    assert.ok(winner !== undefined);
    const stored = await withTenantTx(db.appPool, a, (tx) => getOk(tx, a, "r_5"));
    assert.ok(stored !== null, "the raced run is stored");
    assert.equal(stored.state, winner.state);

    const invalid: RunTransition[] = [
      { state: "done" as RunState, from: ["queued"], at: T1 },
      { state: "running", from: ["bogus" as RunState], at: T1 },
      { state: "running", from: ["queued"], at: T1, error: { code: "", message: "boom", node: null } },
      {
        state: "running",
        from: ["queued"],
        at: T1,
        error: { code: "BROKEN", message: "m\u0000", node: null },
      },
    ];
    for (const change of invalid) {
      await assert.rejects(
        withTenantTx(db.appPool, a, (tx) => runRepository.transition(tx, a, "r_5", change)),
        { code: "RUN_DATA_INVALID" },
      );
    }
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        runRepository.transition(tx, a, "r_5", {
          state: "running",
          from: ["completed", "cancelled"],
          at: new Date("not a time"),
        }),
      ),
      { code: "RUN_DATA_INVALID" },
      "an invalid at is refused",
    );
  } finally {
    await db.close();
  }
});
