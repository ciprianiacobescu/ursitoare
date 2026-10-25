// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export function prepareDatabase(_ownerPool: pg.Pool, _clock: { now(): Date }): Promise<{ applied: string[]; partitions: string[] }> {
  throw new Error("not implemented");
}
