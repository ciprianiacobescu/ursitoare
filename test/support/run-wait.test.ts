import assert from "node:assert/strict";
import { test } from "node:test";

import { createMemoryRunStore } from "../../src/runs/index.ts";
import type { NewRun, RunRecord, TenantContext } from "../../src/runs/index.ts";
import { waitForRun } from "./run-wait.ts";

assert.equal(typeof waitForRun, "function");

const A: TenantContext = { tenantId: "tenant_a", reviewProfile: "solo" };
const AT = new Date("2026-11-02T10:00:00.000Z");
const AT2 = new Date("2026-11-02T10:00:01.000Z");
const AT3 = new Date("2026-11-02T10:00:02.000Z");

function newRun(runId: string): NewRun {
  return {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: "pay-once",
    flowHash: `sha256:${"a".repeat(64)}`,
    ownerTeam: "finance",
    mode: "mock",
    trigger: "test",
    principal: { userId: "u_alice", kind: "human" },
    actorChain: ["u_alice"],
    input: { vendor: "Acme", invoice: "inv-1", amount: 120 },
    mocks: null,
  };
}

test("C-b758e565 waitForRun rejects at the timeout naming the run and state", async () => {
  const store = createMemoryRunStore();
  await store.createRun(A, newRun("r_1"), AT);

  let error: unknown;
  try {
    await waitForRun(store, A, "r_1", ["completed"], 100);
  } catch (caught) {
    error = caught;
  }

  assert.ok(error instanceof Error, "waitForRun rejected with an error");
  assert.match(error.message, /r_1/);
  assert.match(error.message, /queued/);
});

test("C-b758e565 waitForRun resolves once the run reaches the listed state", async () => {
  const store = createMemoryRunStore();
  await store.createRun(A, newRun("r_2"), AT);
  await store.transition(A, "r_2", { state: "running", from: ["queued"], at: AT2 });

  let failure: unknown;
  const pending: Promise<RunRecord | undefined> = waitForRun(store, A, "r_2", [
    "completed",
  ]).catch((caught: unknown) => {
    failure = caught;
    return undefined;
  });

  await store.transition(A, "r_2", { state: "completed", from: ["running"], at: AT3 });
  const result = await pending;

  assert.equal(failure, undefined, `waitForRun failed: ${String(failure)}`);
  assert.ok(result !== undefined, "waitForRun returned the run");
  assert.equal(result.state, "completed");
});
