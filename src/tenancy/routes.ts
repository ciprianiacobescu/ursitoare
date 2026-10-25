// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { TenantContext } from "./context.ts";
import type { TenantPool, TenantTx } from "./tx.ts";

export type RouteRegistration = "created" | "exists";

export function registerTenantRoute(_tx: TenantTx, _kind: string, _key: string): Promise<RouteRegistration> {
  throw new Error("not implemented");
}

export function unregisterTenantRoute(_tx: TenantTx, _kind: string, _key: string): Promise<boolean> {
  throw new Error("not implemented");
}

export function resolveTenantBy(_pool: TenantPool, _kind: string, _key: string): Promise<TenantContext | null> {
  throw new Error("not implemented");
}
