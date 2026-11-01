// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import type { BlockBinding, BlockImport } from "./block-input.ts";

export interface BlockVersion {
  ref: string;
  def: BlockDef;
  binding: BlockBinding | null;
  contentHash: string;
  importedBy: string;
  importedAt: string;
}

export interface ImportReport {
  imported: string[];
  unchanged: string[];
}

export async function importCatalogue(
  _pool: TenantPool,
  _ctx: TenantContext,
  _blocks: { [ref: string]: BlockImport },
  _actor: { kind: "user" | "service" | "system"; id: string },
  _opts?: { clock?: Clock },
): Promise<ImportReport> {
  throw new Error("not implemented");
}

export async function getBlockVersion(
  _tx: TenantTx,
  _ctx: TenantContext,
  _ref: string,
): Promise<BlockVersion | null> {
  throw new Error("not implemented");
}

export async function listBlockVersions(
  _tx: TenantTx,
  _ctx: TenantContext,
  _q: { limit: number; after?: string | undefined },
): Promise<BlockVersion[]> {
  throw new Error("not implemented");
}
