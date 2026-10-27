// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PartHandle } from "./part.ts";

export const SEED_PATH: string = "";

export interface SeedSource {
  seedData(): Readonly<Record<string, unknown>>;
}

export function collectSeedData(_handles: ReadonlyMap<string, PartHandle>): Record<string, unknown> {
  throw new Error("not implemented");
}
