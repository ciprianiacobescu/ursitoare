// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

import type { TenantContext } from "./context.ts";

export type TenantPool = Pick<pg.Pool, "connect">;

export type TenantTx = Pick<pg.PoolClient, "query">;

export function withTenantTx<T>(_pool: TenantPool, _ctx: TenantContext, _fn: (tx: TenantTx) => Promise<T>): Promise<T> {
  throw new Error("not implemented");
}

// Module-internal: exported from this file, not from index.ts.
export function inTransaction<T>(_pool: TenantPool, _fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  throw new Error("not implemented");
}
