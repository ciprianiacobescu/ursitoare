import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { createPool } from "../../../src/db/index.ts";
import type { DurableJson, DurableRuntime, WorkflowInfo, WorkflowState } from "../../../src/durable/index.ts";

import { E2E_TEMPLATE, databaseApi, databasePart } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { checkDurableReady, durablePart } from "./durable-part.ts";
import type { PartContext, PartHandle } from "./part.ts";

assert.equal(typeof checkDurableReady, "function");

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The parts may already have removed their own directories.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-durable-part-"));
  tempRoots.push(dir);
  return dir;
}

async function must<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function rejectionOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to reject");
}

function codeOf(error: unknown): unknown {
  return (error as { code?: unknown } | null)?.code;
}

function detailsOf(error: unknown): Record<string, unknown> {
  const details = (error as { details?: unknown } | null)?.details;
  return typeof details === "object" && details !== null ? (details as Record<string, unknown>) : {};
}

function contextFor(
  name: string,
  dataDir: string,
  handles: ReadonlyMap<string, PartHandle>,
): PartContext {
  return {
    name,
    dataDir,
    engineOrigin: "http://127.0.0.1:39080",
    controlOrigin: "http://127.0.0.1:39081",
    env: {},
    handles,
  };
}

interface Enqueued {
  workflow: string;
  workflowId: string;
  input: DurableJson;
}

interface FakeRuntime {
  runtime: DurableRuntime;
  enqueues: Enqueued[];
  statusCount(): number;
}

function fakeRuntime(
  handlers: {
    status?: (call: number, workflowId: string) => Promise<WorkflowInfo | null>;
    enqueue?: (workflow: string, workflowId: string, input: DurableJson) => Promise<void>;
  } = {},
): FakeRuntime {
  const enqueues: Enqueued[] = [];
  let statusCalls = 0;
  const runtime: DurableRuntime = {
    applicationVersion: "ursitoare-1",
    async enqueue(workflow, workflowId, input): Promise<void> {
      enqueues.push({ workflow, workflowId, input });
      if (handlers.enqueue !== undefined) {
        await handlers.enqueue(workflow, workflowId, input);
      }
    },
    async status(workflowId): Promise<WorkflowInfo | null> {
      statusCalls += 1;
      if (handlers.status !== undefined) {
        return handlers.status(statusCalls, workflowId);
      }
      return { workflowId, workflow: "stack.ready", state: "SUCCESS" };
    },
    cancel: async () => undefined,
    shutdown: async () => undefined,
  };
  return { runtime, enqueues, statusCount: () => statusCalls };
}

function sequenceState(
  workflowId: string,
  states: readonly WorkflowState[],
): (call: number) => Promise<WorkflowInfo> {
  return async (call: number): Promise<WorkflowInfo> => ({
    workflowId,
    workflow: "stack.ready",
    state: states[Math.min(call - 1, states.length - 1)] ?? "ENQUEUED",
  });
}

function alwaysState(
  workflowId: string,
  state: WorkflowState,
): () => Promise<WorkflowInfo> {
  return async (): Promise<WorkflowInfo> => ({
    workflowId,
    workflow: "stack.ready",
    state,
  });
}

interface FakeClock {
  now(): number;
  sleep(ms: number): Promise<void>;
  readonly sleeps: number[];
}

function fakeClock(): FakeClock {
  let current = 0;
  const sleeps: number[] = [];
  return {
    now: () => current,
    sleep: async (ms: number): Promise<void> => {
      sleeps.push(ms);
      current += ms;
    },
    sleeps,
  };
}

function repeated(value: number, count: number): number[] {
  return Array.from({ length: count }, () => value);
}

test("C-769418cc checkDurableReady enqueues the ready workflow and resolves once it succeeds", async () => {
  const clock = fakeClock();
  const fake = fakeRuntime({ status: sequenceState("ready-1", ["ENQUEUED", "ENQUEUED", "SUCCESS"]) });

  await assert.doesNotReject(() =>
    checkDurableReady(fake.runtime, {
      workflowId: "ready-1",
      pollMs: 100,
      now: clock.now,
      sleep: clock.sleep,
    }),
  );

  assert.deepEqual(fake.enqueues, [
    { workflow: "stack.ready", workflowId: "ready-1", input: "ping" },
  ]);
  assert.equal(fake.statusCount(), 3);
  assert.deepEqual(clock.sleeps, repeated(100, 2));
});

