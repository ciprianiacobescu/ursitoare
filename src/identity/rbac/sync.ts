import { appendAudit } from "../../audit/index.ts";
import { systemClock, systemIds } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import { rbacError } from "./errors.ts";
import { assertTenantMatches, requireGroupName, requireIssuer } from "./names.ts";

export interface SyncResult {
  added: string[];
  removed: string[];
}

const MAX_GROUPS = 1000;
const MAX_GROUP_LENGTH = 255;

interface MappingRow {
  role_id: string | null;
  team_id: string | null;
}

interface MembershipRow {
  membership_id: string;
  role_id: string | null;
  team_id: string | null;
}

function isGroupName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_GROUP_LENGTH &&
    value.isWellFormed() &&
    !value.includes("\u0000") &&
    !value.includes("\n") &&
    value === value.trim()
  );
}

function decodePayload(idToken: string): unknown {
  const parts = idToken.split(".");
  if (parts.length !== 3) return undefined;
  const payload = parts[1];
  if (payload === undefined || payload === "") return undefined;
  const decoded = Buffer.from(payload, "base64url").toString("utf8");
  return JSON.parse(decoded) as unknown;
}

export function groupsFromIdToken(idToken: string): string[] {
  let payload: unknown;
  try {
    payload = decodePayload(idToken);
  } catch {
    return [];
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return [];
  const groups = (payload as { groups?: unknown }).groups;
  if (!Array.isArray(groups)) return [];
  const kept: string[] = [];
  const seen = new Set<string>();
  for (const value of groups) {
    if (kept.length >= MAX_GROUPS) break;
    if (!isGroupName(value) || seen.has(value)) continue;
    seen.add(value);
    kept.push(value);
  }
  return kept;
}

function targetOf(row: { role_id: string | null; team_id: string | null }): string | undefined {
  if (row.role_id !== null) return `role:${row.role_id}`;
  if (row.team_id !== null) return `team:${row.team_id}`;
  return undefined;
}

export async function syncMemberships(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
  input: { issuer: string; groups: readonly string[] },
  opts?: IdentityOptions,
): Promise<SyncResult> {
  const issuer = requireIssuer(input.issuer);
  if (!Array.isArray(input.groups)) throw rbacError("RBAC_INVALID");
  const groups: string[] = [];
  for (const group of input.groups) {
    groups.push(requireGroupName(group));
  }

  await assertTenantMatches(tx, ctx);

  const user = await tx.query(
    'SELECT 1 FROM ursitoare."user" WHERE tenant_id = $1 AND user_id = $2',
    [ctx.tenantId, userId],
  );
  if ((user.rowCount ?? 0) === 0) throw rbacError("RBAC_NOT_FOUND");

  const ids = opts?.ids ?? systemIds;
  const clock = opts?.clock ?? systemClock;

  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `ursitoare:membership:${ctx.tenantId}\n${userId}`,
  ]);

  const mapped = await tx.query<MappingRow>(
    `SELECT role_id, team_id FROM ursitoare.idp_group_map
     WHERE tenant_id = $1 AND issuer = $2 AND group_name = ANY($3::text[])`,
    [ctx.tenantId, issuer, groups],
  );

  const desired = new Map<string, { roleId: string | null; teamId: string | null }>();
  for (const row of mapped.rows) {
    const target = targetOf(row);
    if (target !== undefined) desired.set(target, { roleId: row.role_id, teamId: row.team_id });
  }

  const current = await tx.query<MembershipRow>(
    `SELECT membership_id, role_id, team_id FROM ursitoare.membership
     WHERE tenant_id = $1 AND user_id = $2 AND source = 'idp_claim' AND source_issuer = $3`,
    [ctx.tenantId, userId, issuer],
  );

  const existing = new Map<string, string>();
  for (const row of current.rows) {
    const target = targetOf(row);
    if (target !== undefined) existing.set(target, row.membership_id);
  }

  const added = [...desired.keys()].filter((target) => !existing.has(target)).sort();
  const removed = [...existing.keys()].filter((target) => !desired.has(target)).sort();

  const now = clock.now();
  for (const target of added) {
    const value = desired.get(target);
    if (value === undefined) continue;
    await tx.query(
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, team_id, source, source_issuer, granted_by, synced_at)
       VALUES ($1, $2, $3, $4, $5, 'idp_claim', $6, NULL, $7)`,
      [ctx.tenantId, ids.next("mem"), userId, value.roleId, value.teamId, issuer, now],
    );
  }

  if (removed.length > 0) {
    const stale = removed
      .map((target) => existing.get(target))
      .filter((id): id is string => id !== undefined);
    await tx.query(
      "DELETE FROM ursitoare.membership WHERE tenant_id = $1 AND membership_id = ANY($2::text[])",
      [ctx.tenantId, stale],
    );
  }

  await tx.query(
    `UPDATE ursitoare.membership SET synced_at = $4
     WHERE tenant_id = $1 AND user_id = $2 AND source = 'idp_claim' AND source_issuer = $3`,
    [ctx.tenantId, userId, issuer, now],
  );

  if (added.length > 0 || removed.length > 0) {
    const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };
    await appendAudit(
      tx,
      ctx,
      {
        eventType: "identity.memberships_synced",
        actor: { kind: "system", id: "oidc" },
        target: { kind: "user", id: userId },
        payload: { added, removed },
      },
      auditOpts,
    );
  }

  return { added, removed };
}
