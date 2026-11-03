import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import {
  DurableError,
  currentWorkflowId,
  durableSleep,
  launchDurable,
  registerWorkflow,
  runStep,
} from "./index.ts";
import type {
  DurableJson,
  DurableRuntime,
  StepObserver,
  WorkflowInfo,
  WorkflowState,
} from "./index.ts";

const silent: LogDestination = {
  write(): void {
    // discarded
  },
};

const TERMINAL: readonly WorkflowState[] = [
  "SUCCESS",
  "ERROR",
  "CANCELLED",
  "MAX_RECOVERY_ATTEMPTS_EXCEEDED",
];

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function assertDurable(error: unknown, code: string, reason: string): true {
  assert.ok(error instanceof DurableError, `expected a DurableError, got ${String(error)}`);
  assert.equal(error.code, code);
  assert.equal(error.details.reason, reason);
  return true;
}

async function waitForState(
  rt: DurableRuntime,
  id: string,
  states: readonly WorkflowState[],
  timeoutMs = 20000,
): Promise<WorkflowInfo> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const info = await rt.status(id);
    if (info !== null && states.includes(info.state)) {
      return info;
    }
    if (Date.now() >= deadline) {
      assert.fail(`workflow ${id} did not reach ${states.join("/")}`);
    }
    await delay(20);
  }
}

async function waitFor(predicate: () => boolean, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!predicate()) {
    if (Date.now() >= deadline) {
      assert.fail("condition not reached");
    }
    await delay(20);
  }
}

const observed: [string, string, string][] = [];

const observer: StepObserver = (phase, step, workflowId) => {
  observed.push([phase, step, workflowId]);
};

let stepsSum = 0;
let stepsId = "";
let stepsSleepMs = -1;

async function stepsWorkflow(_input: DurableJson): Promise<DurableJson> {
  const a = await runStep("a", async () => 1);
  const b = await runStep("b", async () => 2);
  stepsId = currentWorkflowId();
  const started = Date.now();
  await durableSleep(1000);
  stepsSleepMs = Date.now() - started;
  stepsSum = a + b;
  return stepsSum;
}

let flakyRuns = 0;
let retryValue: DurableJson = null;

async function retryWorkflow(_input: DurableJson): Promise<DurableJson> {
  flakyRuns = 0;
  retryValue = await runStep(
    "flaky",
    async () => {
      flakyRuns += 1;
      if (flakyRuns < 3) {
        throw new Error("flaky");
      }
      return 7;
    },
    { retries: 2 },
  );
  return retryValue;
}

const e1 = new Error("once");
let alwaysRuns = 0;
let onceError: unknown;

async function onceWorkflow(_input: DurableJson): Promise<DurableJson> {
  alwaysRuns = 0;
  try {
    await runStep(
      "always",
      async () => {
        alwaysRuns += 1;
        throw e1;
      },
      { retries: 3, retryable: () => false },
    );
  } catch (error) {
    onceError = error;
  }
  return 0;
}

const namesSeen: string[] = [];

async function namesWorkflow(_input: DurableJson): Promise<DurableJson> {
  for (const name of ["run:load", "pay", "pay#done", "run:finish"]) {
    await runStep(name, async () => {
      namesSeen.push(name);
      return name;
    });
  }
  return 0;
}

let badBad: unknown;
let badRetry: unknown;
let badSleep: unknown;
let badEmpty: unknown;
let badControl: unknown;
let badLong: unknown;

async function badWorkflow(_input: DurableJson): Promise<DurableJson> {
  try {
    await runStep("bad", async () => undefined as never);
  } catch (error) {
    badBad = error;
  }
  try {
    await runStep("x", async () => 1, { retries: -1 });
  } catch (error) {
    badRetry = error;
  }
  try {
    await durableSleep(1.5);
  } catch (error) {
    badSleep = error;
  }
  try {
    await runStep("", async () => 1);
  } catch (error) {
    badEmpty = error;
  }
  try {
    await runStep("a\nb", async () => 1);
  } catch (error) {
    badControl = error;
  }
  try {
    await runStep("x".repeat(201), async () => 1);
  } catch (error) {
    badLong = error;
  }
  return 0;
}

let ownerPool: pg.Pool | undefined;
let dropStepError: unknown;
let dropSleepError: unknown;
let dropDone = false;

async function dropWorkflow(_input: DurableJson): Promise<DurableJson> {
  try {
    await runStep("drop", async () => {
      const pool = ownerPool;
      if (pool === undefined) {
        throw new Error("the owner pool is not set");
      }
      await pool.query("DROP SCHEMA dbos CASCADE");
      return 1;
    });
  } catch (error) {
    dropStepError = error;
  }
  try {
    await durableSleep(10);
  } catch (error) {
    dropSleepError = error;
  }
  dropDone = true;
  return 0;
}

