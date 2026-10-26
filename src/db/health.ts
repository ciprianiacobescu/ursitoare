import type pg from "pg";

import { DbError } from "./errors.ts";

const TIMEOUT_DEFAULT = 1500;
const TIMEOUT_MIN = 1;
const TIMEOUT_MAX = 60000;

export interface RuntimeState {
  migrated: boolean;
  rolsuper: boolean;
  rolbypassrls: boolean;
  owns_schema: boolean;
  owner_member: boolean;
  privileged_member: boolean;
}

const INSPECT_QUERY = `SELECT to_regnamespace('ursitoare') IS NOT NULL AS migrated,
       r.rolsuper,
       r.rolbypassrls,
       EXISTS (
         SELECT 1
           FROM pg_namespace n
          WHERE n.nspname = 'ursitoare'
            AND n.nspowner = r.oid
       ) AS owns_schema,
       EXISTS (
         SELECT 1
           FROM pg_roles o
          WHERE o.rolname = 'ursitoare_owner'
            AND o.oid <> r.oid
            AND pg_has_role(r.oid, o.oid, 'MEMBER')
       ) AS owner_member,
       EXISTS (
         SELECT 1
           FROM pg_roles p
          WHERE p.oid <> r.oid
            AND (p.rolsuper OR p.rolbypassrls)
            AND pg_has_role(r.oid, p.oid, 'MEMBER')
       ) AS privileged_member
  FROM pg_roles r
 WHERE r.rolname = current_user`;

function timeoutValue(opts: { timeoutMs?: number } | undefined): number {
  const value = opts?.timeoutMs;
  if (value === undefined) {
    return TIMEOUT_DEFAULT;
  }
  if (
    typeof value !== "number" ||
    !Number.isInteger(value) ||
    value < TIMEOUT_MIN ||
    value > TIMEOUT_MAX
  ) {
    throw new DbError("DB_INVALID", "invalid health check timeout", { reason: "bad_option" });
  }
  return value;
}

export async function inspectRuntime(pool: Pick<pg.Pool, "query">): Promise<RuntimeState> {
  const result = await pool.query<RuntimeState>(INSPECT_QUERY);
  const row = result.rows[0];
  if (row === undefined) {
    throw new DbError("DB_UNAVAILABLE", "database unavailable", { reason: "no_result" });
  }
  return row;
}

function healthy(state: RuntimeState): boolean {
  return (
    state.migrated &&
    !state.rolsuper &&
    !state.rolbypassrls &&
    !state.owns_schema &&
    !state.owner_member &&
    !state.privileged_member
  );
}

async function withTimeout<T>(work: Promise<T>, timeoutMs: number): Promise<T | undefined> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<undefined>((resolve) => {
    timer = setTimeout(() => {
      resolve(undefined);
    }, timeoutMs);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

export function createDbHealthCheck(
  pool: Pick<pg.Pool, "query">,
  opts?: { timeoutMs?: number },
): () => Promise<"ok" | "fail"> {
  const timeoutMs = timeoutValue(opts);
  return async () => {
    try {
      const state = await withTimeout(inspectRuntime(pool), timeoutMs);
      return state !== undefined && healthy(state) ? "ok" : "fail";
    } catch {
      return "fail";
    }
  };
}
