import assert from "node:assert/strict";
import { test } from "node:test";

import type pg from "pg";

import { createLogger } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import {
  DurableError,
  launchDurable,
  registerWorkflow,
  resumeDurable,
  suspendDurable,
} from "./index.ts";
import type { DurableJson, DurableRuntime, WorkflowInfo, WorkflowState } from "./index.ts";

const DURABLE_APPLICATION_NAME = "ursitoare-durable";

async function echoWorkflow(input: DurableJson): Promise<DurableJson> {
  return input;
}

const closePool = async (pool: pg.Pool): Promise<void> => {
  await pool.end();
  throw new Error("boom");
};

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

async function countSessions(db: TestDatabase): Promise<number> {
  const { rows } = await db.ownerPool.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM pg_stat_activity " +
      "WHERE datname = $1 AND application_name = $2",
    [db.name, DURABLE_APPLICATION_NAME],
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the session count was returned");
  return row.count;
}

async function waitForSessionCount(
  db: TestDatabase,
  predicate: (count: number) => boolean,
  timeoutMs = 5000,
): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let count = await countSessions(db);
  while (!predicate(count) && Date.now() < deadline) {
    await delay(20);
    count = await countSessions(db);
  }
  return count;
}

interface QueueRow {
  name: string;
  worker_concurrency: number;
  polling_interval_sec: number;
}

async function readQueues(db: TestDatabase): Promise<QueueRow[]> {
  const { rows } = await db.ownerPool.query<QueueRow>(
    "SELECT name, worker_concurrency, polling_interval_sec FROM dbos.queues ORDER BY name",
  );
  return rows;
}

