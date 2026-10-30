import assert from "node:assert/strict";
import dns from "node:dns";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { createConnection, isIP } from "node:net";
import os from "node:os";
import path from "node:path";
import { after, mock, test } from "node:test";

import pg from "pg";

import { databaseApi } from "./database-part.ts";
import type { E2eStack } from "./stack.ts";
import { startE2eStack } from "./stack.ts";

assert.equal(typeof startE2eStack, "function");

const tempRoots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-stack-db-test-"));
  tempRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The stack or the cluster may already have removed its own directory.
    }
  }
});

interface Workspace {
  root: string;
  dataDir: string;
  tmpDir: string;
}

function workspace(): Workspace {
  const root = tempRoot();
  const dataDir = path.join(root, "data");
  const tmpDir = path.join(root, "tmp");
  mkdirSync(dataDir, { recursive: true });
  mkdirSync(tmpDir, { recursive: true });
  return { root, dataDir, tmpDir };
}

function useTempDir(dir: string): () => void {
  const previous = process.env.TMPDIR;
  process.env.TMPDIR = dir;
  return () => {
    if (previous === undefined) {
      delete process.env.TMPDIR;
      return;
    }
    process.env.TMPDIR = previous;
  };
}

function stackDirs(root: string): string[] {
  try {
    return readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith("ursitoare-e2e-"))
      .map((entry) => path.join(root, entry.name));
  } catch {
    return [];
  }
}

function dirsWithPgVersion(root: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (existsSync(path.join(full, "PG_VERSION"))) {
        found.push(full);
      }
      walk(full);
    }
  };
  if (existsSync(root)) {
    walk(root);
  }
  return found;
}

function filesNamedUnder(root: string, name: string): string[] {
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name === name) {
        found.push(full);
      }
    }
  };
  if (existsSync(root)) {
    walk(root);
  }
  return found;
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

interface Health {
  status: number;
  text: string;
  body: { status?: string; checks?: Record<string, string> };
}

interface RunningStack {
  stack: E2eStack;
  health: Health;
}

// Every test starts here: the shipped parts must supply the database before any query runs.
async function startStack(dataDir: string): Promise<RunningStack> {
  const stack = await startE2eStack({ port: 0, controlPort: 0, dataDir });
  try {
    assert.equal(
      stack.handles.has("database"),
      true,
      "the stack starts the shipped database part",
    );
    const response = await fetch(`${stack.url}/health`);
    const text = await response.text();
    const body = JSON.parse(text) as { status?: string; checks?: Record<string, string> };
    assert.equal(response.status, 200, "the engine health answers 200");
    assert.equal(body.status, "ok", "the engine health reports ok");
    assert.deepEqual(body.checks, { db: "ok" }, "the engine health checks the database");
    return { stack, health: { status: response.status, text, body } };
  } catch (error) {
    await stack.close().catch(() => undefined);
    throw error;
  }
}

