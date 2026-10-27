import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import pg from "pg";

import { DEFAULT_MIGRATIONS_DIR, readMigrationFiles } from "../../../src/db/index.ts";
import { databaseApi, databasePart } from "./database-part.ts";
import { PARTS_DIR, discoverParts } from "./discover.ts";
import { E2eStackError } from "./part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";
import { createPartRegistry } from "./part.ts";

const tempRoots: string[] = [];

function tempRoot(): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "e2e-db-part-"));
  tempRoots.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempRoots) {
    try {
      rmSync(dir, { recursive: true, force: true });
    } catch {
      // The database part may already have removed its own directories.
    }
  }
});

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

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
}

function contextFor(
  dataDir: string,
  handles: ReadonlyMap<string, PartHandle> = new Map<string, PartHandle>(),
): PartContext {
  return {
    name: "database",
    dataDir,
    engineOrigin: "http://127.0.0.1:39080",
    controlOrigin: "http://127.0.0.1:39081",
    env: {},
    handles,
  };
}

function directoryNames(dir: string): string[] {
  try {
    return readdirSync(dir);
  } catch {
    return [];
  }
}

function clusterDirsUnder(root: string): string[] {
  return directoryNames(root)
    .filter((name) => name.startsWith("ursitoare-pg-"))
    .map((name) => path.join(root, name))
    .filter((dir) => existsSync(dir));
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

async function withClient<T>(url: string, run: (client: pg.Client) => Promise<T>): Promise<T> {
  const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 5000 });
  await client.connect();
  try {
    return await run(client);
  } finally {
    await client.end().catch(() => undefined);
  }
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

function writeText(dir: string, name: string, text: string): void {
  writeFileSync(path.join(dir, name), text);
}

function partSource(name: string): string {
  return `export const part = { name: ${JSON.stringify(name)}, start: async () => ({ env: {}, close: async () => {} }) };\n`;
}

