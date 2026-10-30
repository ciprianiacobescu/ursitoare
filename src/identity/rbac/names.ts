import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { rbacError } from "./errors.ts";

export type RbacActor =
  | { kind: "user" | "service"; userId: string; roles: readonly string[] }
  | { kind: "operator"; name: string };

export const DEFAULT_ROLES: readonly string[] = [
  "tenant_admin",
  "author",
  "approver",
  "auditor",
];

export const DEFAULT_BOOTSTRAP_ADMIN_GROUP: string = "ursitoare-admins";

export const BOOTSTRAP_ADMIN_GROUP_ENV: string = "URSITOARE_BOOTSTRAP_ADMIN_GROUP";

const ROLE_PATTERN = /^[a-z][a-z0-9_]{0,31}$/;
const TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const OPERATOR_PATTERN = /^[A-Za-z0-9._@-]{1,64}$/;
const MAX_GROUP_LENGTH = 255;
const MAX_ISSUER_LENGTH = 2048;

function isClean(value: unknown, max: number): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= max &&
    value.isWellFormed() &&
    !value.includes("\u0000") &&
    !value.includes("\n")
  );
}

// Module-internal: exported from this file, not from index.ts.
export function requireRoleId(value: unknown): string {
  if (typeof value !== "string" || !ROLE_PATTERN.test(value)) throw rbacError("RBAC_INVALID");
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export function requireTeamId(value: unknown): string {
  if (typeof value !== "string" || !TEAM_PATTERN.test(value)) throw rbacError("RBAC_INVALID");
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export function requireUserId(value: unknown): string {
  if (typeof value !== "string" || !USER_ID_PATTERN.test(value)) throw rbacError("RBAC_INVALID");
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export function requireOperatorName(value: unknown): string {
  if (typeof value !== "string" || !OPERATOR_PATTERN.test(value)) throw rbacError("RBAC_INVALID");
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export function requireGroupName(value: unknown): string {
  if (!isClean(value, MAX_GROUP_LENGTH) || value !== value.trim()) {
    throw rbacError("RBAC_INVALID");
  }
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export function requireIssuer(value: unknown): string {
  if (!isClean(value, MAX_ISSUER_LENGTH)) throw rbacError("RBAC_INVALID");
  return value;
}

// Module-internal: exported from this file, not from index.ts.
export async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) throw rbacError("RBAC_TENANT_MISMATCH");
}

// Module-internal: exported from this file, not from index.ts.
export function auditActor(actor: RbacActor): {
  kind: "user" | "service" | "system";
  id: string;
} {
  if (actor.kind === "operator") {
    return { kind: "system", id: `operator:${requireOperatorName(actor.name)}` };
  }
  return { kind: actor.kind, id: requireUserId(actor.userId) };
}

// Module-internal: exported from this file, not from index.ts.
export function pgErrorCode(error: unknown): string | undefined {
  if (typeof error === "object" && error !== null && "code" in error) {
    const code = (error as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return undefined;
}
