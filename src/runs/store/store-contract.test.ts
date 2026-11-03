import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import {
  createMemoryRunStore,
  createRunStore,
  payloadDigest,
  RunDataError,
} from "../index.ts";
import type { NewRun, RunMode, RunStore, StepWrite } from "../index.ts";

const FLOW_HASH = `sha256:${"a".repeat(64)}`;
const AT = new Date("2026-10-25T09:00:00.000Z");
const T1 = new Date("2026-10-25T09:00:01.000Z");
const T2 = new Date("2026-10-25T09:00:02.000Z");
const T4 = new Date("2026-10-25T09:00:04.000Z");
const T5 = new Date("2026-10-25T09:00:05.000Z");
const ZERO_DIGEST = "0".repeat(64);
const INPUT = { invoice: { id: "inv-1", total: 120 } };
const OUTPUT = { verdict: "approve" };

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
    input: INPUT,
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

type Outcome =
  | { readonly name: string; readonly kind: "value"; readonly value: unknown }
  | { readonly name: string; readonly kind: "error"; readonly code: string };

async function record(
  outcomes: Outcome[],
  name: string,
  call: Promise<unknown>,
): Promise<void> {
  try {
    const value = await call;
    outcomes.push({ name, kind: "value", value });
  } catch (error) {
    if (error instanceof RunDataError) {
      outcomes.push({ name, kind: "error", code: error.code });
      return;
    }
    throw error;
  }
}

function byName(outcomes: readonly Outcome[], name: string): Outcome {
  const found = outcomes.find((outcome) => outcome.name === name);
  assert.ok(found !== undefined, `the sequence recorded ${name}`);
  return found;
}

function outcomeValue(outcomes: readonly Outcome[], name: string): unknown {
  const outcome = byName(outcomes, name);
  assert.equal(outcome.kind, "value", `${name} returned a value`);
  return outcome.kind === "value" ? outcome.value : undefined;
}

function outcomeCode(outcomes: readonly Outcome[], name: string): string {
  const outcome = byName(outcomes, name);
  assert.equal(outcome.kind, "error", `${name} failed`);
  return outcome.kind === "error" ? outcome.code : "";
}

async function runSequence(
  store: RunStore,
  a: TenantContext,
  b: TenantContext,
): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];
  const inputDigest = payloadDigest(INPUT);
  const outputDigest = payloadDigest(OUTPUT);

  await record(outcomes, "create r_1 as A", store.createRun(a, NEW_RUN("r_1"), AT));
  await record(
    outcomes,
    "create r_1 again as A",
    store.createRun(a, NEW_RUN("r_1", { input: { other: true } }), AT),
  );
  await record(
    outcomes,
    "create r_1 as B",
    store.createRun(b, NEW_RUN("r_1", { input: { who: "b" } }), AT),
  );
  await record(
    outcomes,
    "create dry",
    store.createRun(a, NEW_RUN("r_dry", { mode: "dry" as RunMode }), AT),
  );
  await record(
    outcomes,
    "create null user",
    store.createRun(
      a,
      NEW_RUN("r_null", { principal: { userId: "u\u0000x", kind: "human" } }),
      AT,
    ),
  );

  await record(outcomes, "get r_1 as A", store.getRun(a, "r_1"));
  await record(outcomes, "get r_1 as B", store.getRun(b, "r_1"));
  await record(outcomes, "get r_x as A", store.getRun(a, "r_x"));

  await record(
    outcomes,
    "running first",
    store.transition(a, "r_1", { state: "running", from: ["queued"], at: T1 }),
  );
  await record(
    outcomes,
    "running again",
    store.transition(a, "r_1", { state: "running", from: ["queued"], at: T2 }),
  );
  await record(
    outcomes,
    "completed",
    store.transition(a, "r_1", {
      state: "completed",
      from: ["running"],
      at: T4,
      output: OUTPUT,
    }),
  );
  await record(
    outcomes,
    "cancelled",
    store.transition(a, "r_1", { state: "cancelled", from: ["queued", "running"], at: T5 }),
  );

  await record(outcomes, "step classify", store.recordStep(a, STEP("r_1", "classify", 0)));
  await record(
    outcomes,
    "step classify again",
    store.recordStep(a, STEP("r_1", "classify", 0, { state: "completed", seq: 9 })),
  );
  await record(outcomes, "step route", store.recordStep(a, STEP("r_1", "route", 0)));
  await record(outcomes, "step of r_x", store.recordStep(a, STEP("r_x", "classify", 0)));

  await record(outcomes, "list steps first", store.listSteps(a, "r_1", { limit: 1 }));
  await record(
    outcomes,
    "list steps after",
    store.listSteps(a, "r_1", { limit: 1, afterSeq: 0 }),
  );

  await record(outcomes, "payload input", store.getPayload(a, inputDigest));
  await record(outcomes, "payload output", store.getPayload(a, outputDigest));
  await record(outcomes, "payload unstored", store.getPayload(a, ZERO_DIGEST));
  await record(outcomes, "payload as B", store.getPayload(b, inputDigest));
  await record(outcomes, "payload bad", store.getPayload(a, "xyz"));

  await record(outcomes, "final get", store.getRun(a, "r_1"));

  return outcomes;
}

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
function memoryStoreOk(): RunStore {
  let store: RunStore | undefined;
  assert.doesNotThrow(() => {
    store = createMemoryRunStore();
  });
  assert.ok(store !== undefined, "createMemoryRunStore returned a store");
  return store;
}

test("C-3f57e610 one operation sequence gives equal results in both stores", async () => {
  assert.equal(typeof createMemoryRunStore, "function");
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const database = createRunStore(db.appPool);

    const databaseResults = await runSequence(database, a, b);
    const memoryResults = await runSequence(memoryStoreOk(), a, b);

    assert.deepEqual(
      memoryResults,
      databaseResults,
      "the in-memory store answers the sequence as the database store does",
    );

    for (const name of ["create dry", "create null user", "step route"]) {
      assert.equal(outcomeCode(databaseResults, name), "RUN_DATA_INVALID", name);
      assert.equal(outcomeCode(memoryResults, name), "RUN_DATA_INVALID", name);
    }

    for (const name of ["running again", "cancelled"]) {
      assert.equal(outcomeValue(databaseResults, name), null, name);
      assert.equal(outcomeValue(memoryResults, name), null, name);
    }

    const databaseFinal = outcomeValue(databaseResults, "final get") as {
      state?: unknown;
    };
    const memoryFinal = outcomeValue(memoryResults, "final get") as {
      state?: unknown;
    };
    assert.equal(databaseFinal.state, "completed");
    assert.equal(memoryFinal.state, "completed");
  } finally {
    await db.close();
  }
});
