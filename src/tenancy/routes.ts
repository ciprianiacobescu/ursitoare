import type { QueryResultRow } from "pg";

import { hashRouteKey, ROUTE_KIND_PATTERN, type TenantContext } from "./context.ts";
import { TenancyError } from "./errors.ts";
import type { TenantPool, TenantTx } from "./tx.ts";

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

export function unregisterTenantRoute(_tx: TenantTx, _kind: string, _key: string): Promise<boolean> {
  throw new Error("not implemented");
}

export function resolveTenantBy(_pool: TenantPool, _kind: string, _key: string): Promise<TenantContext | null> {
  throw new Error("not implemented");
}
