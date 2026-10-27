import { createHash } from "node:crypto";

import { TenancyError } from "./errors.ts";

export type ReviewProfile = "solo" | "team";

export interface TenantContext {
  readonly tenantId: string;
  readonly reviewProfile: ReviewProfile;
}

export const TENANT_ID_PATTERN: RegExp = /^[A-Za-z0-9_-]{1,64}$/;

export const ROUTE_KIND_PATTERN: RegExp = /^[a-z][a-z0-9_]{0,31}$/;

export const MAX_ROUTE_KEY_LENGTH: number = 4096;

export function hashRouteKey(key: string): Buffer {
  if (key.length === 0 || !key.isWellFormed() || key.length > MAX_ROUTE_KEY_LENGTH) {
    throw new TenancyError("TENANT_INVALID", "invalid route key");
  }
  return createHash("sha256").update(Buffer.from(key, "utf8")).digest();
}

// Module-internal: exported from this file, not from index.ts.
export function assertTenantContext(ctx: TenantContext): void {
  if (
    typeof ctx.tenantId !== "string" ||
    !TENANT_ID_PATTERN.test(ctx.tenantId) ||
    (ctx.reviewProfile !== "solo" && ctx.reviewProfile !== "team")
  ) {
    throw new TenancyError("TENANT_INVALID", "invalid tenant context");
  }
}
