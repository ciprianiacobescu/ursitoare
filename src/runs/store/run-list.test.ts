import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { RUN_LIST_FILTER_FIRST, runRepository } from "../index.ts";
import type {
  NewRun,
  RunCursor,
  RunListQuery,
  RunRecord,
  RunTransition,
} from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;

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

async function listOk(
  tx: TenantTx,
  ctx: TenantContext,
  query: RunListQuery,
): Promise<{ runs: RunRecord[]; next: RunCursor | null }> {
  let result: { runs: RunRecord[]; next: RunCursor | null } | undefined;
  await assert.doesNotReject(async () => {
    result = await runRepository.list(tx, ctx, query);
  });
  assert.ok(result !== undefined, "list returned a page");
  return result;
}

function ids(runs: readonly RunRecord[]): string[] {
  return runs.map((run) => run.runId);
}

async function seedRuns(
  db: Awaited<ReturnType<typeof withTestDatabase>>,
  a: TenantContext,
  b: TenantContext,
): Promise<void> {
  await withTenantTx(db.appPool, a, async (tx) => {
    await createOk(tx, a, NEW_RUN("r_a"), new Date("2026-10-25T09:00:00.000Z"));
    await createOk(
      tx,
      a,
      NEW_RUN("r_b", {
        principal: { userId: "u_bob", kind: "human" },
        input: { invoice: { id: "inv-b" } },
      }),
      new Date("2026-10-25T09:00:01.000Z"),
    );
    await createOk(
      tx,
      a,
      NEW_RUN("r_c", {
        flowId: "rf-2",
        ownerTeam: "ops",
        principal: { userId: "u_dave", kind: "human" },
        input: { invoice: { id: "inv-c" } },
      }),
      new Date("2026-10-25T09:00:01.000Z"),
    );
    await createOk(
      tx,
      a,
      NEW_RUN("r_d", { input: { invoice: { id: "inv-d" } } }),
      new Date("2026-10-25T09:00:02.000Z"),
    );
  });

  await withTenantTx(db.appPool, a, async (tx) => {
    await transitionOk(tx, a, "r_a", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-10-25T09:00:00.100Z"),
    });
    await transitionOk(tx, a, "r_a", {
      state: "completed",
      from: ["running"],
      at: new Date("2026-10-25T09:00:00.200Z"),
    });
    await transitionOk(tx, a, "r_b", {
      state: "running",
      from: ["queued"],
      at: new Date("2026-10-25T09:00:01.100Z"),
    });
  });

  await withTenantTx(db.appPool, b, async (tx) => {
    await createOk(
      tx,
      b,
      NEW_RUN("r_e", { input: { invoice: { id: "inv-e" } } }),
      new Date("2026-10-25T09:00:03.000Z"),
    );
  });
}

test("C-3e38f9ae list pages newest first and applies the filter", async () => {
  assert.equal(typeof runRepository.list, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await seedRuns(db, a, b);

    assert.equal(RUN_LIST_FILTER_FIRST, 7);

    const page1 = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, { limit: 2, filter: { sql: "true", values: [] } }),
    );
    assert.deepEqual(ids(page1.runs), ["r_d", "r_c"]);
    assert.deepEqual(page1.next, {
      createdAt: "2026-10-25T09:00:01.000000Z",
      runId: "r_c",
    });
    const cursor = page1.next;
    assert.ok(cursor !== null, "page one has a cursor");

    const page2 = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, {
        limit: 2,
        after: cursor,
        filter: { sql: "true", values: [] },
      }),
    );
    assert.deepEqual(ids(page2.runs), ["r_b", "r_a"]);
    assert.equal(page2.next, null);

    const all = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, { limit: 10, filter: { sql: "true", values: [] } }),
    );
    assert.deepEqual(ids(all.runs), ["r_d", "r_c", "r_b", "r_a"]);
    assert.ok(!ids(all.runs).includes("r_e"), "tenant B's run is not listed");

    const byFlow = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, {
        limit: 10,
        flowId: "rf-1-core",
        filter: { sql: "true", values: [] },
      }),
    );
    assert.deepEqual(ids(byFlow.runs), ["r_d", "r_b", "r_a"]);

    const byState = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, {
        limit: 10,
        state: "queued",
        filter: { sql: "true", values: [] },
      }),
    );
    assert.deepEqual(ids(byState.runs), ["r_d", "r_c"]);
    assert.equal(byState.next, null);

    const byFilter = await withTenantTx(db.appPool, a, (tx) =>
      listOk(tx, a, {
        limit: 10,
        filter: {
          sql: "owner_team = ANY($7) OR principal_user_id = $8",
          values: [["ops"], "u_alice"],
        },
      }),
    );
    assert.deepEqual(ids(byFilter.runs), ["r_d", "r_c", "r_a"]);
  } finally {
    await db.close();
  }
});

test("C-3e38f9ae list refuses invalid queries", async () => {
  assert.equal(typeof runRepository.list, "function");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        runRepository.list(tx, a, { limit: 0, filter: { sql: "true", values: [] } }),
      ),
      { code: "RUN_DATA_INVALID" },
      "a zero limit is refused",
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        runRepository.list(tx, a, {
          limit: 10,
          after: { createdAt: "not a time", runId: "r_a" },
          filter: { sql: "true", values: [] },
        }),
      ),
      { code: "RUN_DATA_INVALID" },
      "an invalid cursor time is refused",
    );

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        runRepository.list(tx, a, {
          limit: 10,
          flowId: "Bad Id",
          filter: { sql: "true", values: [] },
        }),
      ),
      { code: "RUN_DATA_INVALID" },
      "an invalid flow id is refused",
    );
  } finally {
    await db.close();
  }
});
