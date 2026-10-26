import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { DbError, readMigrationFiles } from "./index.ts";

async function makeDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "ursitoare-migrations-"));
}

function sha256(bytes: string): string {
  return createHash("sha256").update(bytes).digest("hex");
}

async function resolved<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    assert.fail(`expected the call to resolve: ${String(error)}`);
  }
}

async function expectInvalid(dir: string, file: string, reason: string): Promise<void> {
  await assert.rejects(
    async () => readMigrationFiles(dir),
    (error: unknown) => {
      assert.ok(error instanceof DbError, "throws a DbError");
      assert.equal(error.code, "MIGRATION_INVALID_NAME");
      assert.equal(error.details.file, file);
      assert.equal(error.details.reason, reason);
      return true;
    },
  );
}

async function expectFailed(dir: string, reason: string): Promise<void> {
  await assert.rejects(
    async () => readMigrationFiles(dir),
    (error: unknown) => {
      assert.ok(error instanceof DbError, "throws a DbError");
      assert.equal(error.code, "MIGRATION_FAILED");
      assert.equal(error.details.reason, reason);
      return true;
    },
  );
}

test("C-8a52d337 readMigrationFiles sorts valid files and hashes their bytes", async () => {
  const dir = await makeDir();
  const firstSql = "CREATE TABLE a (id integer);\n";
  const secondSql = "-- second\nCREATE TABLE b (id integer);\n";

  try {
    await writeFile(join(dir, "0002_b.sql"), secondSql);
    await writeFile(join(dir, "0001_a.sql"), firstSql);

    const files = await resolved(() => readMigrationFiles(dir));

    assert.deepEqual(
      files.map((file) => file.version),
      [1, 2],
    );
    assert.deepEqual(
      files.map((file) => file.name),
      ["a", "b"],
    );
    assert.deepEqual(
      files.map((file) => file.file),
      ["0001_a.sql", "0002_b.sql"],
    );
    assert.equal(files[0]?.sql, firstSql);
    assert.equal(files[1]?.sql, secondSql);
    assert.equal(files[0]?.checksum, sha256(firstSql));
    assert.equal(files[1]?.checksum, sha256(secondSql));
    assert.match(files[0]?.checksum ?? "", /^[0-9a-f]{64}$/);
    assert.match(files[1]?.checksum ?? "", /^[0-9a-f]{64}$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-8a52d337 readMigrationFiles allows gaps and returns an empty list for an empty directory", async () => {
  const dir = await makeDir();

  try {
    const empty = await resolved(() => readMigrationFiles(dir));
    assert.deepEqual(empty, []);

    await writeFile(join(dir, "0003_c.sql"), "SELECT 3;");
    await writeFile(join(dir, "0001_a.sql"), "SELECT 1;");

    const files = await resolved(() => readMigrationFiles(dir));

    assert.deepEqual(
      files.map((file) => file.version),
      [1, 3],
    );
    assert.deepEqual(
      files.map((file) => file.file),
      ["0001_a.sql", "0003_c.sql"],
    );
    assert.equal(files[0]?.checksum, sha256("SELECT 1;"));
    assert.equal(files[1]?.checksum, sha256("SELECT 3;"));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-55276583 readMigrationFiles refuses duplicate versions", async () => {
  const dir = await makeDir();

  try {
    await writeFile(join(dir, "0001_a.sql"), "SELECT 1;");
    await writeFile(join(dir, "0001_b.sql"), "SELECT 2;");

    await assert.rejects(
      async () => readMigrationFiles(dir),
      (error: unknown) => {
        assert.ok(error instanceof DbError, "throws a DbError");
        assert.equal(error.code, "MIGRATION_INVALID_NAME");
        assert.equal(error.details.reason, "duplicate_version");
        assert.ok(
          error.details.file === "0001_a.sql" || error.details.file === "0001_b.sql",
          "names one of the duplicated files",
        );
        return true;
      },
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-55276583 readMigrationFiles refuses badly named entries", async () => {
  for (const name of ["1_a.sql", "0002_A.sql", "0002_a.SQL", "README.md"]) {
    const dir = await makeDir();

    try {
      await writeFile(join(dir, "0001_a.sql"), "SELECT 1;");
      await writeFile(join(dir, name), "SELECT 2;");

      await expectInvalid(dir, name, "bad_name");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test("C-55276583 readMigrationFiles refuses version zero and non-file entries", async () => {
  const zeroDir = await makeDir();
  try {
    await writeFile(join(zeroDir, "0000_z.sql"), "SELECT 0;");
    await expectInvalid(zeroDir, "0000_z.sql", "bad_name");
  } finally {
    await rm(zeroDir, { recursive: true, force: true });
  }

  const subdir = await makeDir();
  try {
    await writeFile(join(subdir, "0001_a.sql"), "SELECT 1;");
    await mkdir(join(subdir, "0002_d.sql"));
    await expectInvalid(subdir, "0002_d.sql", "not_regular_file");
  } finally {
    await rm(subdir, { recursive: true, force: true });
  }
});

test("C-6a2a3916 readMigrationFiles refuses an empty file", async () => {
  const dir = await makeDir();

  try {
    await writeFile(join(dir, "0001_a.sql"), "");

    await expectFailed(dir, "empty");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-6a2a3916 readMigrationFiles refuses transaction control lines", async () => {
  for (const line of ["commit;", "COMMIT;", "  BEGIN;  ", "Rollback;", "start transaction;"]) {
    const dir = await makeDir();

    try {
      await writeFile(join(dir, "0001_a.sql"), `-- before\n${line}\n-- after\n`);

      await expectFailed(dir, "transaction_control");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  }
});

test("C-6a2a3916 readMigrationFiles refuses a directory that does not exist", async () => {
  const dir = await makeDir();
  await rm(dir, { recursive: true, force: true });

  await expectFailed(dir, "directory_unreadable");
});