async function ownerRows(
  url: string,
  text: string,
  values?: readonly unknown[],
): Promise<Record<string, unknown>[]> {
  const client = new pg.Client({
    connectionString: url,
    application_name: "e2e-test",
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

test("C-d194233f the stack health reports the migrated database, its tenant and its app sessions", async () => {
  const { dataDir, tmpDir } = workspace();
  const restoreTmpDir = useTempDir(tmpDir);
  let stack: E2eStack | undefined;

  try {
    const started = await startStack(dataDir);
    stack = started.stack;
    const api = databaseApi(stack.handles);

    const versions = await ownerRows(api.ownerUrl, "SHOW server_version");
    const version = versions[0];
    assert.ok(version !== undefined, "server_version was returned");
    assert.equal(
      String(version["server_version"]).startsWith("18.4"),
      true,
      "the cluster is Postgres 18.4",
    );

    const tenants = await ownerRows(
      api.ownerUrl,
      "SELECT tenant_id, name, review_profile FROM ursitoare.tenant",
    );
    assert.equal(tenants.length, 2, "the seed created the default tenant and tenant B");
    const defaultTenant = tenants.find((row) => row["name"] === "E2E tenant");
    assert.ok(defaultTenant !== undefined, "the default tenant row was returned");
    assert.equal(defaultTenant["review_profile"], "solo", "the seeded default tenant is on the solo profile");
    const tenantB = tenants.find((row) => row["name"] === "Tenant B");
    assert.ok(tenantB !== undefined, "the tenant B row was returned");
    assert.equal(tenantB["review_profile"], "solo", "the seeded tenant B is on the solo profile");

    const sessions = await ownerRows(
      api.ownerUrl,
      "SELECT usename, application_name FROM pg_stat_activity WHERE datname = $1 AND application_name NOT IN ('e2e-stack', 'e2e-test')",
      ["ursitoare_e2e"],
    );
    assert.ok(sessions.length > 0, "the engine holds a session on the e2e database");
    for (const session of sessions) {
      assert.equal(session["usename"], "ursitoare_app", "every engine session uses the app role");
    }
  } finally {
    await stack?.close().catch(() => undefined);
    restoreTmpDir();
  }
});

test("C-dd21514e the engine key and database password are private files that never reach health", async () => {
  const { dataDir, tmpDir } = workspace();
  const restoreTmpDir = useTempDir(tmpDir);
  let stack: E2eStack | undefined;

  try {
    const started = await startStack(dataDir);
    stack = started.stack;
    const stackDir = stackDirs(dataDir)[0];
    assert.ok(stackDir !== undefined, "the stack created its directory");

    const keyPath = path.join(stackDir, "engine", "engine.key");
    const key = readFileSync(keyPath, "utf8").trim();
    assert.equal(/^[0-9a-f]{64}$/.test(key), true, "the engine key is 64 hex characters");
    assert.equal(statSync(keyPath).mode & 0o777, 0o600, "the engine key file is 0600");

    const passwordPath = path.join(stackDir, "database", "app-password");
    const password = readFileSync(passwordPath, "utf8").trim();
    assert.ok(password.length > 0, "the app password file is not empty");
    assert.equal(statSync(passwordPath).mode & 0o777, 0o600, "the app password file is 0600");

    assert.equal(
      started.health.text.includes(key),
      false,
      "the engine key never appears in the health body",
    );
    assert.equal(
      started.health.text.includes(password),
      false,
      "the app password never appears in the health body",
    );
  } finally {
    await stack?.close().catch(() => undefined);
    restoreTmpDir();
  }
});

test("C-f55456d0 reset restores the seeded tenant, drops probe state and clears faults", async () => {
  const { dataDir, tmpDir } = workspace();
  const restoreTmpDir = useTempDir(tmpDir);
  let stack: E2eStack | undefined;

  try {
    const started = await startStack(dataDir);
    stack = started.stack;
    const api = databaseApi(stack.handles);
    const controlUrl = stack.controlUrl;

    const before = await ownerRows(api.ownerUrl, "SELECT tenant_id FROM ursitoare.tenant");
    assert.equal(before.length, 2, "the seed created the default tenant and tenant B before the probe");
    const seededIds = before
      .map((row) => row["tenant_id"])
      .filter((id): id is string => typeof id === "string")
      .sort();
    assert.equal(seededIds.length, 2, "both seeded tenant ids were read");

    await ownerRows(api.ownerUrl, "CREATE TABLE ursitoare.e2e_probe (id integer)");
    await ownerRows(
      api.ownerUrl,
      "INSERT INTO ursitoare.tenant (tenant_id, name) VALUES ($1, $2)",
      ["ten_00000000-0000-7000-8000-000000000002", "Second tenant"],
    );

    const posted = await fetch(`${controlUrl}/faults`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ method: "GET", url: "/health", status: 503 }),
    });
    assert.equal(posted.status, 204, "the fault was accepted");

    const faulted = await fetch(`${stack.url}/health`);
    const faultedBody = (await faulted.json()) as { error?: { code?: string } };
    assert.equal(faulted.status, 503, "the fault fails the engine health");
    assert.equal(faultedBody.error?.code, "FAULT_INJECTED", "the fault is reported");

    const healthStatuses: number[] = [];
    for (let run = 0; run < 3; run += 1) {
      const reset = await fetch(`${controlUrl}/reset`, { method: "POST" });
      assert.equal(reset.status, 204, "each reset answers 204");

      const health = await fetch(`${stack.url}/health`);
      const healthBody = (await health.json()) as {
        status?: string;
        checks?: Record<string, string>;
      };
      assert.equal(health.status, 200, "health is green after each reset");
      assert.equal(healthBody.status, "ok", "health reports ok after each reset");
      assert.deepEqual(healthBody.checks, { db: "ok" }, "health checks the database after each reset");
      healthStatuses.push(health.status);
    }
    assert.deepEqual(healthStatuses, [200, 200, 200], "three resets each leave health green");

    const probe = await ownerRows(api.ownerUrl, "SELECT to_regclass('ursitoare.e2e_probe') AS probe");
    assert.equal(probe[0]?.["probe"], null, "the reset dropped the probe table");

    const after = await ownerRows(api.ownerUrl, "SELECT tenant_id FROM ursitoare.tenant");
    assert.equal(after.length, 2, "the reset left the seeded default tenant and tenant B");
    const afterIds = after
      .map((row) => row["tenant_id"])
      .filter((id): id is string => typeof id === "string")
      .sort();
    assert.deepEqual(afterIds, seededIds, "the reset restored the same seeded tenants");

    const healthy = await fetch(`${stack.url}/health`);
    assert.equal(healthy.status, 200, "the fault no longer applies after reset");
  } finally {
    await stack?.close().catch(() => undefined);
    restoreTmpDir();
  }
});

