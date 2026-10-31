import type pg from "pg";

import type { DatabaseEndpoint } from "../config/index.ts";
import { ROLE_OWNER, createPool } from "../db/index.ts";
import { CliError } from "./errors.ts";

export interface OwnerConnection {
  pool: pg.Pool;
  close(): Promise<void>;
}

export function connectDefaultOwner(endpoint: DatabaseEndpoint): OwnerConnection {
  const pool = createPool(endpoint, { max: 4, applicationName: "ursitoare-cli" });
  return { pool, close: () => pool.end() };
}

export async function checkOwnerRole(pool: Pick<pg.Pool, "query">): Promise<void> {
  let result: pg.QueryResult<{ u: string }>;
  try {
    result = await pool.query<{ u: string }>("SELECT session_user AS u");
  } catch {
    throw new CliError(
      "CLI_DATABASE_UNAVAILABLE",
      "the database is unreachable with the owner credentials",
    );
  }
  if (result.rows[0]?.u !== ROLE_OWNER) {
    throw new CliError(
      "CLI_OWNER_ROLE_INVALID",
      "the owner variables must name the ursitoare_owner role",
    );
  }
}
