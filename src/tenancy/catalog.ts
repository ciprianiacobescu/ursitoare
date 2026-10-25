// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export const CATALOG_GLOBAL_TABLES: readonly string[] = [];

export type CatalogRule =
  | "not_tenant_leading"
  | "unique_not_tenant_leading"
  | "fk_not_tenant_scoped"
  | "rls_not_enabled"
  | "rls_not_forced"
  | "no_tenant_policy"
  | "partition_open_to_app"
  | "view_open_to_app"
  | "route_table_open"
  | "definer_function_unsafe"
  | "app_role_missing"
  | "app_role_privileged"
  | "app_role_owns_relation";

export interface CatalogViolation {
  readonly rule: CatalogRule;
  readonly object: string;
}

export function checkTenancyCatalog(
  _db: Pick<pg.Pool, "query">,
  _opts?: { appRole?: string; ownerRole?: string },
): Promise<CatalogViolation[]> {
  throw new Error("not implemented");
}
