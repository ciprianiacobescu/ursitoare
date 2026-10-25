// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export function migrate(_pool: pg.Pool, _dir?: string, _opts?: { lockTimeoutMs?: number }): Promise<{ applied: string[] }> {
  throw new Error("not implemented");
}
