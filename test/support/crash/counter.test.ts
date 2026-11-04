import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { createPool } from "../../../src/db/index.ts";
import { withDedicatedCluster } from "./cluster.ts";
import { faultMarkerDir, spawnEngine, type EngineProcess } from "./engine.ts";

assert.equal(typeof spawnEngine, "function");
assert.equal(typeof withDedicatedCluster, "function");

const SCENARIO = join(import.meta.dirname, "counter-scenario.ts");
const DEADLINE_MS = 20_000;
const POLL_MS = 25;

interface StatusRow {
  status: string;
  application_version: string;
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function sha256hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function logLines(dataDir: string, name: string): string[] {
  const file = join(dataDir, name);
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0);
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + DEADLINE_MS;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await delay(POLL_MS);
  }
  assert.equal(predicate(), true, message);
}

function spawnOrFail(opts: Parameters<typeof spawnEngine>[0]): Promise<EngineProcess> {
  return spawnEngine(opts).then(
    (engine) => engine,
    (error: unknown) => assert.fail(`the counter engine starts: ${String(error)}`),
  );
}

async function readStatus(ownerUrl: string, workflowId: string): Promise<StatusRow | undefined> {
  const pool = createPool(ownerUrl, { max: 1 });
  try {
    const result = await pool.query<StatusRow>(
      "SELECT status, application_version FROM dbos.workflow_status WHERE workflow_uuid = $1",
      [workflowId],
    );
    return result.rows[0];
  } finally {
    await pool.end();
  }
}

async function countRows(ownerUrl: string, workflowId: string): Promise<number> {
  const pool = createPool(ownerUrl, { max: 1 });
  try {
    const result = await pool.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM dbos.workflow_status WHERE workflow_uuid = $1",
      [workflowId],
    );
    return result.rows[0]?.count ?? 0;
  } finally {
    await pool.end();
  }
}

async function waitForSuccess(ownerUrl: string, workflowId: string): Promise<StatusRow> {
  const deadline = Date.now() + DEADLINE_MS;
  for (;;) {
    const row = await readStatus(ownerUrl, workflowId);
    if (row !== undefined && row.status === "SUCCESS") {
      return row;
    }
    if (Date.now() >= deadline) {
      assert.fail(`workflow ${workflowId} reached SUCCESS (last ${row?.status ?? "missing"})`);
    }
    await delay(POLL_MS);
  }
}

test("C-ffd3df2c: a fault kills the counter child once and the workflow completes after restart", async () => {
  let lastPid: number | undefined;
  let markerNames: string[] = [];

  await withDedicatedCluster(async (cluster) => {
    const after = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      faultPoints: ["after:two"],
      args: { workflowId: "w-after", log: "after.log" },
    });
    await waitFor(() => after.deaths === 1, "the after:two child dies exactly once");
    assert.deepEqual(
      logLines(cluster.dataDir, "after.log"),
      ["one", "two"],
      "after:two dies after two ran once",
    );
    await after.restart();
    assert.equal(after.deaths, 1, "the restart is not a second death");
    await waitForSuccess(cluster.ownerUrl, "w-after");
    assert.equal(after.deaths, 1, "the workflow does not die again after the restart");
    await after.stop();

    const before = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      faultPoints: ["before:two"],
      args: { workflowId: "w-before", log: "before.log" },
    });
    await waitFor(() => before.deaths === 1, "the before:two child dies exactly once");
    assert.deepEqual(
      logLines(cluster.dataDir, "before.log"),
      ["one"],
      "before:two dies before two ran",
    );
    await before.restart();
    assert.equal(before.deaths, 1, "the restart is not a second death");
    await waitForSuccess(cluster.ownerUrl, "w-before");
    assert.equal(before.deaths, 1, "the workflow does not die again after the restart");
    await before.stop();

    const none = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      args: { workflowId: "w-none", log: "none.log" },
    });
    assert.equal(none.deaths, 0, "a child without a fault does not die");
    await waitForSuccess(cluster.ownerUrl, "w-none");
    assert.equal(none.deaths, 0, "the no-fault workflow completes without a death");
    lastPid = none.pid;

    assert.deepEqual(
      logLines(cluster.dataDir, "after.log"),
      ["one", "two", "two", "three", "done"],
      "after:two re-runs two after the restart",
    );
    assert.deepEqual(
      logLines(cluster.dataDir, "before.log"),
      ["one", "two", "three", "done"],
      "before:two runs two once after the restart",
    );
    assert.deepEqual(
      logLines(cluster.dataDir, "none.log"),
      ["one", "two", "three", "done"],
      "the no-fault workflow runs every step once",
    );

    markerNames = readdirSync(faultMarkerDir(cluster.dataDir)).sort();

    for (const workflowId of ["w-after", "w-before", "w-none"]) {
      const row = await waitForSuccess(cluster.ownerUrl, workflowId);
      assert.equal(
        row.application_version,
        "ursitoare-1",
        `workflow ${workflowId} ran under the durable application version`,
      );
      assert.equal(
        await countRows(cluster.ownerUrl, workflowId),
        1,
        `workflow ${workflowId} has exactly one status row`,
      );
    }
  });

  assert.deepEqual(
    markerNames,
    [sha256hex("after:two"), sha256hex("before:two")].sort(),
    "only the two armed points wrote markers",
  );
  assert.ok(lastPid !== undefined, "the last engine reported a pid");
  assert.equal(isAlive(lastPid), false, "the last engine is dead once the cluster returns");
});
