import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { E2eStackError } from "../e2e-stack/part.ts";
import type { CrashCluster } from "./cluster.ts";
import { spawnEngine, type EngineProcess } from "./engine.ts";

assert.equal(typeof spawnEngine, "function");

const tempDirs: string[] = [];
const liveEngines: EngineProcess[] = [];

after(async () => {
  for (const engine of liveEngines) {
    try {
      await engine.stop();
    } catch {
      // A test's failure must not leak a child into the next file.
    }
  }
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(join(os.tmpdir(), "crash-engine-control-"));
  tempDirs.push(dir);
  return dir;
}

function clusterFor(dataDir: string): CrashCluster {
  return {
    env: {},
    ownerUrl: "postgres://owner@127.0.0.1:1/ursitoare",
    appEndpoint: {
      url: "postgres://ursitoare_app@127.0.0.1:1/ursitoare",
      password: null,
    },
    dataDir,
  };
}

function scenarioFile(dir: string, name: string, source: string): string {
  const file = join(dir, name);
  writeFileSync(file, source);
  return file;
}

async function spawnOrFail(
  opts: Parameters<typeof spawnEngine>[0],
): Promise<EngineProcess> {
  const outcome = await spawnEngine(opts).then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );
  if (!outcome.ok) {
    assert.fail(`spawnEngine resolves: ${String(outcome.error)}`);
  }
  return outcome.value;
}

async function engineFor(root: string, name: string, scenario: string): Promise<EngineProcess> {
  const engine = await spawnOrFail({
    cluster: clusterFor(join(root, name)),
    scenario,
  });
  liveEngines.push(engine);
  return engine;
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function assertDead(pid: number, message: string): void {
  assert.throws(
    () => process.kill(pid, 0),
    (error: unknown) => (error as NodeJS.ErrnoException).code === "ESRCH",
    message,
  );
}

async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  assert.equal(predicate(), true, message);
}

function readPids(dataDir: string): number[] {
  const file = join(dataDir, "pids.log");
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => Number(line));
}

function rejection(call: Promise<unknown>): Promise<unknown> {
  return call.then(
    () => assert.fail("expected the call to reject"),
    (error: unknown) => error,
  );
}

const IDLE = `
import { appendFileSync } from "node:fs";
import { join } from "node:path";

export async function start(ctx) {
  appendFileSync(join(ctx.dataDir, "pids.log"), process.pid + "\\n");
  ctx.ready();
}
`;

const EXIT_ONCE = `
import { appendFileSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export async function start(ctx) {
  appendFileSync(join(ctx.dataDir, "pids.log"), process.pid + "\\n");
  ctx.ready();
  const once = join(ctx.dataDir, "once");
  if (!existsSync(once)) {
    writeFileSync(once, "");
    setTimeout(() => process.exit(3), 100);
  }
}
`;

const FLAKY = `
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";

export async function start(ctx) {
  appendFileSync(join(ctx.dataDir, "pids.log"), process.pid + "\\n");
  if (existsSync(join(ctx.dataDir, "fail-next"))) {
    throw Object.assign(new Error("x"), { code: "E_NEXT" });
  }
  ctx.ready();
}
`;

