import { readFileSync } from "node:fs";

import type pg from "pg";

import { loadAdminDatabase, readSecretValue } from "../../config/index.ts";
import type { DatabaseEndpoint } from "../../config/index.ts";
import { DbError, createPool, ensureRoles } from "../../db/index.ts";
import { CliError } from "../errors.ts";
import type { CliCommand } from "../registry.ts";

const URL_VARIABLE = "URSITOARE_DATABASE_ADMIN_URL";
const ADMIN_FILE_VARIABLE = "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE";
const OWNER_FILE_VARIABLE = "URSITOARE_DATABASE_OWNER_PASSWORD_FILE";
const APP_FILE_VARIABLE = "URSITOARE_DATABASE_PASSWORD_FILE";
const REQUIRED = [URL_VARIABLE, ADMIN_FILE_VARIABLE, OWNER_FILE_VARIABLE, APP_FILE_VARIABLE] as const;
const DUPLICATE_DATABASE = "42P04";

const readFile = (path: string): string => readFileSync(path, "utf8");

function sqlState(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) {
    return undefined;
  }
  const candidate = error as { code?: unknown; severity?: unknown };
  if (typeof candidate.code === "string" && typeof candidate.severity === "string") {
    return candidate.code;
  }
  return undefined;
}

function unreachable(error: unknown): boolean {
  if (error instanceof DbError) {
    return error.code === "DB_UNAVAILABLE";
  }
  const state = sqlState(error);
  return state === undefined || state.startsWith("08") || state.startsWith("28");
}

function unavailable(): CliError {
  return new CliError("CLI_DATABASE_UNAVAILABLE", "the database is unreachable with the admin credentials");
}

function endpointFor(admin: DatabaseEndpoint, database: string): DatabaseEndpoint {
  const url = new URL(admin.url);
  url.pathname = `/${encodeURIComponent(database)}`;
  return { url: url.toString(), password: admin.password };
}

async function ensureDatabase(admin: DatabaseEndpoint, name: string): Promise<"created" | "present"> {
  const pool = createPool(endpointFor(admin, "postgres"), { max: 1, applicationName: "ursitoare-cli" });
  try {
    const found = await pool.query("SELECT 1 FROM pg_database WHERE datname = $1", [name]);
    if (found.rowCount !== 0) {
      return "present";
    }
    try {
      const statement = await pool.query<{ sql: string }>("SELECT format('CREATE DATABASE %I', $1::text) AS sql", [
        name,
      ]);
      await pool.query(statement.rows[0]?.sql ?? "");
    } catch (error) {
      if (sqlState(error) === DUPLICATE_DATABASE) {
        return "present";
      }
      throw error;
    }
    return "created";
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export const dbRolesCommand: CliCommand = {
  summary: "create the engine database and the two database roles",
  options: {},
  database: false,
  async run(call) {
    for (const variable of REQUIRED) {
      const value = call.env[variable];
      if (value === undefined || value === "") {
        throw new CliError("CLI_DATABASE_ADMIN_REQUIRED", `set ${variable} for this command`);
      }
    }
    const admin = loadAdminDatabase(call.env);
    const ownerPassword = readSecretValue(
      OWNER_FILE_VARIABLE,
      call.env[OWNER_FILE_VARIABLE] ?? "",
      readFile,
    );
    const appPassword = readSecretValue(APP_FILE_VARIABLE, call.env[APP_FILE_VARIABLE] ?? "", readFile);
    const database = decodeURIComponent(new URL(admin.url).pathname.slice(1));

    let state: "created" | "present";
    try {
      state = await ensureDatabase(admin, database);
    } catch (error) {
      if (unreachable(error)) {
        throw unavailable();
      }
      throw new CliError("CLI_ROLES_FAILED", "could not create the engine database");
    }
    call.stdout.write(`database: ${state}\n`);

    const pool: pg.Pool = createPool(admin, { max: 2, applicationName: "ursitoare-cli" });
    try {
      const { created } = await ensureRoles(pool, { ownerPassword, appPassword });
      call.stdout.write(`roles: ${created.length === 0 ? "updated" : `created ${created.join(" ")}`}\n`);
      return 0;
    } catch (error) {
      if (unreachable(error)) {
        throw unavailable();
      }
      const code = error instanceof DbError ? error.code : "DB_ROLES_FAILED";
      throw new CliError("CLI_ROLES_FAILED", `could not bootstrap the database roles (${code})`);
    } finally {
      await pool.end().catch(() => undefined);
    }
  },
};
