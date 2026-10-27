// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { AppendOptions } from "./append.ts";
import type { KeyMaterial } from "./mac.ts";

export interface Anchor {
  tenantId: string;
  seq: bigint;
  hash: string;
  mac: string;
  at: Date;
}

export async function anchorHead(
  _pool: TenantPool,
  _ctx: TenantContext,
  _engineKey: KeyMaterial,
  _opts?: AppendOptions,
): Promise<Anchor> {
  throw new Error("not implemented");
}