test("C-fe09bf7e closing the stack stops Postgres and removes its cluster directory", async () => {
  const { dataDir, tmpDir } = workspace();
  const restoreTmpDir = useTempDir(tmpDir);
  let stack: E2eStack | undefined;

  try {
    const started = await startStack(dataDir);
    stack = started.stack;
    const api = databaseApi(stack.handles);

    const clusterDirs = dirsWithPgVersion(tmpDir).filter((dir) => path.dirname(dir) === tmpDir);
    assert.equal(clusterDirs.length, 1, "one cluster directory holds PG_VERSION while the stack runs");
    const clusterDir = clusterDirs[0];
    assert.ok(clusterDir !== undefined, "the cluster directory was found");

    await stack.close();
    stack = undefined;

    assert.equal(await connectionRefused(api.port), true, "the Postgres port refuses connections");
    assert.equal(existsSync(clusterDir), false, "the cluster directory is gone");
    assert.deepEqual(filesNamedUnder(tmpDir, "postmaster.pid"), [], "no postmaster.pid remains");
    assert.deepEqual(stackDirs(dataDir), [], "the stack directory is gone");
  } finally {
    await stack?.close().catch(() => undefined);
    restoreTmpDir();
  }
});

test("C-23b4de23 a stack starts, resets and closes without a DNS lookup of a name", async () => {
  const { dataDir, tmpDir } = workspace();
  const restoreTmpDir = useTempDir(tmpDir);
  const realLookup = dns.lookup;
  const realPromisesLookup = dns.promises.lookup;
  const lookedUp: string[] = [];
  let promisesLookups = 0;

  const lookupSpy = mock.method(
    dns,
    "lookup",
    function (this: unknown, hostname: string, ...args: unknown[]): unknown {
      lookedUp.push(String(hostname));
      return (realLookup as (...callArgs: unknown[]) => unknown).apply(dns, [hostname, ...args]);
    } as unknown as typeof dns.lookup,
  );
  const promisesSpy = mock.method(
    dns.promises,
    "lookup",
    function (this: unknown, hostname: string, ...args: unknown[]): unknown {
      promisesLookups += 1;
      return (realPromisesLookup as (...callArgs: unknown[]) => unknown).apply(dns.promises, [
        hostname,
        ...args,
      ]);
    } as unknown as typeof dns.promises.lookup,
  );

  let stack: E2eStack | undefined;
  try {
    const started = await startStack(dataDir);
    stack = started.stack;

    const reset = await fetch(`${stack.controlUrl}/reset`, { method: "POST" });
    assert.equal(reset.status, 204, "a reset runs on the offline stack");

    await stack.close();
    stack = undefined;
  } finally {
    await stack?.close().catch(() => undefined);
    lookupSpy.mock.restore();
    promisesSpy.mock.restore();
    restoreTmpDir();
  }

  assert.ok(lookedUp.length > 0, "the stack performed lookups that were recorded");
  assert.deepEqual(
    lookedUp.filter((host) => isIP(host) === 0),
    [],
    "every recorded dns.lookup call resolves an IP literal",
  );
  assert.equal(promisesLookups, 0, "the stack never calls dns.promises.lookup");
});