test("C-59216c23: kill is hard, restart replaces the child, stop ends the engine and deaths counts only unrequested ends", async () => {
  const root = tempRoot();
  const idleScenario = scenarioFile(root, "idle.mjs", IDLE);
  const engine = await engineFor(root, "idle", idleScenario);

  const firstPid = engine.pid;
  await engine.kill();
  assertDead(firstPid, "the first pid is dead after kill");
  assert.equal(engine.deaths, 0, "a requested kill is not a death");
  await engine.kill();

  await engine.restart();
  const secondPid = engine.pid;
  assert.notEqual(secondPid, firstPid, "restart gives a new pid");
  assertDead(firstPid, "the previous pid is dead after restart");
  assert.equal(isAlive(secondPid), true, "the restarted child is alive");

  await engine.restart();
  const thirdPid = engine.pid;
  assert.notEqual(thirdPid, secondPid, "a restart of a live child gives a new pid");
  assertDead(secondPid, "the previous live pid is dead after the second restart");
  assert.equal(isAlive(thirdPid), true, "the second restarted child is alive");

  await Promise.all([engine.restart(), engine.restart()]);
  const currentPid = engine.pid;
  const alive = readPids(join(root, "idle")).filter(isAlive);
  assert.deepEqual(alive, [currentPid], "only the current pid survives concurrent restarts");

  await engine.stop();
  assertDead(currentPid, "stop kills the current child");
  await engine.stop();
  await engine.kill();
  const stopped = await rejection(engine.restart());
  assert.ok(stopped instanceof E2eStackError, "a stopped engine rejects with an E2eStackError");
  assert.equal(stopped.code, "CRASH_STOPPED", "a stopped engine cannot restart");
  assert.equal(engine.deaths, 0, "stop does not count as a death");

  const exitScenario = scenarioFile(root, "exit-once.mjs", EXIT_ONCE);
  const secondEngine = await engineFor(root, "exit-once", exitScenario);
  await waitFor(() => secondEngine.deaths === 1, "the child that exits on its own counts as a death");
  const exitingPid = secondEngine.pid;
  await secondEngine.kill();
  assertDead(exitingPid, "kill resolves at once on a child that is already gone");
  await secondEngine.restart();
  assert.notEqual(secondEngine.pid, exitingPid, "restart recovers a child that died on its own");
  assert.equal(isAlive(secondEngine.pid), true, "the recovered child is alive");
});

test("C-fb4b5ad9: a restart and a stop issued together both settle and leave no child alive", async () => {
  const root = tempRoot();
  const idleScenario = scenarioFile(root, "idle.mjs", IDLE);
  const engine = await engineFor(root, "together", idleScenario);

  const results = await Promise.allSettled([engine.restart(), engine.stop()]);
  assert.deepEqual(
    results.map((result) => result.status),
    ["fulfilled", "fulfilled"],
    "a restart and a stop issued together both settle",
  );

  const pids = readPids(join(root, "together"));
  assert.ok(pids.length > 0, "the scenario recorded its pids");
  for (const pid of pids) {
    assertDead(pid, `every pid in pids.log is dead, including ${pid}`);
  }

  const stopped = await rejection(engine.restart());
  assert.ok(stopped instanceof E2eStackError, "the stop leaves an E2eStackError behind");
  assert.equal(stopped.code, "CRASH_STOPPED", "a later restart is refused");
  assert.equal(engine.deaths, 0, "a stop does not count as a death");
});

test("C-5bff336f: a failed restart leaves the engine dead on its old pid and a later restart recovers it", async () => {
  const root = tempRoot();
  const dataDir = join(root, "flaky");
  const flakyScenario = scenarioFile(root, "flaky.mjs", FLAKY);
  const engine = await spawnOrFail({ cluster: clusterFor(dataDir), scenario: flakyScenario });
  liveEngines.push(engine);

  const old = engine.pid;
  writeFileSync(join(dataDir, "fail-next"), "");

  const failed = await rejection(engine.restart());
  assert.ok(failed instanceof E2eStackError, "the failed restart rejects with an E2eStackError");
  assert.equal(failed.code, "CRASH_START_FAILED", "the failed restart reports a start failure");
  assert.equal(failed.details["reason"], "exited", "the replacement child exited");
  assert.equal(
    failed.details["line"],
    "crash-child: scenario_failed E_NEXT",
    "the rejection carries the scenario failure line",
  );
  assert.equal(failed.details["exitCode"], 1, "the rejection carries the exit code");

  for (const pid of readPids(dataDir)) {
    assertDead(pid, `no pid in pids.log is alive, including ${pid}`);
  }
  assert.equal(engine.pid, old, "the engine keeps the old pid after a failed restart");
  assert.equal(engine.deaths, 0, "a failed restart is not a death");
  await engine.kill();

  rmSync(join(dataDir, "fail-next"));
  await engine.restart();
  assert.notEqual(engine.pid, old, "the recovered child has a new pid");
  assert.equal(isAlive(engine.pid), true, "the recovered child is alive");
  assert.equal(engine.deaths, 0, "the recovery is not a death");
});
