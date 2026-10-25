// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export function createDbHealthCheck(_pool: Pick<pg.Pool, "query">, _opts?: { timeoutMs?: number }): () => Promise<"ok" | "fail"> {
  throw new Error("not implemented");
}