test("C-769418cc checkDurableReady rejects STACK_DURABLE_NOT_READY with the state when the deadline passes", async () => {
  const clock = fakeClock();
  const fake = fakeRuntime({ status: alwaysState("ready-1", "ENQUEUED") });

  const error = await rejectionOf(() =>
    checkDurableReady(fake.runtime, {
      workflowId: "ready-1",
      timeoutMs: 5000,
      pollMs: 100,
      now: clock.now,
      sleep: clock.sleep,
    }),
  );

  assert.equal(codeOf(error), "STACK_DURABLE_NOT_READY");
  assert.equal(detailsOf(error).state, "ENQUEUED");
  assert.equal(fake.statusCount(), 51);
  assert.deepEqual(clock.sleeps, repeated(100, 50));
});

test("C-769418cc checkDurableReady defaults to a 5000 ms timeout and a 20 ms poll", async () => {
  const clock = fakeClock();
  const fake = fakeRuntime({ status: alwaysState("ready-1", "ENQUEUED") });

  const error = await rejectionOf(() =>
    checkDurableReady(fake.runtime, {
      workflowId: "ready-1",
      now: clock.now,
      sleep: clock.sleep,
    }),
  );

  assert.equal(codeOf(error), "STACK_DURABLE_NOT_READY");
  assert.equal(detailsOf(error).state, "ENQUEUED");
  assert.equal(fake.statusCount(), 251);
  assert.deepEqual(clock.sleeps, repeated(20, 250));
});

test("C-769418cc checkDurableReady rejects at once with a failed workflow state", async () => {
  const clock = fakeClock();
  const fake = fakeRuntime({ status: alwaysState("ready-1", "ERROR") });

  const error = await rejectionOf(() =>
    checkDurableReady(fake.runtime, {
      workflowId: "ready-1",
      pollMs: 100,
      now: clock.now,
      sleep: clock.sleep,
    }),
  );

  assert.equal(codeOf(error), "STACK_DURABLE_NOT_READY");
  assert.equal(detailsOf(error).state, "ERROR");
  assert.equal(fake.statusCount(), 1);
  assert.deepEqual(clock.sleeps, []);
});

test("C-769418cc checkDurableReady lets an enqueue rejection propagate unchanged", async () => {
  const clock = fakeClock();
  const err = new Error("enqueue failed");
  const fake = fakeRuntime({ enqueue: async () => Promise.reject(err) });

  const error = await rejectionOf(() =>
    checkDurableReady(fake.runtime, {
      workflowId: "ready-1",
      now: clock.now,
      sleep: clock.sleep,
    }),
  );

  assert.equal(error, err);
  assert.equal(fake.statusCount(), 0);
  assert.deepEqual(clock.sleeps, []);
});

test("C-769418cc checkDurableReady lets status, sleep and clock failures propagate unchanged", async () => {
  const err2 = new Error("status failed");
  const fake2 = fakeRuntime({
    status: async (call) => {
      if (call === 1) {
        return { workflowId: "ready-1", workflow: "stack.ready", state: "ENQUEUED" };
      }
      throw err2;
    },
  });
  const clock2 = fakeClock();
  const error2 = await rejectionOf(() =>
    checkDurableReady(fake2.runtime, {
      workflowId: "ready-1",
      pollMs: 100,
      now: clock2.now,
      sleep: clock2.sleep,
    }),
  );
  assert.equal(error2, err2);
  assert.equal(fake2.statusCount(), 2);
  assert.deepEqual(clock2.sleeps, repeated(100, 1));

  const err3 = new Error("sleep failed");
  const fake3 = fakeRuntime({ status: alwaysState("ready-1", "ENQUEUED") });
  const clock3 = fakeClock();
  const error3 = await rejectionOf(() =>
    checkDurableReady(fake3.runtime, {
      workflowId: "ready-1",
      pollMs: 100,
      now: clock3.now,
      sleep: async () => Promise.reject(err3),
    }),
  );
  assert.equal(error3, err3);

  const err4 = new Error("clock failed");
  const fake4 = fakeRuntime({ status: alwaysState("ready-1", "ENQUEUED") });
  let clockCalls = 0;
  const error4 = await rejectionOf(() =>
    checkDurableReady(fake4.runtime, {
      workflowId: "ready-1",
      pollMs: 100,
      now: () => {
        clockCalls += 1;
        if (clockCalls === 1) {
          throw err4;
        }
        return 0;
      },
      sleep: async () => undefined,
    }),
  );
  assert.equal(error4, err4);
});

