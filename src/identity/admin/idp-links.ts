import { appendAudit } from "../../audit/index.ts";
import { systemClock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import { auditActor } from "../rbac/names.ts";
import type { IdentityOptions, UserKind } from "../users.ts";
import { adminError } from "./errors.ts";
import type { AdminErrorCode } from "./errors.ts";

export interface IdpLinkRecord {
  issuer: string;
  subject: string;
  linkedAt: string;
}

const ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

interface LinkRow {
  issuer: string;
  subject: string;
  linked_at: string;
}

function requireUserId(value: unknown): string {
  if (typeof value !== "string" || !ID_PATTERN.test(value)) throw adminError("ADMIN_INVALID");
  return value;
}

const MAX_ISSUER = 2048;
const MAX_SUBJECT = 512;

function requireAdminText(value: unknown, max: number): string {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > max ||
    !value.isWellFormed() ||
    value.includes("\u0000") ||
    value.includes("\n") ||
    value !== value.trim()
  ) {
    throw adminError("ADMIN_INVALID");
  }
  return value;
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) throw adminError("ADMIN_TENANT_MISMATCH");
}

async function requireHuman(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
  wrongKind: AdminErrorCode,
): Promise<void> {
  const found = await tx.query<{ kind: UserKind }>(
    `SELECT kind FROM ursitoare."user"
     WHERE tenant_id = $1 AND user_id = $2`,
    [ctx.tenantId, userId],
  );
  const row = found.rows[0];
  if (row === undefined) throw adminError("ADMIN_NOT_FOUND");
  if (row.kind !== "human") throw adminError(wrongKind);
}

function toRecord(row: LinkRow): IdpLinkRecord {
  return { issuer: row.issuer, subject: row.subject, linkedAt: row.linked_at };
}

const LINK_COLUMNS = `issuer, subject,
 to_char(linked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS linked_at`;

export async function listIdpLinks(
  tx: TenantTx,
  ctx: TenantContext,
  userId: string,
): Promise<IdpLinkRecord[]> {
  const id = requireUserId(userId);
  await assertTenantMatches(tx, ctx);
  await requireHuman(tx, ctx, id, "ADMIN_NOT_FOUND");
  const result = await tx.query<LinkRow>(
    `SELECT ${LINK_COLUMNS} FROM ursitoare.idp_link
     WHERE tenant_id = $1 AND user_id = $2
     ORDER BY linked_at, subject`,
    [ctx.tenantId, id],
  );
  return result.rows.map(toRecord);
}

export async function addIdpLink(
  tx: TenantTx,
  ctx: TenantContext,
  input: { userId: string; issuer: string; subject: string },
  actor: Extract<RbacActor, { userId: string }>,
  opts?: IdentityOptions,
): Promise<IdpLinkRecord> {
  const userId = requireUserId(input.userId);
  const issuer = requireAdminText(input.issuer, MAX_ISSUER);
  const subject = requireAdminText(input.subject, MAX_SUBJECT);
  const clock = opts?.clock ?? systemClock;
  const audit = auditActor(actor);
  const auditOpts = opts?.clock === undefined ? undefined : { clock: opts.clock };

  await assertTenantMatches(tx, ctx);
  await requireHuman(tx, ctx, userId, "ADMIN_WRONG_KIND");
  const routed = await tx.query<{ issuer: string }>(
    "SELECT issuer FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2",
    [ctx.tenantId, issuer],
  );
  if (routed.rows[0] === undefined) throw adminError("ADMIN_UNKNOWN_ISSUER");

  await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [
    `ursitoare:idp_link:${ctx.tenantId}\n${issuer}\n${subject}`,
  ]);
  const inserted = await tx.query<{ issuer: string; subject: string; linked_at: string }>(
    `INSERT INTO ursitoare.idp_link (tenant_id, issuer, subject, user_id, linked_at)
     VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING
     RETURNING issuer, subject,
      to_char(linked_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS linked_at`,
    [ctx.tenantId, issuer, subject, userId, clock.now()],
  );
  const link = inserted.rows[0];
  if (link === undefined) throw adminError("ADMIN_EXISTS");

  await appendAudit(
    tx,
    ctx,
    {
      eventType: "identity.idp_linked",
      actor: audit,
      target: { kind: "user", id: userId },
      payload: { issuer, subject },
    },
    auditOpts,
  );
  return toRecord(link);
}
