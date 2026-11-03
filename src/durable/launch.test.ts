import assert from "node:assert/strict";
import { test } from "node:test";

import type { DBOSConfig, DLogger } from "@dbos-inc/dbos-sdk";
import pg from "pg";

import type { EndpointLike } from "../db/index.ts";
import { createLogger } from "../observability/index.ts";
import type { LogDestination, Logger } from "../observability/index.ts";
import { readTestCluster, withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import {
  DurableError,
  dbosConfig,
  dbosLogger,
  launchDurable,
  prepareDurable,
} from "./index.ts";
import type { DurableRuntime, LaunchOptions } from "./index.ts";

const DURABLE_APPLICATION_NAME = "ursitoare-durable";

interface Capture {
  destination: LogDestination;
  lines: string[];
}

function capture(): Capture {
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

function parseLines(lines: readonly string[]): Record<string, unknown>[] {
  return lines.map((line) => JSON.parse(line) as Record<string, unknown>);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

type RecordedCall = [level: string, context: Record<string, unknown>, message: string];

function recordingLogger(calls: RecordedCall[]): Logger {
  const record =
    (level: string) =>
    (context: unknown, message?: unknown): void => {
      calls.push([level, context as Record<string, unknown>, String(message)]);
    };
  return {
    info: record("info"),
    debug: record("debug"),
    warn: record("warn"),
    error: record("error"),
  } as unknown as Logger;
}

function endpointFor(url: string): EndpointLike {
  return { url, password: null };
}

function assertDurableFailure(error: unknown, code: string, reason: string): true {
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

async function waitForLog(
  capture: Capture,
  predicate: (line: Record<string, unknown>) => boolean,
  timeoutMs = 5000,
): Promise<Record<string, unknown> | undefined> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const found = parseLines(capture.lines).find(predicate);
    if (found !== undefined || Date.now() >= deadline) {
      return found;
    }
    await delay(20);
  }
}

test("C-da1b0c83 prepared database gives the expected config logger sessions and pool warning", async () => {
  const options: LaunchOptions = {
    endpoint: {
      url: "postgres://ursitoare_app@127.0.0.1:5432/x",
      password: { reveal: () => "pw" },
    },
    logger: createLogger({ level: "silent", destination: capture().destination }),
  };
  const pool = {} as pg.Pool;

  let config: DBOSConfig | undefined;
  assert.doesNotThrow(() => {
    config = dbosConfig(options, pool);
  });
  assert.ok(config !== undefined, "dbosConfig returned a config");
  assert.equal(config.runMigrations, false);
  assert.equal(config.enableOTLP, false);
  assert.equal(config.name, "ursitoare");
  assert.equal(config.systemDatabaseSchemaName, "dbos");
  assert.equal(config.applicationVersion, "ursitoare-1");
  assert.equal(config.systemDatabasePool, pool, "the given pool is used");
  assert.ok(config.systemDatabaseUrl !== undefined, "the config names a system database URL");
  assert.equal(new URL(config.systemDatabaseUrl).password, "", "the URL carries no password");

  const calls: RecordedCall[] = [];
  let adapter: DLogger | undefined;
  assert.doesNotThrow(() => {
    adapter = dbosLogger(recordingLogger(calls));
  });
  const logger = adapter;
  assert.ok(logger !== undefined, "dbosLogger returned an adapter");
  assert.doesNotThrow(() => {
    logger.info("x");
    logger.debug("d");
    logger.warn("w");
    logger.error(new Error("boom"));
  });
  assert.deepEqual(calls, [
    ["info", { component: "dbos" }, "x"],
    ["debug", { component: "dbos" }, "d"],
    ["warn", { component: "dbos" }, "w"],
    ["error", { component: "dbos" }, "Error: boom"],
  ]);

  const db = await withTestDatabase();
  const cluster = readTestCluster();
  const captured = capture();
  const capturingLogger = createLogger({ level: "debug", destination: captured.destination });
  const admin = new pg.Client({ connectionString: cluster.adminUrl });
  await admin.connect();
  let runtime: DurableRuntime | undefined;
  try {
    let launched: DurableRuntime | undefined;
    await assert.doesNotReject(async () => {
      launched = await launchDurable({ endpoint: db.appEndpoint, logger: capturingLogger });
    });
    runtime = launched;
    assert.ok(runtime !== undefined, "launchDurable resolved a runtime");
    assert.equal(runtime.applicationVersion, "ursitoare-1");

    const sessions = await waitForSessionCount(db, (count) => count >= 1);
    assert.ok(sessions >= 1, "at least one ursitoare-durable session exists");

    const users = await db.ownerPool.query<{ usename: string }>(
      "SELECT DISTINCT usename FROM pg_stat_activity WHERE datname = $1 AND application_name = $2",
      [db.name, DURABLE_APPLICATION_NAME],
    );
    assert.deepEqual(
      users.rows.map((row) => row.usename),
      ["ursitoare_app"],
      "the durable sessions use the app role",
    );

    const versions = await db.ownerPool.query<{ version_name: string }>(
      "SELECT version_name FROM dbos.application_versions",
    );
    assert.equal(
      versions.rows.some((row) => row.version_name === "ursitoare-1"),
      true,
      "dbos.application_versions has ursitoare-1",
    );

    const infoLines = parseLines(captured.lines).filter(
      (line) => line["level"] === 30 && line["component"] === "dbos",
    );
    assert.ok(infoLines.length >= 1, "an info line names the dbos component");
    assert.equal(
      captured.lines.some((line) => line.includes(cluster.appPassword)),
      false,
      "no log line holds the app password",
    );

    await admin.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND application_name = $2",
      [db.name, DURABLE_APPLICATION_NAME],
    );

    const warning = await waitForLog(
      captured,
      (line) =>
        line["msg"] === "durable pool error" &&
        line["component"] === "dbos" &&
        line["code"] === "57P01",
    );
    assert.ok(warning !== undefined, "the pool error is logged as a warning with its code");
    assert.equal(
      captured.lines.some((line) => line.includes("terminating connection")),
      false,
      "the logged warning never holds the driver text",
    );
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    await admin.end().catch(() => undefined);
    await db.close();
  }
});

test("C-57d8e403 launchDurable refuses bad options endpoints and databases", async () => {
  const db = await withTestDatabase({ migrated: false });
  const logger = createLogger({ level: "silent", destination: capture().destination });
  const base = { endpoint: db.appEndpoint, logger };
  let runtime: DurableRuntime | undefined;
  try {
    await assert.rejects(launchDurable(base), (error) =>
      assertDurableFailure(error, "DURABLE_UNAVAILABLE", "not_prepared"),
    );
    assert.equal(await waitForSessionCount(db, (count) => count === 0), 0);

    await assert.rejects(
      launchDurable({ ...base, concurrency: 0 }),
      (error) => {
        assertDurableFailure(error, "DURABLE_INVALID", "bad_option");
        assert.equal((error as DurableError).details.option, "concurrency");
        return true;
      },
    );

    await assert.rejects(
      launchDurable({ ...base, pollingIntervalMs: 5 }),
      (error) => {
        assertDurableFailure(error, "DURABLE_INVALID", "bad_option");
        assert.equal((error as DurableError).details.option, "pollingIntervalMs");
        return true;
      },
    );

    await assert.rejects(
      launchDurable({ ...base, endpoint: endpointFor("mysql://ursitoare_app@127.0.0.1:1/x") }),
      (error) => assertDurableFailure(error, "DURABLE_INVALID", "bad_endpoint"),
    );

    await assert.rejects(
      launchDurable({ ...base, endpoint: endpointFor("postgres://ursitoare_app@127.0.0.1:1") }),
      (error) => assertDurableFailure(error, "DURABLE_INVALID", "bad_endpoint"),
    );

    await assert.rejects(
      launchDurable({
        ...base,
        endpoint: endpointFor("postgres://ursitoare_app:pw@127.0.0.1:1/x"),
      }),
      (error) => assertDurableFailure(error, "DURABLE_INVALID", "password_in_url"),
    );

    await assert.rejects(
      launchDurable({ ...base, endpoint: endpointFor("postgres://ursitoare_app@127.0.0.1:1/x?foo=1") }),
      (error) => assertDurableFailure(error, "DURABLE_UNAVAILABLE", "config_failed"),
    );

    await assert.rejects(
      launchDurable({ ...base, endpoint: endpointFor("postgres://ursitoare_app@127.0.0.1:1/x") }),
      (error) => assertDurableFailure(error, "DURABLE_UNAVAILABLE", "launch_failed"),
    );
    assert.equal(await waitForSessionCount(db, (count) => count === 0), 0);

    await prepareDurable(db.ownerUrl);

    const ledger = await db.ownerPool.query<{ version: string }>(
      "SELECT version::text AS version FROM dbos.dbos_migrations ORDER BY version",
    );
    const versions = ledger.rows.map((row) => row.version);
    await db.ownerPool.query("DELETE FROM dbos.dbos_migrations");
    await assert.rejects(launchDurable(base), (error) =>
      assertDurableFailure(error, "DURABLE_UNAVAILABLE", "launch_failed"),
    );
    await db.ownerPool.query(
      "INSERT INTO dbos.dbos_migrations (version) SELECT unnest($1::bigint[])",
      [versions],
    );
    assert.equal(await waitForSessionCount(db, (count) => count === 0), 0);

    await db.ownerPool.query(
      "INSERT INTO dbos.queues (name, application_name) VALUES ('runs', 'other-app')",
    );
    try {
      await assert.rejects(launchDurable(base), (error) =>
        assertDurableFailure(error, "DURABLE_UNAVAILABLE", "queue_failed"),
      );
      assert.equal(await waitForSessionCount(db, (count) => count === 0), 0);

      const queues = await db.ownerPool.query<{ name: string; application_name: string }>(
        "SELECT name, application_name FROM dbos.queues ORDER BY name",
      );
      assert.deepEqual(
        queues.rows,
        [{ name: "runs", application_name: "other-app" }],
        "the failed launch leaves only the foreign queue row",
      );

      const workflows = await db.ownerPool.query<{ count: number }>(
        "SELECT count(*)::int AS count FROM dbos.workflow_status",
      );
      assert.equal(workflows.rows[0]?.count, 0, "a failed launch leaves no workflow row");
    } finally {
      await db.ownerPool.query("DELETE FROM dbos.queues WHERE name = 'runs'");
    }

    let launched: DurableRuntime | undefined;
    await assert.doesNotReject(async () => {
      launched = await launchDurable(base);
    });
    const rt = launched;
    assert.ok(rt !== undefined, "the launch after the foreign queue row was removed resolves");
    runtime = rt;

    await assert.rejects(launchDurable(base), (error) =>
      assertDurableFailure(error, "DURABLE_ALREADY_LAUNCHED", "running"),
    );

    await assert.doesNotReject(async () => {
      assert.equal(await rt.status("none"), null);
    });
  } finally {
    await runtime?.shutdown().catch(() => undefined);
    await db.close();
  }
});
