import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import type pg from "pg";

import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import type { DurableRuntime, LaunchOptions } from "./durable/index.ts";
import { launchDurable } from "./durable/index.ts";
import type { RunningServer } from "./main.ts";
import { main } from "./main.ts";
import { createLogger } from "./observability/index.ts";
import type { LogDestination } from "./observability/index.ts";
import { withTestDatabase } from "../test/support/pg.ts";
import type { TestDatabase } from "../test/support/pg.ts";

assert.equal(typeof launchDurable, "function");

function capture(): { destination: LogDestination; lines: string[] } {
  const lines: string[] = [];
  return {
    lines,
    destination: {
      write(line: string): void {
        lines.push(line);
      },
    },
  };
}

function parse(line: string | undefined): Record<string, unknown> {
  assert.ok(line !== undefined, "a log line was written");
  return JSON.parse(line) as Record<string, unknown>;
}

function logged(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => parse(line));
}

function fatalLines(lines: readonly string[]): Record<string, unknown>[] {
  return logged(lines).filter((line) => line["level"] === 60);
}

function deferred<T>(): { promise: Promise<T>; resolve: (value: T) => void } {
  let resolveFn: ((value: T) => void) | undefined;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return {
    promise,
    resolve(value: T): void {
      assert.ok(resolveFn !== undefined, "the deferred was initialised");
      resolveFn(value);
    },
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function appConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    role: "all",
    host: "127.0.0.1",
    port: 0,
    logLevel: "info",
    publicBaseUrl: "https://ursitoare.example.com",
    webDist: null,
    shutdownDrainMs: 10000,
    engineKey: null,
    database: { app: null, owner: null },
    ...overrides,
  };
}

function endpointOf(source: { url: string; password: { reveal(): string } | null }): DatabaseEndpoint {
  const revealed = source.password === null ? null : source.password.reveal();
  return { url: source.url, password: revealed === null ? null : new Secret(revealed) };
}

