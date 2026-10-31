import { appendAudit } from "../../audit/index.ts";
import { systemClock, systemIds } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import { rbacError } from "./errors.ts";
import {
  assertTenantMatches,
  auditActor,
  requireRoleId,
  requireUserId,
  type RbacActor,
} from "./names.ts";

function assertCanGrant(actor: RbacActor, userId: string, roleId: string): void {
  if (actor.kind === "operator") return;
  if (actor.userId === userId) throw rbacError("RBAC_ELEVATION");
  if (!actor.roles.includes("tenant_admin") && !actor.roles.includes(roleId)) {
    throw rbacError("RBAC_ELEVATION");
  }
}

async function requireRole(tx: TenantTx, ctx: TenantContext, roleId: string): Promise<void> {
  const found = await tx.query(
    "SELECT 1 FROM ursitoare.role WHERE tenant_id = $1 AND role_id = $2",
    [ctx.tenantId, roleId],
  );
  if ((found.rowCount ?? 0) === 0) throw rbacError("RBAC_NOT_FOUND");
}

async function requireUser(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
  actor: RbacActor,
): Promise<void> {
  const found = await tx.query<{ kind: string }>(
    'SELECT kind FROM ursitoare."user" WHERE tenant_id = $1 AND user_id = $2',
    [ctx.tenantId, userId],
  );
  const row = found.rows[0];
  if (row === undefined) throw rbacError("RBAC_NOT_FOUND");
  if (actor.kind !== "operator" && row.kind !== "service") {
    throw rbacError("RBAC_DIRECT_GRANT_REFUSED");
  }
}

export async function grantRole(
  tx: TenantTx,
  ctx: TenantContext,
  input: { userId: string; roleId: string },
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<"granted" | "exists"> {
  const userId = requireUserId(input.userId);
  const roleId = requireRoleId(input.roleId);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await requireRole(tx, ctx, roleId);
  await requireUser(tx, ctx, userId, actor);
  assertCanGrant(actor, userId, roleId);

  const ids = opts?.ids ?? systemIds;
  const clock = opts?.clock ?? systemClock;
  const inserted = await tx.query(
    `INSERT INTO ursitoare.membership
       (tenant_id, membership_id, user_id, role_id, team_id, source, source_issuer, granted_by, synced_at)
     VALUES ($1, $2, $3, $4, NULL, 'local', '', $5, $6)
     ON CONFLICT DO NOTHING`,
    [ctx.tenantId, ids.next("mem"), userId, roleId, audit.id, clock.now()],
  );
  if ((inserted.rowCount ?? 0) === 0) return "exists";

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.role_granted",
      actor: audit,
      target: { kind: "user", id: userId },
      payload: { roleId, via: actor.kind === "operator" ? "operator" : "admin" },
    },
    auditOpts,
  );
  return "granted";
}

export async function revokeRole(
  tx: TenantTx,
  ctx: TenantContext,
  input: { userId: string; roleId: string },
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<boolean> {
  const userId = requireUserId(input.userId);
  const roleId = requireRoleId(input.roleId);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await requireRole(tx, ctx, roleId);
  await requireUser(tx, ctx, userId, actor);
  assertCanGrant(actor, userId, roleId);

  const deleted = await tx.query(
    `DELETE FROM ursitoare.membership
     WHERE tenant_id = $1 AND user_id = $2 AND role_id = $3 AND source = 'local'`,
    [ctx.tenantId, userId, roleId],
  );
  if ((deleted.rowCount ?? 0) === 0) return false;

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.role_revoked",
      actor: audit,
      target: { kind: "user", id: userId },
      payload: { roleId, via: actor.kind === "operator" ? "operator" : "admin" },
    },
    auditOpts,
  );
  return true;
}
