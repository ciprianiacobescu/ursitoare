import type { QueryResultRow } from "pg";

import { type ReviewProfile, hashRouteKey, ROUTE_KIND_PATTERN, type TenantContext } from "./context.ts";
import { TenancyError } from "./errors.ts";
import { inTransaction, type TenantPool, type TenantTx } from "./tx.ts";

export type RouteRegistration = "created" | "exists";

const SQLSTATE_PATTERN = /^[0-9A-Z]{5}$/;

const SQLSTATE_ERRORS: Readonly<Record<string, { code: TenancyError["code"]; message: string }>> = {
  U0001: { code: "TENANT_CONTEXT_MISSING", message: "tenant context is not set" },
  U0002: { code: "TENANT_ROUTE_CONFLICT", message: "route is already registered" },
  U0003: { code: "TENANT_INVALID", message: "invalid route kind or key hash" },
  U0004: { code: "TENANT_ROUTE_RESERVED", message: "route kind is reserved" },
  "23503": { code: "TENANT_UNKNOWN", message: "tenant is unknown" },
};

interface CreatedRow extends QueryResultRow {
  created: boolean;
}

interface RemovedRow extends QueryResultRow {
  removed: boolean;
}

interface ResolveRow extends QueryResultRow {
  tenant_id: string | null;
}

interface ProfileRow extends QueryResultRow {
  review_profile: string;
}

function sqlState(error: unknown): string | undefined {
  if (error instanceof TenancyError) {
    return undefined;
  }
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" && SQLSTATE_PATTERN.test(code) ? code : undefined;
}

function assertRouteKind(kind: string): void {
  if (typeof kind !== "string" || !ROUTE_KIND_PATTERN.test(kind)) {
    throw new TenancyError("TENANT_INVALID", "invalid route kind");
  }
}

function toTenancyError(error: unknown): TenancyError | undefined {
  const state = sqlState(error);
  if (state === undefined) {
    return undefined;
  }
  const mapped = SQLSTATE_ERRORS[state];
  if (mapped === undefined) {
    return undefined;
  }
  return new TenancyError(mapped.code, mapped.message);
}

export async function registerTenantRoute(
  tx: TenantTx,
  kind: string,
  key: string,
): Promise<RouteRegistration> {
  assertRouteKind(kind);
  const keyHash = hashRouteKey(key);

  let row: CreatedRow | undefined;
  try {
    const result = await tx.query<CreatedRow>(
      "SELECT ursitoare.register_tenant_route($1, $2) AS created",
      [kind, keyHash],
    );
    row = result.rows[0];
  } catch (error) {
    const mapped = toTenancyError(error);
    if (mapped !== undefined) {
      throw mapped;
    }
    throw error;
  }

  return row?.created === true ? "created" : "exists";
}

export async function unregisterTenantRoute(
  tx: TenantTx,
  kind: string,
  key: string,
): Promise<boolean> {
  assertRouteKind(kind);
  const keyHash = hashRouteKey(key);

  let row: RemovedRow | undefined;
  try {
    const result = await tx.query<RemovedRow>(
      "SELECT ursitoare.unregister_tenant_route($1, $2) AS removed",
      [kind, keyHash],
    );
    row = result.rows[0];
  } catch (error) {
    const mapped = toTenancyError(error);
    if (mapped !== undefined) {
      throw mapped;
    }
    throw error;
  }

  return row?.removed === true;
}

export async function resolveTenantBy(
  pool: TenantPool,
  kind: string,
  key: string,
): Promise<TenantContext | null> {
  assertRouteKind(kind);
  let keyHash: Buffer;
  try {
    keyHash = hashRouteKey(key);
  } catch {
    return null;
  }

  return inTransaction(pool, async (client) => {
    const resolved = await client.query<ResolveRow>(
      "SELECT ursitoare.resolve_tenant($1, $2) AS tenant_id",
      [kind, keyHash],
    );
    const tenantId = resolved.rows[0]?.tenant_id;
    if (tenantId === null || tenantId === undefined) {
      return null;
    }
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    const tenant = await client.query<ProfileRow>(
      "SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1",
      [tenantId],
    );
    const profile = tenant.rows[0]?.review_profile;
    if (profile === undefined) {
      throw new TenancyError("TENANT_UNKNOWN", "tenant is unknown");
    }
    return { tenantId, reviewProfile: profile as ReviewProfile };
  });
}
