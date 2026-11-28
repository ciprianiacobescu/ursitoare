import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import pg from "pg";

import type { Env } from "../../config/index.ts";
import { fixedClock, sequentialIds } from "../../core/index.ts";
import { freePort, startCluster } from "../../../test/support/pg.ts";
import type { Cluster } from "../../../test/support/pg.ts";
import { createCommandRegistry } from "../registry.ts";
import { runCli } from "../run.ts";
import { dbRolesCommand } from "./db-roles.ts";

interface Run {
  code: number;
  stdout: string;
  stderr: string;
}

const URL_VAR = "URSITOARE_DATABASE_ADMIN_URL";
const ADMIN_FILE_VAR = "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE";
const OWNER_FILE_VAR = "URSITOARE_DATABASE_OWNER_PASSWORD_FILE";
const APP_FILE_VAR = "URSITOARE_DATABASE_PASSWORD_FILE";

async function runRoles(env: Env): Promise<Run> {
  const registry = createCommandRegistry();
  registry.registerCommand("db-roles", dbRolesCommand);
  let stdout = "";
  let stderr = "";
  const code = await runCli(["db-roles"], {
    env,
    stdout: { write: (text) => void (stdout += text) },
    stderr: { write: (text) => void (stderr += text) },
    registry,
    clock: fixedClock("2026-11-25T10:00:00.000Z"),
    ids: sequentialIds(0),
  });
  return { code, stdout, stderr };
}

function adminPassword(cluster: Cluster): string {
  return decodeURIComponent(new URL(cluster.adminUrl).password);
}

function without(env: Env, key: string): Env {
  return Object.fromEntries(Object.entries(env).filter(([name]) => name !== key));
}

async function query<T extends pg.QueryResultRow>(
  cluster: Cluster,
  user: string,
  password: string,
  database: string,
  sql: string,
): Promise<T[]> {
  const client = new pg.Client({
    host: cluster.host,
    port: cluster.port,
    user,
    password,
    database,
  });
  await client.connect();
  try {
    return (await client.query<T>(sql)).rows;
  } finally {
    await client.end();
  }
}

test("C-21ae96cc db-roles fresh, repeat and dropped database", async () => {
  const cluster = await startCluster();
  const dir = await mkdtemp(join(tmpdir(), "db-roles-"));
  try {
    const admin = adminPassword(cluster);
    const adminFile = join(dir, "admin");
    const ownerFile = join(dir, "owner");
    const appFile = join(dir, "app");
    await writeFile(adminFile, `${admin}\n`);
    await writeFile(ownerFile, "OW\n");
    await writeFile(appFile, "AP\n");
    const env: Env = {
      [URL_VAR]: `postgres://postgres@127.0.0.1:${cluster.port}/ursitoare`,
      [ADMIN_FILE_VAR]: adminFile,
      [OWNER_FILE_VAR]: ownerFile,
      [APP_FILE_VAR]: appFile,
    };
    const outputs: string[] = [];
    const step = async (): Promise<Run> => {
      const result = await runRoles(env);
      outputs.push(result.stdout, result.stderr);
      return result;
    };
    const asAdmin = <T extends pg.QueryResultRow>(database: string, sql: string): Promise<T[]> =>
      query<T>(cluster, "postgres", admin, database, sql);

    assert.deepEqual(await step(), {
      code: 0,
      stdout: "database: created\nroles: created ursitoare_owner ursitoare_app\n",
      stderr: "",
    });
    const dbs = await asAdmin<{ datname: string }>(
      "postgres",
      "SELECT datname FROM pg_database WHERE datname = 'ursitoare'",
    );
    assert.equal(dbs.length, 1);
    const supers = await asAdmin<{ rolname: string; rolsuper: boolean }>(
      "postgres",
      "SELECT rolname, rolsuper FROM pg_roles WHERE rolname IN ('ursitoare_owner', 'ursitoare_app') ORDER BY rolname",
    );
    assert.deepEqual(
      supers.map((row) => [row.rolname, row.rolsuper]),
      [
        ["ursitoare_app", false],
        ["ursitoare_owner", false],
      ],
    );
    assert.equal(
      (await query<{ one: number }>(cluster, "ursitoare_owner", "OW", "ursitoare", "SELECT 1 AS one"))[0]?.one,
      1,
    );
    assert.equal(
      (await query<{ one: number }>(cluster, "ursitoare_app", "AP", "ursitoare", "SELECT 1 AS one"))[0]?.one,
      1,
    );
    const create = await asAdmin<{ ok: boolean }>(
      "postgres",
      "SELECT has_database_privilege('ursitoare_owner', 'ursitoare', 'CREATE') AS ok",
    );
    assert.equal(create[0]?.ok, true);

    assert.deepEqual(await step(), {
      code: 0,
      stdout: "database: present\nroles: updated\n",
      stderr: "",
    });

    await writeFile(ownerFile, "OW2\n");
    assert.deepEqual(await step(), {
      code: 0,
      stdout: "database: present\nroles: updated\n",
      stderr: "",
    });
    await assert.rejects(query(cluster, "ursitoare_owner", "OW", "ursitoare", "SELECT 1"), {
      code: "28P01",
    });
    assert.equal(
      (await query<{ one: number }>(cluster, "ursitoare_owner", "OW2", "ursitoare", "SELECT 1 AS one"))[0]?.one,
      1,
    );

    await asAdmin("postgres", "DROP DATABASE ursitoare WITH (FORCE)");
    assert.deepEqual(await step(), {
      code: 0,
      stdout: "database: created\nroles: updated\n",
      stderr: "",
    });
    assert.equal(
      (await query<{ one: number }>(cluster, "ursitoare_owner", "OW2", "ursitoare", "SELECT 1 AS one"))[0]?.one,
      1,
    );

    for (const text of outputs) {
      for (const secret of [admin, "OW", "OW2", "AP"]) {
        assert.ok(!text.includes(secret));
      }
    }
  } finally {
    await rm(dir, { recursive: true });
    await cluster.stop();
  }
});