test("C-769418cc checkDurableReady refuses the five bad options before enqueueing", async () => {
  const bad: ReadonlyArray<{ timeoutMs?: number; pollMs?: number }> = [
    { timeoutMs: 0 },
    { timeoutMs: 60001 },
    { timeoutMs: 1.5 },
    { pollMs: 0 },
    { pollMs: 11, timeoutMs: 10 },
  ];

  for (const options of bad) {
    const fake = fakeRuntime();
    const error = await rejectionOf(() =>
      checkDurableReady(fake.runtime, { workflowId: "ready-1", ...options }),
    );
    assert.equal(codeOf(error), "STACK_DURABLE_NOT_READY");
    assert.equal(detailsOf(error).reason, "bad_option");
    assert.deepEqual(fake.enqueues, [], "a bad option is refused before any enqueue");
  }
});

test("C-769418cc the durable part prepares the template and does nothing without a runtime", async () => {
  const root = tempRoot();
  const databaseDir = path.join(root, "database");
  const durableDir = path.join(root, "durable");
  mkdirSync(databaseDir, { recursive: true });
  mkdirSync(durableDir, { recursive: true });

  const handles = new Map<string, PartHandle>();
  let databaseHandle: PartHandle | undefined;
  let durableHandle: PartHandle | undefined;
  let templatePool: ReturnType<typeof createPool> | undefined;
  let e2ePool: ReturnType<typeof createPool> | undefined;

  try {
    databaseHandle = await must(() =>
      databasePart.start(contextFor("database", databaseDir, handles)),
    );
    handles.set("database", databaseHandle);

    assert.equal(durablePart.name, "durable");
    durableHandle = await must(() =>
      durablePart.start(contextFor("durable", durableDir, handles)),
    );
    handles.set("durable", durableHandle);
    assert.deepEqual(durableHandle.env, {}, "the durable handle exports no environment");

    const api = databaseApi(handles);
    const templateUrl = new URL(api.ownerUrl);
    templateUrl.pathname = `/${E2E_TEMPLATE}`;
    templatePool = createPool(templateUrl.toString(), {
      max: 1,
      applicationName: "e2e-durable-part",
    });
    const migrations = await templatePool.query<{ present: string | null }>(
      `SELECT to_regclass('"dbos"."dbos_migrations"') AS present`,
    );
    assert.notEqual(
      migrations.rows[0]?.present,
      null,
      "the durable part prepares the e2e template",
    );
    const sessions = await templatePool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = 'ursitoare-durable'",
    );
    assert.equal(sessions.rows[0]?.count, 0, "preparing the template leaves no durable session");

    await templatePool.end();
    templatePool = undefined;

    await must(() =>
      databasePart.seed?.(contextFor("database", databaseDir, handles)) ?? Promise.resolve(),
    );

    const durableContext = contextFor("durable", durableDir, handles);
    await assert.doesNotReject(
      () => durablePart.beforeReset?.(durableContext) ?? Promise.resolve(),
    );
    await assert.doesNotReject(() => durablePart.seed?.(durableContext) ?? Promise.resolve());
    await assert.doesNotReject(() => durableHandle?.close() ?? Promise.resolve());

    e2ePool = createPool(api.ownerUrl, { max: 1, applicationName: "e2e-durable-part" });
    const ready = await e2ePool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM dbos.workflow_status WHERE name = 'stack.ready'",
    );
    assert.equal(ready.rows[0]?.count, 0, "the e2e database holds no stack.ready row");
  } finally {
    await e2ePool?.end().catch(() => undefined);
    await templatePool?.end().catch(() => undefined);
    await durableHandle?.close().catch(() => undefined);
    await databaseHandle?.close().catch(() => undefined);
  }
});

test("C-769418cc discovery lists the durable part after the catalogue", async () => {
  const partFile = path.join(PARTS_DIR, "40-durable.ts");
  assert.ok(existsSync(partFile), "the shipped durable part file exists");
  assert.equal(
    readFileSync(partFile, "utf8").trim(),
    'export { durablePart as part } from "../durable-part.ts";',
  );

  const names = (await discoverParts()).map((part) => part.name);
  assert.ok(names.includes("durable"), "the durable part is discovered");
  assert.ok(
    names.indexOf("catalogue") < names.indexOf("durable"),
    "the durable part starts after the catalogue",
  );
});
