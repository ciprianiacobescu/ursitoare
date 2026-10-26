import type pg from "pg";

import { DbError } from "./errors.ts";
import { createDbHealthCheck, inspectRuntime } from "./health.ts";
import type { RuntimeState } from "./health.ts";
import { createPool } from "./pool.ts";
import type { EndpointLike } from "./pool.ts";

const OPEN_TIMEOUT_DEFAULT = 30000;
const OPEN_TIMEOUT_MAX = 600000;
const RETRY_MS = 500;

export interface Database {
  appPool: pg.Pool;
  close(): Promise<void>;
}

export interface OpenDeps {
  health: { registerHealthCheck(name: string, check: () => Promise<"ok" | "fail">): void };
  logger: { warn(obj: object, msg: string): void };
  openTimeoutMs?: number;
  sleep?: (ms: number) => Promise<void>;
  clock?: { now(): Date };
}

function unsafeReason(state: RuntimeState): string | null {
  if (state.rolsuper) return "superuser";
  if (state.rolbypassrls) return "bypassrls";
  if (state.owns_schema) return "owns_schema";
  if (state.owner_member) return "owner_member";
  if (state.privileged_member) return "privileged_member";
  return null;
}

function errorCode(err: unknown): string {
  const code = (err as { code?: unknown } | null)?.code;
  return typeof code === "string" ? code : "unknown";
}

export async function openDatabase(
  config: { database: { app: EndpointLike | null; owner: EndpointLike | null } },
  deps: OpenDeps,
): Promise<Database | null> {
  const { app, owner } = config.database;
  if (app === null) {
    if (owner !== null) {
      deps.logger.warn(
        { code: "DB_INVALID", reason: "owner_without_app" },
        "URSITOARE_DATABASE_OWNER_URL is set without URSITOARE_DATABASE_URL; database disabled",
      );
    }
    return null;
  }
  const timeoutMs = deps.openTimeoutMs ?? OPEN_TIMEOUT_DEFAULT;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 0 || timeoutMs > OPEN_TIMEOUT_MAX) {
    throw new DbError("DB_INVALID", "invalid open timeout", { reason: "bad_option" });
  }
  const sleep =
    deps.sleep ??
    ((ms: number) =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
      }));
  const clock = deps.clock ?? { now: () => new Date() };

  const pool = createPool(app, {
    onError: (err) => {
      deps.logger.warn({ code: errorCode(err) }, "database pool error");
    },
  });
  let closed = false;
  const close = async (): Promise<void> => {
    if (closed) return;
    closed = true;
    await pool.end();
  };

  const deadline = clock.now().getTime() + timeoutMs;
  let state: RuntimeState;
  for (;;) {
    try {
      state = await inspectRuntime(pool);
      break;
    } catch (err) {
      const remaining = deadline - clock.now().getTime();
      if (remaining <= 0) {
        await close().catch(() => undefined);
        throw new DbError("DB_UNAVAILABLE", "database unavailable", { reason: errorCode(err) });
      }
      await sleep(Math.min(RETRY_MS, remaining));
    }
  }

  const reason = unsafeReason(state);
  if (reason !== null) {
    await close().catch(() => undefined);
    throw new DbError("DB_ROLE_UNSAFE", "database role is unsafe", { reason });
  }
  if (!state.migrated) {
    deps.logger.warn(
      { code: "DB_UNAVAILABLE", reason: "not_migrated" },
      "database is not migrated; run the migrations",
    );
  }
  deps.health.registerHealthCheck("db", createDbHealthCheck(pool));
  return { appPool: pool, close };
}
