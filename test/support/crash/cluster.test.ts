import assert from "node:assert/strict";
import {
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createConnection } from "node:net";
import os from "node:os";
import { basename, dirname, join } from "node:path";
import { test } from "node:test";

import { createPool } from "../../../src/db/index.ts";
import { discoverParts } from "../e2e-stack/discover.ts";
import type { E2eStackPart, PartContext } from "../e2e-stack/part.ts";
import { startCrashCluster, withDedicatedCluster } from "./cluster.ts";
import { spawnEngine } from "./engine.ts";

assert.equal(typeof startCrashCluster, "function");
assert.equal(typeof withDedicatedCluster, "function");

type Outcome<T> = { value: T } | { error: unknown };

type Capture<T> =
  | { ok: true; value: T }
  | { ok: false; name: string; code: string | undefined; details: Record<string, unknown> };

async function attempt<T>(call: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { value: await call() };
  } catch (error) {
    return { error };
  }
}

async function capture<T>(call: () => Promise<T>): Promise<Capture<T>> {
  try {
    return { ok: true, value: await call() };
  } catch (error) {
    const code = (error as { code?: unknown } | null)?.code;
    const details = (error as { details?: unknown } | null)?.details;
    return {
      ok: false,
      name: error instanceof Error ? error.name : "non-error",
      code: typeof code === "string" ? code : undefined,
      details:
        typeof details === "object" && details !== null ? (details as Record<string, unknown>) : {},
    };
  }
}

function failure(result: Capture<unknown>): {
  code: string | undefined;
  details: Record<string, unknown>;
} {
  return result.ok ? { code: undefined, details: {} } : { code: result.code, details: result.details };
}

function statCode(path: string): string | undefined {
  try {
    statSync(path);
    return "exists";
  } catch (error) {
    return (error as NodeJS.ErrnoException).code;
  }
}

function isAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code !== "ESRCH";
  }
}

function connectionRefused(port: number): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.once("connect", () => {
      socket.destroy();
      resolve(false);
    });
    socket.once("error", (error: NodeJS.ErrnoException) => {
      socket.destroy();
      resolve(error.code === "ECONNREFUSED");
    });
  });
}

interface Recorder {
  log: string[];
  contexts: Map<string, PartContext>;
}

function recorder(): Recorder {
  return { log: [], contexts: new Map<string, PartContext>() };
}

interface FakeOptions {
  env?: Readonly<Record<string, string>>;
  failStart?: boolean;
  failSeed?: boolean;
}

function fakePart(name: string, record: Recorder, options: FakeOptions = {}): E2eStackPart {
  const part: E2eStackPart = {
    name,
    async start(ctx: PartContext) {
      record.log.push(`start:${name}`);
      record.contexts.set(name, ctx);
      if (options.failStart === true) {
        throw new Error(`start failed: ${name}`);
      }
      return {
        env: options.env ?? {},
        close: async (): Promise<void> => {
          record.log.push(`close:${name}`);
        },
      };
    },
    async seed(): Promise<void> {
      record.log.push(`seed:${name}`);
      if (options.failSeed === true) {
        throw new Error(`seed failed: ${name}`);
      }
    },
  };
  return part;
}