test("C-f4a01e13 db-roles refusals", async () => {
  const cluster = await startCluster();
  const dir = await mkdtemp(join(tmpdir(), "db-roles-"));
  try {
    const admin = adminPassword(cluster);
    const adminFile = join(dir, "admin");
    const wrongFile = join(dir, "wrong");
    const ownerFile = join(dir, "owner");
    const appFile = join(dir, "app");
    const badAppFile = join(dir, "bad-app");
    await writeFile(adminFile, `${admin}\n`);
    await writeFile(wrongFile, "wrong-pw\n");
    await writeFile(ownerFile, "OW\n");
    await writeFile(appFile, "AP\n");
    await writeFile(badAppFile, "pwé\n");
    const url = `postgres://postgres@127.0.0.1:${cluster.port}/ursitoare`;
    const good: Env = {
      [URL_VAR]: url,
      [ADMIN_FILE_VAR]: adminFile,
      [OWNER_FILE_VAR]: ownerFile,
      [APP_FILE_VAR]: appFile,
    };
    const setup = await runRoles(good);
    assert.equal(setup.code, 0);

    const stderrs: string[] = [];
    const refuse = async (env: Env, stderr: string, stdout = ""): Promise<void> => {
      const result = await runRoles(env);
      stderrs.push(result.stderr);
      assert.deepEqual(result, { code: 1, stdout, stderr });
    };

    for (const name of [URL_VAR, ADMIN_FILE_VAR, OWNER_FILE_VAR, APP_FILE_VAR]) {
      await refuse(without(good, name), `CLI_DATABASE_ADMIN_REQUIRED: set ${name} for this command\n`);
    }
    await refuse(
      { ...good, [URL_VAR]: `postgres://postgres:pw-in-url@127.0.0.1:${cluster.port}/ursitoare` },
      `CLI_CONFIG_INVALID: ${URL_VAR}: must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full\n`,
    );
    await refuse(
      { ...good, [URL_VAR]: `postgres://postgres@127.0.0.1:${cluster.port}` },
      `CLI_CONFIG_INVALID: ${URL_VAR}: must name one database: up to 63 letters, digits, underscores or hyphens, not starting with a digit or hyphen\n`,
    );
    await refuse(
      { ...good, [ADMIN_FILE_VAR]: join(dir, "missing") },
      `CLI_CONFIG_INVALID: ${ADMIN_FILE_VAR}: file is missing, unreadable or empty\n`,
    );
    const unreachable = "CLI_DATABASE_UNAVAILABLE: the database is unreachable with the admin credentials\n";
    await refuse({ ...good, [ADMIN_FILE_VAR]: wrongFile }, unreachable);
    const dead = await freePort();
    await refuse({ ...good, [URL_VAR]: `postgres://postgres@127.0.0.1:${dead}/ursitoare` }, unreachable);
    await refuse(
      { ...good, [APP_FILE_VAR]: badAppFile },
      "CLI_ROLES_FAILED: could not bootstrap the database roles (DB_INVALID)\n",
      "database: present\n",
    );

    for (const text of stderrs) {
      assert.ok(!text.includes("pw-in-url") && !text.includes("wrong-pw"));
    }
  } finally {
    await rm(dir, { recursive: true });
    await cluster.stop();
  }
});
