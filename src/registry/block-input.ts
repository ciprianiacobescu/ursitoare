// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef, JsonValue } from "../authoring/index.ts";

export type BlockBinding = { [key: string]: JsonValue };

export type BlockImport = BlockDef & { binding?: BlockBinding };

export interface NormalizedBlock {
  ref: string;
  def: BlockDef;
  binding: BlockBinding | null;
  contentHash: string;
}

export function normalizeBlockImport(_ref: unknown, _block: unknown): NormalizedBlock {
  throw new Error("not implemented");
}

export function blockContentHash(_def: BlockDef, _binding: BlockBinding | null): string {
  throw new Error("not implemented");
}
