// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { Clock, IdSource } from "../core/index.ts";
import type { TenantContext } from "./context.ts";
import type { TenantPool } from "./tx.ts";

export interface EnsureTenantOptions {
  ids?: IdSource;
  clock?: Clock;
}

export function ensureDefaultTenant(_pool: TenantPool, _name: string, _opts?: EnsureTenantOptions): Promise<TenantContext> {
  throw new Error("not implemented");
}