async function countWorkflowRows(db: TestDatabase, workflowId: string): Promise<number> {
  const { rows } = await db.ownerPool.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM dbos.workflow_status WHERE workflow_uuid = $1",
    [workflowId],
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the workflow count was returned");
  return row.count;
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

function parseLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("C-cb0c606e launch suspend resume and shutdown keep the runs queue", async () => {
  const db = await withTestDatabase();
  const lines: string[] = [];
  const destination: LogDestination = {
    write(line: string): void {
      lines.push(line);
    },
  };
  const logger = createLogger({ level: "debug", destination });
  const handles: DurableRuntime[] = [];
  const suspended = (error: unknown): true =>
    assertDurable(error, "DURABLE_NOT_LAUNCHED", "suspended");
  const shutDown = (error: unknown): true =>
    assertDurable(error, "DURABLE_NOT_LAUNCHED", "shut_down");
  try {
    assert.doesNotThrow(() => {
      registerWorkflow("t.echo", echoWorkflow);
    });

    // (1) the launch registers the runs queue with the requested options
    const rt = await launchDurable({
      endpoint: db.appEndpoint,
      logger,
      pollingIntervalMs: 20,
      concurrency: 3,
      closePool,
    });
    handles.push(rt);
    const [firstRow] = await readQueues(db);
    assert.ok(firstRow !== undefined, "the runs queue row exists");
    assert.equal(firstRow.name, "runs");
    assert.equal(firstRow.worker_concurrency, 3);
    assert.ok(Math.abs(Number(firstRow.polling_interval_sec) - 0.02) <= 1e-9);

    // (2) suspension resolves the same handle
    assert.equal(await suspendDurable(), rt, "suspendDurable resolves the launched handle");

    // (3) every call is refused while suspended
    await assert.rejects(rt.enqueue("t.echo", "x", "hi"), suspended);
    await assert.rejects(rt.cancel("x"), suspended);
    await assert.rejects(rt.status("x"), suspended);

    // (4) a resume DBOS cannot complete rethrows and leaves the runtime suspended
    const ledger = await db.ownerPool.query<{ version: string }>(
      "SELECT version::text AS version FROM dbos.dbos_migrations ORDER BY version",
    );
    const versions = ledger.rows.map((row) => row.version);
    await db.ownerPool.query("DELETE FROM dbos.dbos_migrations");
    try {
      await assert.rejects(resumeDurable(), (error) =>
        assertDurable(error, "DURABLE_UNAVAILABLE", "launch_failed"),
      );
      await assert.rejects(rt.status("x"), suspended);
    } finally {
      await db.ownerPool.query(
        "INSERT INTO dbos.dbos_migrations (version) SELECT unnest($1::bigint[])",
        [versions],
      );
    }

    // (4b) the reset loses the queue and application rows
    await db.ownerPool.query("DELETE FROM dbos.queues");
    await db.ownerPool.query("DELETE FROM dbos.application_versions");

    // (5) the queue is registered again by the resume
    assert.equal(await resumeDurable(), rt, "the first resume resolves the same handle");
    assert.equal(await resumeDurable(), null, "a second resume has nothing to resume");
    const [backRow] = await readQueues(db);
    assert.ok(backRow !== undefined, "the runs queue row is back after the reset");
    assert.equal(backRow.name, "runs");

    // (6) workflows run again after the reset
    await rt.enqueue("t.echo", "after-reset", "hi");
    await waitForState(rt, "after-reset", ["SUCCESS"]);

    // (7) concurrent shutdowns resolve and every later call is refused
    await assert.doesNotReject(async () => {
      await Promise.all([rt.shutdown(), rt.shutdown()]);
    });
    await assert.rejects(rt.enqueue("t.echo", "x", "hi"), shutDown);
    await assert.rejects(rt.cancel("x"), shutDown);
    await assert.rejects(rt.status("x"), shutDown);
    const warnings = parseLines(lines).filter(
      (line) => line["msg"] === "durable shutdown failed",
    );
    assert.equal(warnings.length, 2, "each failed close is logged once");
    assert.equal(
      lines.some((line) => line.includes("boom")),
      false,
      "the close error text is never logged",
    );

    // (8) a later launch re-registers the queue with the defaults
    const rt2 = await launchDurable({ endpoint: db.appEndpoint, logger });
    handles.push(rt2);
    const [secondRow] = await readQueues(db);
    assert.ok(secondRow !== undefined, "the relaunched queue row exists");
    assert.equal(secondRow.name, "runs");
    assert.equal(secondRow.worker_concurrency, 4);
    assert.ok(Math.abs(Number(secondRow.polling_interval_sec) - 0.05) <= 1e-9);
    assert.equal(await resumeDurable(), null, "a running runtime is not resumed");

    // (9) calls issued in a row wait for the lifecycle calls ahead of them
    const suspendedCall = suspendDurable();
    const enqueued = rt2.enqueue("t.echo", "y", "hi");
    const resumedCall = resumeDurable();
    const shutDownCall = rt2.shutdown();
    await assert.rejects(enqueued, suspended);
    assert.equal(await suspendedCall, rt2, "the suspend resolves the handle");
    assert.equal(await resumedCall, rt2, "the resume resolves the handle");
    assert.equal(await shutDownCall, undefined, "the shutdown resolves");
    assert.equal(await countWorkflowRows(db, "y"), 0, "the refused enqueue leaves no row");
    await assert.rejects(rt2.status("x"), shutDown);

    // (10) the shutdown waits for an in-flight enqueue
    const rt3 = await launchDurable({ endpoint: db.appEndpoint, logger });
    handles.push(rt3);
    const draining = rt3.enqueue("t.echo", "d-drain", "hi");
    await rt3.shutdown();
    await assert.doesNotReject(async () => {
      assert.equal(await draining, undefined);
    });
    assert.equal(await countWorkflowRows(db, "d-drain"), 1, "the in-flight enqueue left its row");
    assert.equal(
      await waitForSessionCount(db, (count) => count === 0),
      0,
      "no ursitoare-durable session is left",
    );
  } finally {
    await Promise.all(handles.map((handle) => handle.shutdown().catch(() => undefined)));
    await db.close();
  }
});