test("C-c3092640 C-fe09bf7e the database part seeds the tenant and closes its cluster", async () => {
  assert.equal(typeof databaseApi, "function");

  const root = tempRoot();
  const dataDir = path.join(root, "database");
  mkdirSync(dataDir, { recursive: true });
  const restoreTmpDir = useTempDir(root);

  let started: PartHandle | undefined;
  try {
    const partHandle = await must(() => databasePart.start(contextFor(dataDir)));
    started = partHandle;
    const handles = new Map<string, PartHandle>([["database", partHandle]]);
    const seedContext = contextFor(dataDir, handles);

    const seed = databasePart.seed;
    assert.equal(typeof seed, "function", "the database part has a seed");
    await must(async () => {
      await seed?.call(databasePart, seedContext);
      await seed?.call(databasePart, seedContext);
    });

    const api = databaseApi(handles);
    assert.equal(api.host, "127.0.0.1");
    assert.equal(api.database, "ursitoare_e2e");
    assert.ok(api.port > 0, "the api names the cluster port");
    const ownerUrl = new URL(api.ownerUrl);
    assert.equal(ownerUrl.pathname, "/ursitoare_e2e");
    assert.equal(Number(ownerUrl.port), api.port);

    const missing = thrown(() => databaseApi(new Map<string, PartHandle>()));
    assert.ok(missing instanceof E2eStackError, `expected an E2eStackError, got ${String(missing)}`);
    assert.equal(missing.code, "STACK_PART_MISSING");

    const passwordPath = path.join(dataDir, "app-password");
    assert.equal(statSync(passwordPath).mode & 0o777, 0o600);
    assert.ok(readFileSync(passwordPath, "utf8").length > 0, "the password file is not empty");

    const roles = await withClient(api.ownerUrl, async (client) => {
      const result = await client.query<{
        rolname: string;
        rolsuper: boolean;
        rolbypassrls: boolean;
      }>(
        "SELECT rolname, rolsuper, rolbypassrls FROM pg_roles WHERE rolname = ANY($1::text[]) ORDER BY rolname",
        [["ursitoare_owner", "ursitoare_app"]],
      );
      return result.rows;
    });
    assert.deepEqual(
      roles.map((role) => role.rolname),
      ["ursitoare_app", "ursitoare_owner"],
    );
    for (const role of roles) {
      assert.equal(role.rolsuper, false, `${role.rolname} is not a superuser`);
      assert.equal(role.rolbypassrls, false, `${role.rolname} does not bypass RLS`);
    }

    const migrationFiles = await readMigrationFiles(DEFAULT_MIGRATIONS_DIR);
    assert.ok(migrationFiles.length > 0, "the default migrations directory has files");
    const ledger = await withClient(api.ownerUrl, async (client) => {
      const result = await client.query<{ version: number; name: string }>(
        "SELECT version, name FROM ursitoare.schema_migration ORDER BY version",
      );
      return result.rows;
    });
    assert.deepEqual(
      ledger.map((row) => row.version),
      migrationFiles.map((file) => file.version),
    );
    assert.deepEqual(
      ledger.map((row) => row.name),
      migrationFiles.map((file) => file.name),
    );

    const tenants = await withClient(api.ownerUrl, async (client) => {
      const result = await client.query<{
        tenant_id: string;
        name: string;
        review_profile: string;
      }>("SELECT tenant_id, name, review_profile FROM ursitoare.tenant");
      return result.rows;
    });
    assert.equal(tenants.length, 1, "the seed creates exactly one tenant");
    assert.deepEqual(tenants[0], {
      tenant_id: "ten_00000000-0000-7000-8000-000000000001",
      name: "E2E tenant",
      review_profile: "solo",
    });

    const clusterDirs = clusterDirsUnder(root);
    assert.equal(clusterDirs.length, 1, "the part starts one cluster under TMPDIR");
    const clusterDir = clusterDirs[0];
    assert.ok(clusterDir !== undefined);
    assert.ok(existsSync(path.join(clusterDir, "PG_VERSION")), "the cluster directory holds PG_VERSION");

    assert.ok(
      existsSync(path.join(PARTS_DIR, "10-database.ts")),
      "the shipped database part file exists",
    );
    const shipped = await discoverParts();
    assert.equal(shipped[0]?.name, "database", "the discovered parts start with the database");
    assert.ok(
      shipped.some((part) => part.name === "database"),
      "the database part is discovered",
    );

    await must(() => partHandle.close());
    await must(() => partHandle.close());

    const refused = await rejectionOf(async () => {
      const client = new pg.Client({
        host: "127.0.0.1",
        port: api.port,
        database: "ursitoare_e2e",
        user: "ursitoare_app",
        connectionTimeoutMillis: 2000,
      });
      try {
        await client.connect();
      } finally {
        await client.end().catch(() => undefined);
      }
    });
    assert.equal((refused as { code?: unknown } | null)?.code, "ECONNREFUSED");

    assert.equal(existsSync(clusterDir), false, "close removes the cluster directory");
    assert.deepEqual(filesNamedUnder(root, "postmaster.pid"), []);
  } finally {
    await started?.close().catch(() => undefined);
    restoreTmpDir();
  }
});

test("C-fe09bf7e a database start with a missing data directory rejects and leaves no cluster", async () => {
  const root = tempRoot();
  const restoreTmpDir = useTempDir(root);
  try {
    const missing = path.join(root, "missing");
    const error = await rejectionOf(() => databasePart.start(contextFor(missing)));
    assert.ok(error instanceof Error, `expected an error, got ${String(error)}`);
    const code = (error as { code?: unknown }).code;
    assert.ok(
      error instanceof E2eStackError || code === "ENOENT",
      `expected an E2eStackError or ENOENT, got ${String(error)}`,
    );
    assert.deepEqual(clusterDirsUnder(root), []);
    assert.deepEqual(filesNamedUnder(root, "postmaster.pid"), []);
  } finally {
    restoreTmpDir();
  }
});

test("C-89fc2527 the registry keeps order, returns a copy and rejects invalid or duplicate parts", () => {
  assert.ok(
    existsSync(path.join(PARTS_DIR, "10-database.ts")),
    "the shipped database part file exists",
  );

  const registry = createPartRegistry();
  const a: E2eStackPart = {
    name: "a",
    start: async () => ({ env: {}, close: async () => undefined }),
  };
  const b: E2eStackPart = {
    name: "b",
    start: async () => ({ env: {}, close: async () => undefined }),
  };

  registry.register(a);
  registry.register(b);

  const listed = registry.list();
  assert.deepEqual(
    listed.map((part) => part.name),
    ["a", "b"],
  );
  assert.notEqual(registry.list(), listed, "each list call returns a fresh array");
  listed.length = 0;
  assert.deepEqual(
    registry.list().map((part) => part.name),
    ["a", "b"],
    "mutating the returned list leaves the registry unchanged",
  );

  const invalid: E2eStackPart[] = [
    { ...a, name: "Bad Name" },
    { ...a, name: "engine" },
    { name: "start-string", start: "not a function" } as unknown as E2eStackPart,
  ];
  for (const part of invalid) {
    const error = thrown(() => registry.register(part));
    assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
    assert.equal(error.code, "STACK_PART_INVALID");
  }

  const duplicate = thrown(() => registry.register({ ...a }));
  assert.ok(duplicate instanceof E2eStackError, `expected an E2eStackError, got ${String(duplicate)}`);
  assert.equal(duplicate.code, "STACK_PART_DUPLICATE");
  assert.deepEqual(
    registry.list().map((part) => part.name),
    ["a", "b"],
    "the rejected registrations leave the list unchanged",
  );
});

