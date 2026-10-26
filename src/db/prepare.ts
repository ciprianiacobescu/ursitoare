import type pg from "pg";

import { migrate } from "./migrate.ts";
import { ensurePartitions } from "./partitions.ts";

export async function prepareDatabase(
  ownerPool: pg.Pool,
  clock: { now(): Date },
): Promise<{ applied: string[]; partitions: string[] }> {
  const { applied } = await migrate(ownerPool);
  const { created } = await ensurePartitions(ownerPool, clock);
  return { applied, partitions: created };
}
