// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

import type { EndpointLike } from "./pool.ts";

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

export function openDatabase(
  _config: { database: { app: EndpointLike | null; owner: EndpointLike | null } },
  _deps: OpenDeps,
): Promise<Database | null> {
  throw new Error("not implemented");
}
