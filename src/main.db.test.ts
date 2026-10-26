import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { createServer } from "node:net";
import type { AddressInfo } from "node:net";
import { test } from "node:test";

import pg from "pg";

import type { AppConfig, DatabaseEndpoint } from "./config/index.ts";
import { Secret } from "./config/index.ts";
import type { Database } from "./db/index.ts";
import { DbError, openDatabase } from "./db/index.ts";
import type { MainDeps, RunningServer } from "./main.ts";
import { main, startServer } from "./main.ts";
import type { LogDestination } from "./observability/index.ts";
import { readTestCluster, withTestDatabase } from "../test/support/pg.ts";

assert.equal(typeof startServer, "function");
assert.equal(typeof openDatabase, "function");

type OpenConfig = Parameters<typeof openDatabase>[0];

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

function databaseEndpoint(endpoint: {
  url: string;
  password: { reveal(): string } | null;
}): DatabaseEndpoint {
  const revealed = endpoint.password === null ? null : endpoint.password.reveal();
  return { url: endpoint.url, password: revealed === null ? null : new Secret(revealed) };
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

async function resolveMain(deps: Partial<MainDeps>): Promise<RunningServer | null> {
  const results: (RunningServer | null)[] = [];
  await assert.doesNotReject(async () => {
    results.push(await main(deps));
  }, "main must resolve");
  const result = results[0];
  assert.ok(result !== undefined, "main resolved a value");
  return result;
}

async function body(response: Response): Promise<{ status: unknown; checks: unknown }> {
  return (await response.json()) as { status: unknown; checks: unknown };
}

async function ownerSessions(admin: pg.Client, database: string): Promise<number> {
  const result = await admin.query<{ count: number }>(
    "SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname = $1 AND usename = $2",
    [database, "ursitoare_owner"],
  );
  const row = result.rows[0];
  assert.ok(row !== undefined, "the session count was returned");
  return row.count;
}

test("C-b3bd64b0 main opens no database and keeps health green", async () => {
  const direct = await startServer(0, "127.0.0.1");
  try {
    assert.equal(typeof direct.url, "string");
    const response = await fetch(`${direct.url}/health`);
    assert.equal(response.status, 200);
    const payload = await body(response);
    assert.equal(payload.status, "ok");
    assert.deepEqual(payload.checks, {});
  } finally {
    await direct.close().catch(() => undefined);
  }

  const { destination, lines } = capture();
  const config = appConfig({ database: { app: null, owner: null } });
  const calls: OpenConfig[] = [];
  const spy: typeof openDatabase = async (opened) => {
    calls.push(opened);
    return null;
  };
  const exits: number[] = [];
  let running: RunningServer | null = null;
  try {
    running = await resolveMain({
      loadConfig: () => config,
      destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: spy,
    });

    assert.ok(running !== null, "main resolves a running server");
    const response = await fetch(`${running.url}/health`);
    assert.equal(response.status, 200);
    const payload = await body(response);
    assert.equal(payload.status, "ok");
    assert.deepEqual(payload.checks, {});
    assert.equal(calls.length, 1, "openDatabase was called once");
    assert.equal(calls[0], config);
    assert.deepEqual(exits, []);
    assert.equal(
      logged(lines).some((line) => line["msg"] === "ursitoare listening"),
      true,
      "the server reported listening",
    );
  } finally {
    await running?.close().catch(() => undefined);
  }
});

test("C-fb007fe9 main registers db, serves ok then fail, and never opens the owner", async () => {
  const db = await withTestDatabase();
  const cluster = readTestCluster();
  const admin = new pg.Client({ connectionString: cluster.adminUrl });
  await admin.connect();

  const { destination } = capture();
  const exits: number[] = [];
  const signals = new EventEmitter();
  const opened: Database[] = [];
  const wrapper: typeof openDatabase = async (config, deps) => {
    const database = await openDatabase(config, deps);
    if (database !== null) {
      opened.push(database);
    }
    return database;
  };
  let running: RunningServer | null = null;

  try {
    const before = await ownerSessions(admin, db.name);

    running = await resolveMain({
      loadConfig: () =>
        appConfig({
          database: {
            app: databaseEndpoint(db.appEndpoint),
            owner: databaseEndpoint(db.ownerEndpoint),
          },
        }),
      destination,
      signals,
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: wrapper,
    });

    assert.ok(running !== null, "main resolves a running server");
    const live = await fetch(`${running.url}/health`);
    assert.equal(live.status, 200);
    const liveBody = await body(live);
    assert.equal(liveBody.status, "ok");
    assert.deepEqual(liveBody.checks, { db: "ok" });

    const after = await ownerSessions(admin, db.name);
    assert.equal(after, before, "the engine opened no ursitoare_owner session");

    const database = opened[0];
    assert.ok(database !== undefined, "the wrapper kept the real Database");
    await database.close();

    const down = await fetch(`${running.url}/health`);
    assert.equal(down.status, 503);
    const downBody = await body(down);
    assert.equal(downBody.status, "fail");
    assert.deepEqual(downBody.checks, { db: "fail" });
    assert.deepEqual(exits, []);
  } finally {
    await running?.close().catch(() => undefined);
    await opened[0]?.close().catch(() => undefined);
    await admin.end().catch(() => undefined);
    await db.close();
  }
});

test("C-ad848b65 main writes one fatal line and opens no port when the open fails", async () => {
  const failures: { code: string; reason: string; error: DbError }[] = [
    {
      code: "DB_UNAVAILABLE",
      reason: "ECONNREFUSED",
      error: new DbError("DB_UNAVAILABLE", "database unavailable", { reason: "ECONNREFUSED" }),
    },
    {
      code: "DB_ROLE_UNSAFE",
      reason: "superuser",
      error: new DbError("DB_ROLE_UNSAFE", "unsafe role", { reason: "superuser" }),
    },
  ];

  for (const failure of failures) {
    const { destination, lines } = capture();
    const exits: number[] = [];
    const failing: typeof openDatabase = async () => {
      throw failure.error;
    };
    let running: RunningServer | null = null;
    try {
      running = await resolveMain({
        loadConfig: () => appConfig({ host: "127.0.0.1", port: 0 }),
        destination,
        signals: new EventEmitter(),
        exit: (code) => {
          exits.push(code);
        },
        openDatabase: failing,
      });

      assert.equal(running === null, true, `${failure.code} resolves null`);
      assert.deepEqual(exits, [1], `${failure.code} exits 1`);

      const fatal = fatalLines(lines);
      assert.equal(fatal.length, 1, `${failure.code} writes one fatal line`);
      const line = fatal[0];
      assert.ok(line !== undefined, "the fatal line was written");
      assert.equal(line["code"], failure.code);
      assert.equal(line["reason"], failure.reason);
      assert.equal(line["msg"], "startup failed");
      assert.equal("variable" in line, false);
      assert.equal("host" in line, false);
      assert.equal("port" in line, false);
      assert.equal(
        logged(lines).some((entry) => entry["msg"] === "ursitoare listening"),
        false,
        "no port was opened",
      );
    } finally {
      await running?.close().catch(() => undefined);
    }
  }
});

test("C-6d93e8d5 shutdown and a failed listen end the app pool", async () => {
  const first = capture();
  const signals = new EventEmitter();
  const exited = deferred<number>();
  let closeCalls = 0;
  const close = async (): Promise<void> => {
    closeCalls += 1;
  };
  const stub: typeof openDatabase = async () => ({ appPool: {} as pg.Pool, close });
  let running: RunningServer | null = null;
  try {
    running = await resolveMain({
      loadConfig: () => appConfig({ host: "127.0.0.1", port: 0 }),
      destination: first.destination,
      signals,
      exit: (code) => {
        exited.resolve(code);
      },
      openDatabase: stub,
    });

    assert.ok(running !== null, "main resolves a running server");
    signals.emit("SIGTERM");
    assert.equal(await exited.promise, 0);
    assert.equal(closeCalls, 1, "the app pool was closed before exit 0");
  } finally {
    await running?.close().catch(() => undefined);
  }

  const blocker = await busyLoopbackPort();
  try {
    const second = capture();
    const exits: number[] = [];
    let busyCloseCalls = 0;
    const busyClose = async (): Promise<void> => {
      busyCloseCalls += 1;
    };
    const busyStub: typeof openDatabase = async () => ({
      appPool: {} as pg.Pool,
      close: busyClose,
    });

    const result = await resolveMain({
      loadConfig: () => appConfig({ host: "127.0.0.1", port: blocker.port }),
      destination: second.destination,
      signals: new EventEmitter(),
      exit: (code) => {
        exits.push(code);
      },
      openDatabase: busyStub,
    });

    assert.equal(result, null);
    assert.deepEqual(exits, [1]);
    const fatal = fatalLines(second.lines);
    assert.equal(fatal.length, 1, "one fatal line is written");
    const line = fatal[0];
    assert.ok(line !== undefined, "the fatal line was written");
    assert.equal(line["code"], "EADDRINUSE");
    assert.equal(busyCloseCalls, 1, "the app pool was closed on listen failure");
  } finally {
    await blocker.close();
  }
});
