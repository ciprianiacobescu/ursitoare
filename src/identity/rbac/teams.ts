import { appendAudit } from "../../audit/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import { rbacError } from "./errors.ts";
import {
  assertTenantMatches,
  auditActor,
  pgErrorCode,
  requireTeamId,
  type RbacActor,
} from "./names.ts";

export async function listRoles(tx: TenantTx, ctx: TenantContext): Promise<string[]> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<{ role_id: string }>(
    'SELECT role_id FROM ursitoare.role WHERE tenant_id = $1 ORDER BY role_id COLLATE "C"',
    [ctx.tenantId],
  );
  return result.rows.map((row) => row.role_id);
}

export async function listTeams(tx: TenantTx, ctx: TenantContext): Promise<string[]> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<{ team_id: string }>(
    'SELECT team_id FROM ursitoare.team WHERE tenant_id = $1 ORDER BY team_id COLLATE "C"',
    [ctx.tenantId],
  );
  return result.rows.map((row) => row.team_id);
}

export async function createTeam(
  tx: TenantTx,
  ctx: TenantContext,
  input: { teamId: string },
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<{ teamId: string }> {
  const teamId = requireTeamId(input.teamId);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };
  await assertTenantMatches(tx, ctx);
  const inserted = await tx.query(
    "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
    [ctx.tenantId, teamId],
  );
  if ((inserted.rowCount ?? 0) === 0) throw rbacError("RBAC_EXISTS");
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.team_created",
      actor: audit,
      target: { kind: "team", id: teamId },
    },
    auditOpts,
  );
  return { teamId };
}

export async function deleteTeam(
  tx: TenantTx,
  ctx: TenantContext,
  teamId: string,
  actor: RbacActor,
  opts?: IdentityOptions,
): Promise<void> {
  const id = requireTeamId(teamId);
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };
  await assertTenantMatches(tx, ctx);
  const existing = await tx.query(
    "SELECT 1 FROM ursitoare.team WHERE tenant_id = $1 AND team_id = $2",
    [ctx.tenantId, id],
  );
  if (existing.rowCount === 0) throw rbacError("RBAC_NOT_FOUND");
  const used = await tx.query(
    `SELECT 1 FROM ursitoare.idp_group_map WHERE tenant_id = $1 AND team_id = $2
     UNION ALL
     SELECT 1 FROM ursitoare.membership WHERE tenant_id = $1 AND team_id = $2
     LIMIT 1`,
    [ctx.tenantId, id],
  );
  if ((used.rowCount ?? 0) > 0) throw rbacError("RBAC_IN_USE");
  await tx.query("SAVEPOINT delete_team");
  try {
    await tx.query("DELETE FROM ursitoare.team WHERE tenant_id = $1 AND team_id = $2", [
      ctx.tenantId,
      id,
    ]);
    await tx.query("RELEASE SAVEPOINT delete_team");
  } catch (error) {
    await tx.query("ROLLBACK TO SAVEPOINT delete_team");
    if (pgErrorCode(error) === "23503") throw rbacError("RBAC_IN_USE");
    throw error;
  }
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.team_deleted",
      actor: audit,
      target: { kind: "team", id },
    },
    auditOpts,
  );
}