test("C-43ecafdc: a dedicated cluster returns a value and cleans up after the fn throws", async () => {
  const boom = new Error("boom");
  let thrownDir: string | undefined;
  let thrownPort: number | undefined;

  const thrown = await attempt(() =>
    withDedicatedCluster(async (cluster) => {
      thrownDir = cluster.dataDir;
      thrownPort = Number(new URL(cluster.appEndpoint.url).port);
      throw boom;
    }),
  );

  assert.ok("error" in thrown, "the throwing fn rejects");
  assert.equal(thrown.error, boom);
  assert.ok(thrownDir !== undefined, "the fn saw the cluster data directory");
  assert.equal(statCode(thrownDir), "ENOENT", "the throw case removed its directory");
  assert.ok(thrownPort !== undefined, "the fn saw the app endpoint port");
  assert.equal(await connectionRefused(thrownPort), true, "the throw case leaves no listener");

  const recorded = await withDedicatedCluster(async (cluster) => {
    const app = createPool(cluster.appEndpoint, { max: 1 });
    const owner = createPool(cluster.ownerUrl, { max: 1 });
    try {
      const users = await app.query<{ u: string; d: string }>(
        "SELECT current_user AS u, current_database() AS d",
      );
      const namespaces = await owner.query<{ ok: boolean }>(
        "SELECT to_regnamespace('dbos') IS NOT NULL AS ok",
      );
      const passwordFile = cluster.env["URSITOARE_DATABASE_PASSWORD_FILE"];
      assert.ok(passwordFile !== undefined, "the cluster env names the app password file");
      const password = cluster.appEndpoint.password;
      assert.ok(password !== null, "the app endpoint carries the password");
      const userRow = users.rows[0];
      assert.ok(userRow !== undefined, "the app pool answered");
      const namespaceRow = namespaces.rows[0];
      assert.ok(namespaceRow !== undefined, "the owner pool answered");
      return {
        u: userRow.u,
        d: userRow.d,
        ok: namespaceRow.ok,
        mode: statSync(passwordFile).mode & 0o777,
        text: readFileSync(passwordFile, "utf8"),
        env: cluster.env,
        url: cluster.appEndpoint.url,
        secret: password.reveal(),
        dirs: readdirSync(cluster.dataDir),
        dataDir: cluster.dataDir,
        parent: dirname(cluster.dataDir),
        port: Number(new URL(cluster.appEndpoint.url).port),
      };
    } finally {
      await app.end();
      await owner.end();
    }
  });

  assert.equal(recorded.u, "ursitoare_app");
  assert.equal(recorded.d, "ursitoare_e2e");
  assert.equal(recorded.ok, true);
  assert.equal(recorded.mode, 0o600);
  assert.equal(recorded.text, `${recorded.secret}\n`);
  assert.equal(recorded.env["URSITOARE_DATABASE_URL"], recorded.url);
  assert.equal(new URL(recorded.url).password, "", "the app URL carries no password");
  assert.ok(recorded.dirs.includes("database"), "the data directory holds the database part");
  assert.ok(recorded.dirs.includes("durable"), "the data directory holds the durable part");
  assert.ok(recorded.dirs.includes("oidc"), "the data directory holds the oidc part");
  assert.equal(recorded.parent, realpathSync(os.tmpdir()));
  assert.ok(basename(recorded.dataDir).startsWith("ursitoare-crash-"));
  assert.equal(statCode(recorded.dataDir), "ENOENT", "the value case removed its directory");
  assert.equal(await connectionRefused(recorded.port), true, "the value case leaves no listener");
});

test("C-43ecafdc: a crash cluster close stops the spawned engine and removes its directory", async () => {
  let started: Awaited<ReturnType<typeof startCrashCluster>> | undefined;
  let enginePid: number | undefined;

  try {
    const opened = await capture(async () => startCrashCluster(await discoverParts()));
    assert.equal(opened.ok, true, "the crash cluster starts on the real parts");
    const handle = opened.value;
    started = handle;

    const scenario = join(handle.cluster.dataDir, "idle.mjs");
    writeFileSync(scenario, "export async function start(ctx) {\n  ctx.ready();\n}\n");

    const spawned = await capture(() => spawnEngine({ cluster: handle.cluster, scenario }));
    assert.equal(spawned.ok, true, "the idle engine starts");
    const engine = spawned.value;
    enginePid = engine.pid;
    assert.ok(Number.isInteger(engine.pid) && engine.pid > 0, "the engine reports its pid");
    assert.equal(engine.deaths, 0);

    const first = await capture(() => handle.close());
    assert.equal(first.ok, true, "the first close resolves");
    assert.equal(isAlive(engine.pid), false, "the cluster close stopped the engine");

    const second = await capture(() => handle.close());
    assert.equal(second.ok, true, "the second close resolves");

    assert.equal(statCode(handle.cluster.dataDir), "ENOENT", "the close removed its directory");
    assert.equal(
      await connectionRefused(Number(new URL(handle.cluster.appEndpoint.url).port)),
      true,
      "the close leaves no listener",
    );
  } finally {
    await started?.close().catch(() => undefined);
    if (enginePid !== undefined && isAlive(enginePid)) {
      try {
        process.kill(enginePid, "SIGKILL");
      } catch {
        // The engine is already gone.
      }
    }
  }
});

