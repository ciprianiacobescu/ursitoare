import { appendAudit } from "../../audit/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import { rbacError } from "./errors.ts";
import {
  DEFAULT_BOOTSTRAP_ADMIN_GROUP,
  BOOTSTRAP_ADMIN_GROUP_ENV,
  assertTenantMatches,
  requireGroupName,
  requireIssuer,
  requireOperatorName,
} from "./names.ts";

export async function mapBootstrapAdminGroup(
  tx: TenantTx,
  ctx: TenantContext,
  input: { issuer: string; group: string; operator: string },
  opts?: IdentityOptions,
): Promise<"mapped" | "already_mapped"> {
  const issuer = requireIssuer(input.issuer);
  const group = requireGroupName(input.group);
  const operator = requireOperatorName(input.operator);
  const actor = { kind: "system" as const, id: `operator:${operator}` };
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `ursitoare:bootstrap:${ctx.tenantId}`,
  ]);

  const existing = await tx.query(
    `SELECT 1 FROM ursitoare.idp_group_map
     WHERE tenant_id = $1 AND role_id = 'tenant_admin' LIMIT 1`,
    [ctx.tenantId],
  );
  if ((existing.rowCount ?? 0) > 0) return "already_mapped";

  const routed = await tx.query(
    "SELECT 1 FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2 LIMIT 1",
    [ctx.tenantId, issuer],
  );
  if ((routed.rowCount ?? 0) === 0) throw rbacError("RBAC_UNKNOWN_ISSUER");

  await tx.query(
    `INSERT INTO ursitoare.idp_group_map (tenant_id, issuer, group_name, role_id, team_id, reviewed_by)
     VALUES ($1, $2, $3, 'tenant_admin', NULL, $4)
     ON CONFLICT (tenant_id, issuer, group_name)
     DO UPDATE SET role_id = EXCLUDED.role_id, team_id = EXCLUDED.team_id, reviewed_by = EXCLUDED.reviewed_by`,
    [ctx.tenantId, issuer, group, actor.id],
  );

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.bootstrap_admin_mapped",
      actor,
      payload: { issuer, group },
    },
    auditOpts,
  );

  return "mapped";
}

export function bootstrapAdminGroup(env: Readonly<Record<string, string | undefined>>): string {
  const raw = env[BOOTSTRAP_ADMIN_GROUP_ENV];
  if (raw === undefined || raw === "") return DEFAULT_BOOTSTRAP_ADMIN_GROUP;
  return requireGroupName(raw);
}
