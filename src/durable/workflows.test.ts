import assert from "node:assert/strict";
import { test } from "node:test";

import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import {
  DurableError,
  isDurableCancellation,
  launchDurable,
  registerWorkflow,
  runStep,
} from "./index.ts";
import type { DurableJson, DurableRuntime, WorkflowInfo, WorkflowState } from "./index.ts";

const silent: LogDestination = {
  write(): void {
    // discarded
  },
};

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

interface Deferred {
  promise: Promise<void>;
  resolve: () => void;
}

function deferred(): Deferred {
  let resolve: () => void = () => undefined;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

let counter = 0;
let gate = deferred();
let parkGate = deferred();
let parked = false;
let twoRan = false;
let parkError: unknown;

async function countWorkflow(_input: DurableJson): Promise<DurableJson> {
  counter += 1;
  return counter;
}

async function otherWorkflow(_input: DurableJson): Promise<DurableJson> {
  return 0;
}

async function gateWorkflow(_input: DurableJson): Promise<DurableJson> {
  await gate.promise;
  return 1;
}

async function parkWorkflow(_input: DurableJson): Promise<DurableJson> {
  await runStep("one", async () => 1);
  parked = true;
  await parkGate.promise;
  try {
    await runStep("two", async () => {
      twoRan = true;
      return 2;
    });
  } catch (error) {
    parkError = error;
    throw error;
  }
  return 0;
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

test("C-5d9b866b registerWorkflow checks names and refuses late registration", async () => {
  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  let launching: Promise<DurableRuntime> | undefined;
  try {
    assert.doesNotThrow(() => {
      assert.equal(registerWorkflow("t.count", countWorkflow), undefined);
      assert.equal(registerWorkflow("t.count", countWorkflow), undefined);
    });
    assert.throws(
      () => registerWorkflow("t.count", otherWorkflow),
      (error) => assertDurable(error, "DURABLE_INVALID", "name_taken"),
    );
    assert.throws(
      () => registerWorkflow("Bad Name", countWorkflow),
      (error) => assertDurable(error, "DURABLE_INVALID", "bad_name"),
    );
    assert.throws(
      () => registerWorkflow("a".repeat(65), countWorkflow),
      (error) => assertDurable(error, "DURABLE_INVALID", "bad_name"),
    );

    launching = launchDurable({ endpoint: db.appEndpoint, logger });
    assert.throws(
      () => registerWorkflow("t.late2", countWorkflow),
      (error) => assertDurable(error, "DURABLE_ALREADY_LAUNCHED", "running"),
    );
    const rt = await launching;
    assert.throws(
      () => registerWorkflow("t.late", countWorkflow),
      (error) => assertDurable(error, "DURABLE_ALREADY_LAUNCHED", "running"),
    );
    await assert.rejects(rt.enqueue("t.unknown", "w-u", null), (error) =>
      assertDurable(error, "DURABLE_WORKFLOW_UNKNOWN", "not_registered"),
    );
    const rows = await db.ownerPool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM dbos.workflow_status WHERE workflow_uuid = 'w-u'",
    );
    assert.equal(rows.rows[0]?.count, 0, "an unknown workflow leaves no row");
  } finally {
    const rt = await launching?.catch(() => undefined);
    await rt?.shutdown().catch(() => undefined);
    await db.close();
  }
});

function deepArray(depth: number): DurableJson {
  return JSON.parse("[".repeat(depth) + "]".repeat(depth)) as DurableJson;
}

test("C-e0745e1c a workflow id runs once and status and cancel report it", async () => {
  counter = 0;
  gate = deferred();
  parkGate = deferred();
  parked = false;
  twoRan = false;
  parkError = undefined;
  const db = await withTestDatabase();
  const logger = createLogger({ level: "silent", destination: silent });
  let runtime: DurableRuntime | undefined;
  try {
    assert.doesNotThrow(() => {
      registerWorkflow("t.count", countWorkflow);
      registerWorkflow("t.gate", gateWorkflow);
      registerWorkflow("t.park", parkWorkflow);
    });
    const rt = await launchDurable({ endpoint: db.appEndpoint, logger, concurrency: 1 });
    runtime = rt;

    // (1) the gate holds the only worker
    await assert.doesNotReject(async () => {
      await rt.enqueue("t.gate", "w-gate", null);
    });
    await waitForState(rt, "w-gate", ["PENDING"]);
    assert.deepEqual(await rt.status("w-gate"), {
      workflowId: "w-gate",
      workflow: "t.gate",
      state: "PENDING",
    });

    // (2) a queued workflow is cancelled
    await rt.enqueue("t.count", "w-1", 1);
    assert.equal((await rt.status("w-1"))?.state, "ENQUEUED");
    await rt.cancel("w-1");
    await rt.cancel("never");
    assert.equal(await rt.status("never"), null);
    assert.equal((await rt.status("w-1"))?.state, "CANCELLED");

    // (3) and (4) the gate opens; one id runs once
    gate.resolve();
    await rt.enqueue("t.count", "w-2", 2);
    await rt.enqueue("t.count", "w-2", 3);
    await waitForState(rt, "w-gate", ["SUCCESS"]);
    await waitForState(rt, "w-2", ["SUCCESS"]);
    assert.equal(counter, 1, "the counter workflow ran once");
    const row = await db.ownerPool.query<{ application_version: string; queue_name: string }>(
      "SELECT application_version, queue_name FROM dbos.workflow_status WHERE workflow_uuid = 'w-2'",
    );
    assert.deepEqual(row.rows, [{ application_version: "ursitoare-1", queue_name: "runs" }]);

    // (5) a running workflow stops at its next step
    await rt.enqueue("t.park", "w-park", null);
    await waitForState(rt, "w-park", ["PENDING"]);
    await waitFor(() => parked);
    await rt.cancel("w-park");
    assert.equal((await rt.status("w-park"))?.state, "CANCELLED");
    parkGate.resolve();
    await waitFor(() => parkError !== undefined);
    assert.equal((await rt.status("w-park"))?.state, "CANCELLED");
    assert.equal(twoRan, false, "step two never ran");
    assert.equal(isDurableCancellation(parkError), true);
    assert.equal(isDurableCancellation(new Error("x")), false);
    assert.equal(isDurableCancellation({ name: "DBOSWorkflowCancelledError" }), false);

    // (6) bad ids
    const badId = (error: unknown): true => assertDurable(error, "DURABLE_INVALID", "bad_workflow_id");
    await assert.rejects(rt.status("bad id!"), badId);
    await assert.rejects(rt.cancel("bad id!"), badId);
    await assert.rejects(rt.enqueue("t.count", "bad id!", null), badId);
    await assert.rejects(rt.enqueue("t.count", "x".repeat(201), null), badId);

    // (7) accepted and refused inputs
    const longId = "d-200".padEnd(200, "x");
    await rt.enqueue("t.count", longId, null);
    await rt.enqueue("t.count", "d-64", deepArray(64));
    const bare = Object.create(null) as Record<string, DurableJson>;
    bare["k"] = 1;
    await rt.enqueue("t.count", "d-null", bare);
    const cycle: Record<string, unknown> = {};
    cycle["self"] = cycle;
    const refused: unknown[] = [
      undefined,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      () => 1,
      new Date(0),
      cycle,
      deepArray(65),
    ];
    let index = 0;
    for (const input of refused) {
      index += 1;
      await assert.rejects(rt.enqueue("t.count", `r-${String(index)}`, input as DurableJson), (error) =>
        assertDurable(error, "DURABLE_INVALID", "bad_input"),
      );
    }

    // (8)
    for (const id of [longId, "d-64", "d-null"]) {
      await waitForState(rt, id, ["SUCCESS"]);
    }
  } finally {
    gate.resolve();
    parkGate.resolve();
    await runtime?.shutdown().catch(() => undefined);
    await db.close();
  }
});
