// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export function ensurePartitions(
  _ownerPool: pg.Pool,
  _clock: { now(): Date },
  _opts?: { monthsBack?: number; monthsAhead?: number },
): Promise<{ created: string[]; skipped: string[] }> {
  throw new Error("not implemented");
}
