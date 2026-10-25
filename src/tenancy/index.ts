// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type { TenancyErrorCode } from "./errors.ts";
export { TenancyError } from "./errors.ts";
export type { ReviewProfile, TenantContext } from "./context.ts";
export { TENANT_ID_PATTERN, ROUTE_KIND_PATTERN, MAX_ROUTE_KEY_LENGTH, hashRouteKey } from "./context.ts";
export type { TenantPool, TenantTx } from "./tx.ts";
export { withTenantTx } from "./tx.ts";
export type { EnsureTenantOptions } from "./bootstrap.ts";
export { ensureDefaultTenant } from "./bootstrap.ts";
export type { RouteRegistration } from "./routes.ts";
export { registerTenantRoute, unregisterTenantRoute, resolveTenantBy } from "./routes.ts";
export type { CatalogRule, CatalogViolation } from "./catalog.ts";
export { CATALOG_GLOBAL_TABLES, checkTenancyCatalog } from "./catalog.ts";