test("C-5f05917f: a crash cluster starts parts in order, seeds, rolls back and refuses conflicts", async () => {
  const missingRecord = recorder();
  const missing = await capture(() =>
    startCrashCluster([
      fakePart("p1", missingRecord, { env: { K1: "v1" } }),
      fakePart("p2", missingRecord, { env: { K2: "v2" } }),
      fakePart("p3", missingRecord, { env: { K3: "v3" } }),
    ]),
  );

  assert.deepEqual(failure(missing), {
    code: "STACK_PART_MISSING",
    details: { part: "database" },
  });
  assert.deepEqual(missingRecord.log, [
    "start:p1",
    "start:p2",
    "start:p3",
    "seed:p1",
    "seed:p2",
    "seed:p3",
    "close:p3",
    "close:p2",
    "close:p1",
  ]);
  const p2 = missingRecord.contexts.get("p2");
  assert.ok(p2 !== undefined, "p2 recorded its context");
  assert.deepEqual(p2.env, { K1: "v1" });
  assert.equal(basename(p2.dataDir), "p2");
  assert.equal(p2.handles.has("p1"), true, "p2 saw the handle p1");
  assert.notEqual(p2.engineOrigin, p2.controlOrigin);
  assert.match(p2.engineOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.match(p2.controlOrigin, /^http:\/\/127\.0\.0\.1:\d+$/);
  assert.equal(statCode(dirname(p2.dataDir)), "ENOENT", "the missing-database case removed its directory");

  const startRecord = recorder();
  const startFailed = await capture(() =>
    startCrashCluster([
      fakePart("p1", startRecord, { env: { K1: "v1" } }),
      fakePart("p2", startRecord, { env: { K2: "v2" }, failStart: true }),
      fakePart("p3", startRecord, { env: { K3: "v3" } }),
    ]),
  );
  assert.deepEqual(failure(startFailed), { code: "STACK_PART_FAILED", details: { part: "p2" } });
  assert.deepEqual(startRecord.log, ["start:p1", "start:p2", "close:p1"]);
  const p2Failed = startRecord.contexts.get("p2");
  assert.ok(p2Failed !== undefined, "p2 recorded its context before failing");
  assert.equal(statCode(dirname(p2Failed.dataDir)), "ENOENT", "the failed-start case removed its directory");

  const conflictRecord = recorder();
  const conflict = await capture(() =>
    startCrashCluster([
      fakePart("p1", conflictRecord, { env: { K1: "v1" } }),
      fakePart("p2", conflictRecord, { env: { K1: "x" } }),
      fakePart("p3", conflictRecord, { env: { K3: "v3" } }),
    ]),
  );
  assert.deepEqual(failure(conflict), { code: "STACK_ENV_CONFLICT", details: { key: "K1" } });
  assert.deepEqual(conflictRecord.log, ["start:p1", "start:p2", "close:p2", "close:p1"]);
  const p2Conflict = conflictRecord.contexts.get("p2");
  assert.ok(p2Conflict !== undefined, "p2 recorded its context before the conflict");
  assert.equal(statCode(dirname(p2Conflict.dataDir)), "ENOENT", "the conflict case removed its directory");

  const seedRecord = recorder();
  const seedFailed = await capture(() =>
    startCrashCluster([
      fakePart("p1", seedRecord, { env: { K1: "v1" } }),
      fakePart("p2", seedRecord, { env: { K2: "v2" } }),
      fakePart("p3", seedRecord, { env: { K3: "v3" }, failSeed: true }),
    ]),
  );
  assert.deepEqual(failure(seedFailed), { code: "STACK_PART_FAILED", details: { part: "p3" } });
  assert.deepEqual(seedRecord.log, [
    "start:p1",
    "start:p2",
    "start:p3",
    "seed:p1",
    "seed:p2",
    "seed:p3",
    "close:p3",
    "close:p2",
    "close:p1",
  ]);
  const p2Seeded = seedRecord.contexts.get("p2");
  assert.ok(p2Seeded !== undefined, "p2 recorded its context");
  assert.equal(statCode(dirname(p2Seeded.dataDir)), "ENOENT", "the failed-seed case removed its directory");
});