test("C-706487fb steps are observed retried only on request and need a workflow", async () => {
  observed.length = 0;
  namesSeen.length = 0;
  stepsSum = 0;
  stepsId = "";
  stepsSleepMs = -1;
  dropStepError = undefined;
  dropSleepError = undefined;
  dropDone = false;

  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  ownerPool = db.ownerPool;
  let runtime: DurableRuntime | undefined;
  try {
    assert.doesNotThrow(() => {
      registerWorkflow("t.steps", stepsWorkflow);
      registerWorkflow("t.retry", retryWorkflow);
      registerWorkflow("t.once", onceWorkflow);
      registerWorkflow("t.names", namesWorkflow);
      registerWorkflow("t.bad", badWorkflow);
      registerWorkflow("t.drop", dropWorkflow);
    });

    const rt = await launchDurable({
      endpoint: db.appEndpoint,
      logger,
      pollingIntervalMs: 20,
      stepObserver: observer,
    });
    runtime = rt;

    // Outside a workflow every durable helper is refused before it reaches DBOS.
    await assert.rejects(runStep("outside", async () => 1), (error) =>
      assertDurable(error, "DURABLE_NOT_LAUNCHED", "outside_workflow"),
    );
    await assert.rejects(durableSleep(1), (error) =>
      assertDurable(error, "DURABLE_NOT_LAUNCHED", "outside_workflow"),
    );
    assert.throws(
      () => currentWorkflowId(),
      (error) => assertDurable(error, "DURABLE_NOT_LAUNCHED", "outside_workflow"),
    );

    await rt.enqueue("t.steps", "s-steps", null);
    const stepsInfo = await waitForState(rt, "s-steps", TERMINAL);
    assert.equal(stepsInfo.state, "SUCCESS", "the steps workflow succeeded");
    assert.equal(stepsSum, 3, "the steps returned their values");
    assert.equal(stepsId, "s-steps", "currentWorkflowId is the enqueue id");
    assert.ok(
      stepsSleepMs >= 900 && stepsSleepMs < 5000,
      `the durable sleep took 900 to under 5000 ms (got ${String(stepsSleepMs)})`,
    );
    assert.deepEqual(
      observed.filter((call) => call[2] === "s-steps"),
      [
        ["before", "a", "s-steps"],
        ["after", "a", "s-steps"],
        ["before", "b", "s-steps"],
        ["after", "b", "s-steps"],
      ],
      "the observer sees before and after around each step",
    );

    await rt.enqueue("t.retry", "s-retry", null);
    const retryInfo = await waitForState(rt, "s-retry", TERMINAL);
    assert.equal(retryInfo.state, "SUCCESS", "the retry workflow succeeded");
    assert.equal(flakyRuns, 3, "flaky ran three times");
    assert.equal(retryValue, 7, "the retried step returned 7");
    assert.deepEqual(
      observed.filter((call) => call[2] === "s-retry"),
      [
        ["before", "flaky", "s-retry"],
        ["after", "flaky", "s-retry"],
      ],
      "one step holds every attempt",
    );

    await rt.enqueue("t.once", "s-once", null);
    const onceInfo = await waitForState(rt, "s-once", TERMINAL);
    assert.equal(onceInfo.state, "SUCCESS", "the once workflow succeeded");
    assert.equal(alwaysRuns, 1, "a non-retryable failure is attempted once");
    assert.equal(onceError, e1, "the workflow caught its own error");

    await rt.enqueue("t.names", "s-names", null);
    const namesInfo = await waitForState(rt, "s-names", TERMINAL);
    assert.equal(namesInfo.state, "SUCCESS", "the names workflow succeeded");
    assert.deepEqual(namesSeen, ["run:load", "pay", "pay#done", "run:finish"]);

    await rt.enqueue("t.bad", "s-bad", null);
    const badInfo = await waitForState(rt, "s-bad", TERMINAL);
    assert.equal(badInfo.state, "SUCCESS", "the bad workflow caught its errors");
    assertDurable(badBad, "DURABLE_INVALID", "bad_step_result");
    assert.equal(
      observed.some((call) => call[0] === "after" && call[1] === "bad"),
      false,
      "a bad step result never reaches after",
    );
    assertDurable(badRetry, "DURABLE_INVALID", "bad_option");
    assertDurable(badSleep, "DURABLE_INVALID", "bad_option");
    assertDurable(badEmpty, "DURABLE_INVALID", "bad_step_name");
    assertDurable(badControl, "DURABLE_INVALID", "bad_step_name");
    assertDurable(badLong, "DURABLE_INVALID", "bad_step_name");

    await rt.enqueue("t.drop", "s-drop", null);
    await waitFor(() => dropDone);
    assertDurable(dropStepError, "DURABLE_UNAVAILABLE", "dbos_failed");
    assertDurable(dropSleepError, "DURABLE_UNAVAILABLE", "dbos_failed");

    await assert.rejects(rt.status("s-drop"), (error) =>
      assertDurable(error, "DURABLE_UNAVAILABLE", "dbos_failed"),
    );
    await assert.rejects(rt.cancel("s-drop"), (error) =>
      assertDurable(error, "DURABLE_UNAVAILABLE", "dbos_failed"),
    );
    await assert.rejects(rt.enqueue("t.steps", "s-after", null), (error) =>
      assertDurable(error, "DURABLE_UNAVAILABLE", "dbos_failed"),
    );
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    ownerPool = undefined;
    await db.close();
  }
});
