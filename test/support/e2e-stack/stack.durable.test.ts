import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import pg from "pg";

import { resumeDurable } from "../../../src/durable/index.ts";
import { E2E_TEMPLATE, databaseApi } from "./database-part.ts";
import { discoverParts } from "./discover.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";
import type { E2eStack } from "./stack.ts";
import { startE2eStack } from "./stack.ts";

assert.equal(typeof startE2eStack, "function");

const tempRoots: string[] = [];

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The stack or the cluster may already have removed its own directory.
    }
  }
});

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-stack-durable-test-"));
  tempRoots.push(dir);
  return dir;
}

function workspace(): { dataDir: string } {
  const root = tempRoot();
  const dataDir = path.join(root, "data");
  mkdirSync(dataDir, { recursive: true });
  return { dataDir };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function ownerRows(
  url: string,
  text: string,
  values?: readonly unknown[],
): Promise<Record<string, unknown>[]> {
  const client = new pg.Client({
    connectionString: url,
    application_name: "e2e-durable-test",
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    const result = await client.query(text, values as unknown[] | undefined);
    return result.rows as Record<string, unknown>[];
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function durableSessionCount(ownerUrl: string): Promise<number> {
  const rows = await ownerRows(
    ownerUrl,
    "SELECT count(*)::int AS count FROM pg_stat_activity WHERE application_name = 'ursitoare-durable'",
  );
  const count = rows[0]?.["count"];
  return typeof count === "number" ? count : 0;
}

async function waitForNoDurableSessions(ownerUrl: string, timeoutMs = 5000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let count = await durableSessionCount(ownerUrl);
  while (count !== 0 && Date.now() < deadline) {
    await delay(20);
    count = await durableSessionCount(ownerUrl);
  }
  return count;
}

function wrapDatabasePart(
  part: E2eStackPart,
  record: (sessions: number) => void,
): E2eStackPart {
  return {
    ...part,
    start: async (ctx: PartContext): Promise<PartHandle> => {
      const handle = await part.start(ctx);
      const originalClose = handle.close.bind(handle);
      const api = handle.api as { ownerUrl?: unknown } | undefined;
      const ownerUrl = typeof api?.ownerUrl === "string" ? api.ownerUrl : undefined;
      handle.close = async (): Promise<void> => {
        if (ownerUrl !== undefined) {
          record(await waitForNoDurableSessions(ownerUrl));
        }
        await originalClose();
      };
      return handle;
    },
  };
}

function docsTesting(): string {
  return readFileSync(path.resolve(import.meta.dirname, "../../../docs/testing.md"), "utf8");
}

test("C-7732f592 three resets under the live engine then the close", async () => {
  let sessionsAtClose: number | undefined;
  {
    const { dataDir } = workspace();
    let stack: E2eStack | undefined;
    try {
      const parts = (await discoverParts()).map((part) =>
        part.name === "database"
          ? wrapDatabasePart(part, (sessions) => {
              sessionsAtClose = sessions;
            })
          : part,
      );
      stack = await startE2eStack({ port: 0, controlPort: 0, dataDir, parts });
      const api = databaseApi(stack.handles);
      const templateUrl = new URL(api.ownerUrl);
      templateUrl.pathname = `/${E2E_TEMPLATE}`;

      const before = await ownerRows(
        api.ownerUrl,
        "SELECT count(*)::int AS count FROM dbos.workflow_status",
      );
      assert.equal(before[0]?.["count"], 0, "before the first reset no workflow row exists");

      for (let run = 0; run < 3; run += 1) {
        const reset = await fetch(`${stack.controlUrl}/reset`, { method: "POST" });
        assert.equal(reset.status, 204, "each reset answers 204");

        const rows = await ownerRows(
          api.ownerUrl,
          "SELECT name, status, queue_name FROM dbos.workflow_status",
        );
        assert.equal(rows.length, 1, "each reset leaves exactly one workflow row");
        assert.deepEqual(rows[0], {
          name: "stack.ready",
          status: "SUCCESS",
          queue_name: "runs",
        });

        const queues = await ownerRows(api.ownerUrl, "SELECT name FROM dbos.queues");
        assert.ok(
          queues.some((row) => row["name"] === "runs"),
          "the runs queue is registered after the reset",
        );

        const template = await ownerRows(
          templateUrl.toString(),
          `SELECT to_regclass('"dbos"."dbos_migrations"') AS present`,
        );
        assert.notEqual(
          template[0]?.["present"],
          null,
          "the e2e template carries the dbos migrations",
        );

        const health = await fetch(`${stack.url}/health`);
        assert.equal(health.status, 200, "health is green after the reset");
        const body = (await health.json()) as { checks?: Record<string, string> };
        assert.deepEqual(body.checks, { db: "ok" }, "health checks exactly the database");
      }

      await stack.close();
      stack = undefined;
      assert.equal(sessionsAtClose, 0, "the wrapped database close saw no durable session");
      assert.equal(await resumeDurable(), null, "the runtime is gone after the close");
      assert.ok(
        docsTesting().includes("A reset discards every durable workflow"),
        "docs/testing.md carries the reset bullet",
      );
    } finally {
      await stack?.close().catch(() => undefined);
    }
  }

  {
    const { dataDir } = workspace();
    let stack: E2eStack | undefined;
    try {
      stack = await startE2eStack({ port: 0, controlPort: 0, dataDir });
      const api = databaseApi(stack.handles);
      const reset = await fetch(`${stack.controlUrl}/reset`, { method: "POST" });
      assert.equal(reset.status, 204, "the second boot answers 204");
      const rows = await ownerRows(
        api.ownerUrl,
        "SELECT name FROM dbos.workflow_status WHERE name = 'stack.ready'",
      );
      assert.equal(rows.length, 1, "the second boot runs one stack ready workflow");
    } finally {
      await stack?.close().catch(() => undefined);
    }
  }
});