async function busyLoopbackPort(): Promise<{ port: number; close(): Promise<void> }> {
  const blocker = createServer();
  await new Promise<void>((resolve, reject) => {
    blocker.once("error", reject);
    blocker.listen(0, "127.0.0.1", resolve);
  });
  const address = blocker.address();
  assert.ok(address !== null && typeof address === "object", "the blocker bound a port");
  return {
    port: (address as AddressInfo).port,
    close: () =>
      new Promise<void>((resolve, reject) => {
        blocker.close((error) => (error === undefined ? resolve() : reject(error)));
      }),
  };
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

function reasonOf(error: unknown): unknown {
  return (error as { details?: { reason?: unknown } } | null)?.details?.reason;
}

interface RoleRun {
  launches: LaunchOptions[];
  records: string[];
  exits: number[];
}

async function runFakeRole(
  role: AppConfig["role"],
  app: DatabaseEndpoint | null,
): Promise<RoleRun> {
  const { destination } = capture();
  const signals = new EventEmitter();
  const exited = deferred<number>();
  const launches: LaunchOptions[] = [];
  const records: string[] = [];
  const exits: number[] = [];
  const runtime: DurableRuntime = {
    applicationVersion: "ursitoare-1",
    enqueue: async (): Promise<void> => undefined,
    status: async (): Promise<null> => null,
    cancel: async (): Promise<void> => undefined,
    shutdown: async (): Promise<void> => {
      records.push("durable.shutdown");
    },
  };
  const deps = {
    loadConfig: () => appConfig({ role, database: { app, owner: null } }),
    destination,
    signals,
    exit: (code: number): void => {
      exits.push(code);
      exited.resolve(code);
    },
    openDatabase: async (): Promise<Database> => ({
      appPool: {} as pg.Pool,
      close: async (): Promise<void> => {
        records.push("database.close");
      },
    }),
    launchDurable: async (opts: LaunchOptions): Promise<DurableRuntime> => {
      launches.push(opts);
      return runtime;
    },
  };

  const running = await main(deps);
  assert.ok(running !== null, `main starts for role ${role}`);
  signals.emit("SIGTERM");
  assert.equal(await exited.promise, 0, `main exits 0 for role ${role}`);
  return { launches, records, exits };
}

test("C-c37d6095 main launches the runtime only for the all and worker roles and closes it before the database", async () => {
  const E = endpointOf({ url: "postgres://ursitoare_app@127.0.0.1:5432/ursitoare", password: null });

  for (const role of ["all", "worker"] as const) {
    const run = await runFakeRole(role, E);
    assert.equal(run.launches.length, 1, `the fake is called once for ${role}`);
    const opts = run.launches[0];
    assert.ok(opts !== undefined, "the launch options were recorded");
    assert.deepEqual(Object.keys(opts).sort(), ["endpoint", "logger"], "only the endpoint and the logger");
    assert.ok(opts.endpoint === E, "the launch receives the configured endpoint");
    assert.equal(typeof opts.logger.info, "function", "the launch receives the app logger");
    assert.deepEqual(run.records, ["durable.shutdown", "database.close"], "the runtime closes before the database");
    assert.deepEqual(run.exits, [0]);
  }

  for (const role of ["api", "sandbox"] as const) {
    const run = await runFakeRole(role, E);
    assert.equal(run.launches.length, 0, `the fake is never called for ${role}`);
    assert.deepEqual(run.records, ["database.close"], "the database still closes");
  }

  const disabled = await runFakeRole("all", null);
  assert.equal(disabled.launches.length, 0, "a null app endpoint never launches the runtime");
  assert.deepEqual(disabled.records, ["database.close"], "the database still closes");
});

async function durableSessions(db: TestDatabase): Promise<{ usename: string }[]> {
  const result = await db.ownerPool.query<{ usename: string }>(
    "SELECT usename FROM pg_stat_activity " +
      "WHERE datname = $1 AND application_name = 'ursitoare-durable'",
    [db.name],
  );
  return result.rows;
}

async function waitForNoDurableSessions(db: TestDatabase, timeoutMs = 5000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let sessions = await durableSessions(db);
  while (sessions.length > 0 && Date.now() < deadline) {
    await delay(20);
    sessions = await durableSessions(db);
  }
  return sessions.length;
}

test("C-073558f4 main launches as the app role, keeps health unchanged, fails without the schema and closes after a listen failure", async () => {
  {
    const db = await withTestDatabase();
    try {
      await db.ownerPool.query("DROP SCHEMA dbos CASCADE");
      const { destination, lines } = capture();
      const exits: number[] = [];
      const result = await main({
        loadConfig: () =>
          appConfig({ database: { app: endpointOf(db.appEndpoint), owner: null } }),
        destination,
        signals: new EventEmitter(),
        exit: (code) => {
          exits.push(code);
        },
      });
      if (result !== null) {
        await result.close().catch(() => undefined);
      }

      const fatal = fatalLines(lines);
      assert.equal(fatal.length, 1, "exactly one fatal line is written");
      assert.deepEqual(exits, [1], "main exits once with 1");
      assert.ok(result === null, "main resolves null when the dbos schema is missing");
      const line = fatal[0];
      assert.ok(line !== undefined, "the fatal line was written");
      assert.equal(line["code"], "DURABLE_UNAVAILABLE");
      assert.equal(line["msg"], "startup failed");
      assert.equal(line["reason"], "not_prepared");
      assert.equal(
        lines.some((entry) => entry.includes("postgres://")),
        false,
        "no log line holds a URL",
      );
    } finally {
      await db.close();
    }
  }

  {
    const db = await withTestDatabase();
    let running: RunningServer | null = null;
    const logger = createLogger({ level: "silent", destination: capture().destination });
    try {
      running = await main({
        loadConfig: () =>
          appConfig({ database: { app: endpointOf(db.appEndpoint), owner: null } }),
        destination: capture().destination,
        signals: new EventEmitter(),
        exit: () => undefined,
      });
      assert.ok(running !== null, "main starts the runtime on an intact clone");

      const health = await fetch(`${running.url}/health`);
      assert.equal(health.status, 200, "health answers 200");
      const body = (await health.json()) as { checks?: Record<string, string> };
      assert.deepEqual(body.checks, { db: "ok" }, "health keeps only the database check");

      const sessions = await durableSessions(db);
      assert.ok(sessions.length > 0, "the runtime holds a durable session");
      for (const session of sessions) {
        assert.equal(session.usename, "ursitoare_app", "the runtime connects as the app role");
      }

      const second = await rejectionOf(() =>
        launchDurable({ endpoint: db.appEndpoint, logger }),
      );
      assert.equal(codeOf(second), "DURABLE_ALREADY_LAUNCHED", "a second launch is refused");
      assert.equal(reasonOf(second), "running", "the second launch is refused while running");

      await running.close();
      running = null;

      const resumed = await launchDurable({ endpoint: db.appEndpoint, logger });
      assert.equal(resumed.applicationVersion, "ursitoare-1", "the launch resolves after close");
      await resumed.shutdown();
    } finally {
      await running?.close().catch(() => undefined);
      await db.close();
    }
  }

  {
    const db = await withTestDatabase();
    const blocker = await busyLoopbackPort();
    const logger = createLogger({ level: "silent", destination: capture().destination });
    try {
      const { destination, lines } = capture();
      const exits: number[] = [];
      const result = await main({
        loadConfig: () =>
          appConfig({
            port: blocker.port,
            database: { app: endpointOf(db.appEndpoint), owner: null },
          }),
        destination,
        signals: new EventEmitter(),
        exit: (code) => {
          exits.push(code);
        },
      });

      const fatal = fatalLines(lines);
      assert.equal(fatal.length, 1, "exactly one fatal line is written");
      assert.deepEqual(exits, [1], "main exits once with 1");
      assert.ok(result === null, "main resolves null when the port is taken");
      assert.equal(fatal[0]?.["code"], "EADDRINUSE");

      assert.equal(await waitForNoDurableSessions(db), 0, "the launched runtime leaves no session");
      const resumed = await launchDurable({ endpoint: db.appEndpoint, logger });
      await resumed.shutdown();
    } finally {
      await blocker.close();
      await db.close();
    }
  }
});