test("C-71b5758c discovery returns parts in file-name order and never imports test files", async () => {
  assert.ok(
    existsSync(path.join(PARTS_DIR, "10-database.ts")),
    "the shipped database part file exists",
  );

  const dir = tempRoot();
  const marker = "__e2eDbPartDiscoveryMarker";
  const globals = globalThis as unknown as Record<string, unknown>;
  Reflect.deleteProperty(globals, marker);

  writeText(dir, "20-b.ts", partSource("b"));
  writeText(dir, "10-a.ts", partSource("a"));
  writeText(
    dir,
    "10-a.test.ts",
    `(globalThis as unknown as Record<string, unknown>)[${JSON.stringify(marker)}] = true;\nexport {};\n`,
  );
  writeText(dir, "notes.md", "not a part\n");

  await must(async () => {
    const parts = await discoverParts(dir);
    assert.deepEqual(
      parts.map((part) => part.name),
      ["a", "b"],
    );
    assert.equal(globals[marker], undefined, "the *.test.ts file must not be imported");
  });
});

test("C-4c698dd6 discovery rejects misnamed or invalid part files and a missing directory", async () => {
  assert.ok(
    existsSync(path.join(PARTS_DIR, "10-database.ts")),
    "the shipped database part file exists",
  );

  const cases: ReadonlyArray<{ file: string; source: string }> = [
    { file: "10-a.ts", source: "export const notPart = 1;\n" },
    { file: "10-a.ts", source: partSource("b") },
    { file: "database.ts", source: partSource("database") },
    { file: "1-a.ts", source: partSource("a") },
    { file: "10-Bad.ts", source: partSource("Bad") },
    {
      file: "10-a.ts",
      source: 'export const part = { name: "a", start: "not a function" };\n',
    },
  ];

  await must(async () => {
    for (const item of cases) {
      const dir = tempRoot();
      writeText(dir, item.file, item.source);
      const error = await rejectionOf(() => discoverParts(dir));
      assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
      assert.equal(error.code, "STACK_PART_INVALID");
      assert.equal(path.basename(String(error.details.file)), item.file);
    }

    const missingDir = path.join(tempRoot(), "missing");
    const missing = await rejectionOf(() => discoverParts(missingDir));
    assert.ok(missing instanceof E2eStackError, `expected an E2eStackError, got ${String(missing)}`);
    assert.equal(missing.code, "STACK_PART_INVALID");
    assert.equal(missing.details.file, missingDir);
  });
});

test("C-907d77a5 discovery rejects a repeated prefix or name naming the later file", async () => {
  assert.ok(
    existsSync(path.join(PARTS_DIR, "10-database.ts")),
    "the shipped database part file exists",
  );

  await must(async () => {
    const prefixDir = tempRoot();
    writeText(prefixDir, "10-a.ts", partSource("a"));
    writeText(prefixDir, "10-b.ts", partSource("b"));
    const prefix = await rejectionOf(() => discoverParts(prefixDir));
    assert.ok(prefix instanceof E2eStackError, `expected an E2eStackError, got ${String(prefix)}`);
    assert.equal(prefix.code, "STACK_PART_DUPLICATE");
    assert.equal(path.basename(String(prefix.details.file)), "10-b.ts");

    const nameDir = tempRoot();
    writeText(nameDir, "10-a.ts", partSource("a"));
    writeText(nameDir, "20-a.ts", partSource("a"));
    const name = await rejectionOf(() => discoverParts(nameDir));
    assert.ok(name instanceof E2eStackError, `expected an E2eStackError, got ${String(name)}`);
    assert.equal(name.code, "STACK_PART_DUPLICATE");
    assert.equal(path.basename(String(name.details.file)), "20-a.ts");
  });
});
