import { appendAudit } from "../../audit/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import { rbacError } from "./errors.ts";
import {
  assertTenantMatches,
  auditActor,
  requireGroupName,
  requireIssuer,
  requireRoleId,
  requireTeamId,
  type RbacActor,
} from "./names.ts";

export interface GroupMapping {
  issuer: string;
  group: string;
  roleId: string | null;
  teamId: string | null;
  reviewedBy: string;
}

interface MappingRow {
  issuer: string;
  group_name: string;
  role_id: string | null;
  team_id: string | null;
  reviewed_by: string;
}

interface Target {
  roleId: string | null;
  teamId: string | null;
}

function toMapping(row: MappingRow): GroupMapping {
  return {
    issuer: row.issuer,
    group: row.group_name,
    roleId: row.role_id,
    teamId: row.team_id,
    reviewedBy: row.reviewed_by,
  };
}

function requireTarget(input: {
  roleId?: string | undefined;
  teamId?: string | undefined;
}): Target {
  const hasRole = input.roleId !== undefined;
  const hasTeam = input.teamId !== undefined;
  if (hasRole === hasTeam) throw rbacError("RBAC_INVALID");
  if (hasRole) return { roleId: requireRoleId(input.roleId), teamId: null };
  return { roleId: null, teamId: requireTeamId(input.teamId) };
}

function assertCanMap(actor: RbacActor, target: Target): void {
  if (actor.kind === "operator") return;
  if (target.teamId !== null) {
    if (!actor.roles.includes("tenant_admin")) throw rbacError("RBAC_ELEVATION");
    return;
  }
  const roleId = target.roleId;
  if (roleId === null) throw rbacError("RBAC_INVALID");
  if (!actor.roles.includes("tenant_admin") && !actor.roles.includes(roleId)) {
    throw rbacError("RBAC_ELEVATION");
  }
}

async function requireKnownIssuer(
  tx: TenantTx,
  ctx: TenantContext,
  issuer: string,
): Promise<void> {
  const routed = await tx.query(
    "SELECT 1 FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2 LIMIT 1",
    [ctx.tenantId, issuer],
  );
  if ((routed.rowCount ?? 0) === 0) throw rbacError("RBAC_UNKNOWN_ISSUER");
}

async function requireExistingTarget(
  tx: TenantTx,
  ctx: TenantContext,
  target: Target,
): Promise<void> {
  if (target.roleId !== null) {
    const found = await tx.query(
      "SELECT 1 FROM ursitoare.role WHERE tenant_id = $1 AND role_id = $2",
      [ctx.tenantId, target.roleId],
    );
    if ((found.rowCount ?? 0) === 0) throw rbacError("RBAC_NOT_FOUND");
    return;
  }
  if (target.teamId !== null) {
    const found = await tx.query(
      "SELECT 1 FROM ursitoare.team WHERE tenant_id = $1 AND team_id = $2",
      [ctx.tenantId, target.teamId],
    );
    if ((found.rowCount ?? 0) === 0) throw rbacError("RBAC_NOT_FOUND");
  }
}

async function findMapping(
  tx: TenantTx,
  ctx: TenantContext,
  issuer: string,
  group: string,
): Promise<MappingRow | undefined> {
  const result = await tx.query<MappingRow>(
    `SELECT issuer, group_name, role_id, team_id, reviewed_by
     FROM ursitoare.idp_group_map
     WHERE tenant_id = $1 AND issuer = $2 AND group_name = $3
     FOR UPDATE`,
    [ctx.tenantId, issuer, group],
  );
  return result.rows[0];
}

async function revokeTargetMemberships(
  tx: TenantTx,
  ctx: TenantContext,
  issuer: string,
  target: Target,
): Promise<number> {
  const column = target.roleId !== null ? "role_id" : "team_id";
  const value = target.roleId ?? target.teamId;
  const result = await tx.query(
    `DELETE FROM ursitoare.membership
     WHERE tenant_id = $1 AND source = 'idp_claim' AND source_issuer = $2 AND ${column} = $3`,
    [ctx.tenantId, issuer, value],
  );
  return result.rowCount ?? 0;
}

export async function listGroupMappings(
  tx: TenantTx,
  ctx: TenantContext,
): Promise<GroupMapping[]> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<MappingRow>(
    `SELECT issuer, group_name, role_id, team_id, reviewed_by
     FROM ursitoare.idp_group_map
     WHERE tenant_id = $1
     ORDER BY issuer COLLATE "C", group_name COLLATE "C"`,
    [ctx.tenantId],
  );
  return result.rows.map(toMapping);
}

export async function setGroupMapping(
  tx: TenantTx,
  ctx: TenantContext,
  input: { issuer: string; group: string; roleId?: string | undefined; teamId?: string | undefined },
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<GroupMapping> {
  const issuer = requireIssuer(input.issuer);
  const group = requireGroupName(input.group);
  const target = requireTarget(input);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await requireKnownIssuer(tx, ctx, issuer);
  await requireExistingTarget(tx, ctx, target);

  const existing = await findMapping(tx, ctx, issuer, group);
  if (existing !== undefined) {
    assertCanMap(actor, { roleId: existing.role_id, teamId: existing.team_id });
  }
  assertCanMap(actor, target);

  if (
    existing !== undefined &&
    existing.role_id === target.roleId &&
    existing.team_id === target.teamId
  ) {
    return toMapping(existing);
  }

  let revoked = 0;
  if (existing !== undefined) {
    revoked = await revokeTargetMemberships(tx, ctx, issuer, {
      roleId: existing.role_id,
      teamId: existing.team_id,
    });
  }

  await tx.query(
    `INSERT INTO ursitoare.idp_group_map (tenant_id, issuer, group_name, role_id, team_id, reviewed_by)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (tenant_id, issuer, group_name)
     DO UPDATE SET role_id = EXCLUDED.role_id, team_id = EXCLUDED.team_id, reviewed_by = EXCLUDED.reviewed_by`,
    [ctx.tenantId, issuer, group, target.roleId, target.teamId, audit.id],
  );

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.group_mapped",
      actor: audit,
      payload: {
        issuer,
        group,
        roleId: target.roleId,
        teamId: target.teamId,
        revoked,
      },
    },
    auditOpts,
  );

  return {
    issuer,
    group,
    roleId: target.roleId,
    teamId: target.teamId,
    reviewedBy: audit.id,
  };
}

export async function removeGroupMapping(
  tx: TenantTx,
  ctx: TenantContext,
  input: { issuer: string; group: string },
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<boolean> {
  const issuer = requireIssuer(input.issuer);
  const group = requireGroupName(input.group);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await requireKnownIssuer(tx, ctx, issuer);

  const existing = await findMapping(tx, ctx, issuer, group);
  if (existing === undefined) return false;

  assertCanMap(actor, { roleId: existing.role_id, teamId: existing.team_id });

  const revoked = await revokeTargetMemberships(tx, ctx, issuer, {
    roleId: existing.role_id,
    teamId: existing.team_id,
  });
  await tx.query(
    `DELETE FROM ursitoare.idp_group_map
     WHERE tenant_id = $1 AND issuer = $2 AND group_name = $3`,
    [ctx.tenantId, issuer, group],
  );

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.group_unmapped",
      actor: audit,
      payload: { issuer, group, revoked },
    },
    auditOpts,
  );

  return true;
}
