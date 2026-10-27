// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { KeyMaterial } from "./mac.ts";

export interface ChainReport {
  ok: boolean;
  checked: number;
  firstBadSeq?: bigint;
  reason?: "hash" | "gap" | "anchor";
}

export async function verifyChain(
  _pool: TenantPool,
  _ctx: TenantContext,
  _opts?: { fromSeq?: bigint; engineKey?: KeyMaterial; batchSize?: number },
): Promise<ChainReport> {
  throw new Error("not implemented");
}
