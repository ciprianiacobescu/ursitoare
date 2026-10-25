// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type ReviewProfile = "solo" | "team";

export interface TenantContext {
  readonly tenantId: string;
  readonly reviewProfile: ReviewProfile;
}

export const TENANT_ID_PATTERN: RegExp = /(?!)/;

export const ROUTE_KIND_PATTERN: RegExp = /(?!)/;

export const MAX_ROUTE_KEY_LENGTH: number = 0;

export function hashRouteKey(_key: string): Buffer {
  throw new Error("not implemented");
}

// Module-internal: exported from this file, not from index.ts.
export function assertTenantContext(_ctx: TenantContext): void {
  throw new Error("not implemented");
}
