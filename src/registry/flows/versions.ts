import { appendAudit, formatAt } from "../../audit/index.ts";
import { canonicalizeFlow, contentHash, parseFlowText } from "../../authoring/index.ts";
import type { FlowFormat, ValidationResult } from "../../authoring/index.ts";
import { systemClock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { FlowError } from "./errors.ts";
import type { FlowActor, FlowOptions, VersionDetail, VersionState, VersionSummary } from "./flows.ts";

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX = 64;
export const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

export interface VersionRow {
  flow_id: string;
  version_no: number;
  content_hash: string;
  state: VersionState;
  source_surface: FlowFormat;
  author: string;
  requested_by: string | null;
  created_at: Date;
  validated_at: Date | null;
  validation: ValidationResult | null;
  source_text?: string;
  canonical?: unknown;
}

export const SUMMARY_COLUMNS = `flow_id, version_no, content_hash, state, source_surface, author,
  requested_by, created_at, validated_at, validation`;

export function toSummary(row: VersionRow): VersionSummary {
  return {
    flowId: row.flow_id,
    number: row.version_no,
    hash: row.content_hash,
    state: row.state,
    surface: row.source_surface,
    author: row.author,
    requestedBy: row.requested_by,
    createdAt: formatAt(row.created_at),
    validatedAt: row.validated_at === null ? null : formatAt(row.validated_at),
    validationOk: row.validation === null ? null : row.validation.ok,
  };
}

export async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) {
    throw new FlowError("FLOW_TENANT_MISMATCH", "transaction belongs to another tenant");
  }
}

export function requireFlowId(value: unknown): string {
  if (typeof value !== "string" || value.length > FLOW_ID_MAX || !FLOW_ID_PATTERN.test(value)) {
    throw new FlowError("FLOW_INVALID", "flow id is invalid");
  }
  return value;
}

export async function saveFlowVersion(
  tx: TenantTx,
  ctx: TenantContext,
  input: {
    flowId: string;
    format: FlowFormat;
    text: string;
    requestedBy?: string | null | undefined;
  },
  actor: FlowActor,
  opts?: FlowOptions,
): Promise<{ version: VersionSummary; created: boolean }> {
  const flowId = requireFlowId(input.flowId);
  if (input.format !== "yaml" && input.format !== "json") {
    throw new FlowError("FLOW_INVALID", "format is invalid");
  }
  if (typeof input.text !== "string") {
    throw new FlowError("FLOW_INVALID", "text is invalid");
  }
  const parsed = parseFlowText(input.text, input.format);
  if (!parsed.ok) {
    const { code, message, line, column } = parsed.error;
    throw new FlowError("FLOW_TEXT_INVALID", "flow text could not be parsed", {
      reason: "parse",
      code,
      message,
      ...(line === undefined ? {} : { line }),
      ...(column === undefined ? {} : { column }),
    });
  }
  if (input.text.includes("\u0000")) {
    throw new FlowError("FLOW_TEXT_INVALID", "flow text holds a NUL character", {
      reason: "parse",
      code: "FORMAT_NOT_JSON",
      message: "text holds a NUL character",
    });
  }
  const doc = parsed.doc;
  if (typeof doc !== "object" || doc === null || Array.isArray(doc)) {
    throw new FlowError("FLOW_TEXT_INVALID", "flow text is not an object", {
      reason: "not_object",
    });
  }
  await assertTenantMatches(tx, ctx);
  const locked = await tx.query<{ last_no: number }>(
    `SELECT last_no FROM ursitoare.flow WHERE tenant_id = $1 AND flow_id = $2 FOR UPDATE`,
    [ctx.tenantId, flowId],
  );
  const lastNo = locked.rows[0]?.last_no;
  if (lastNo === undefined) {
    throw new FlowError("FLOW_NOT_FOUND", "flow not found");
  }
  if ((doc as Record<string, unknown>)["flow"] !== flowId) {
    throw new FlowError("FLOW_TEXT_INVALID", "flow name does not match the flow id", {
      reason: "name_mismatch",
    });
  }
  const hash = contentHash(doc);
  const canonical = canonicalizeFlow(doc);
  const existing = await tx.query<VersionRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND content_hash = $2`,
    [ctx.tenantId, hash],
  );
  const found = existing.rows[0];
  if (found !== undefined) {
    return { version: toSummary(found), created: false };
  }

  const clock = opts?.clock ?? systemClock;
  const now = clock.now();
  const number = lastNo + 1;
  const requestedBy = input.requestedBy ?? null;
  await tx.query(
    `UPDATE ursitoare.flow SET last_no = $3 WHERE tenant_id = $1 AND flow_id = $2`,
    [ctx.tenantId, flowId, number],
  );
  await tx.query(
    `INSERT INTO ursitoare.flow_version
       (tenant_id, content_hash, flow_id, version_no, source_surface, source_text, canonical,
        state, author, requested_by, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'draft', $8, $9, $10)`,
    [
      ctx.tenantId,
      hash,
      flowId,
      number,
      input.format,
      input.text,
      JSON.stringify(canonical),
      actor.userId,
      requestedBy,
      now,
    ],
  );
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "flow.version_saved",
      actor: { kind: actor.kind, id: actor.userId },
      target: { kind: "flow_version", id: hash },
      payload: { flowId, number, surface: input.format },
    },
    { clock },
  );
  return {
    version: {
      flowId,
      number,
      hash,
      state: "draft",
      surface: input.format,
      author: actor.userId,
      requestedBy,
      createdAt: formatAt(now),
      validatedAt: null,
      validationOk: null,
    },
    created: true,
  };
}

export async function getVersion(
  tx: TenantTx,
  ctx: TenantContext,
  flowId: string,
  hash: string,
): Promise<VersionDetail | null> {
  await assertTenantMatches(tx, ctx);
  if (typeof hash !== "string" || !HASH_PATTERN.test(hash)) {
    return null;
  }
  const result = await tx.query<VersionRow>(
    `SELECT ${SUMMARY_COLUMNS}, source_text, canonical FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3`,
    [ctx.tenantId, flowId, hash],
  );
  const row = result.rows[0];
  if (row === undefined) {
    return null;
  }
  return {
    ...toSummary(row),
    text: row.source_text ?? "",
    canonical: row.canonical,
    result: row.validation,
  };
}

export async function listVersions(
  tx: TenantTx,
  ctx: TenantContext,
  q: { flowId: string; limit: number; after?: number | undefined },
): Promise<{ versions: VersionSummary[]; next: number | null }> {
  if (!Number.isInteger(q.limit) || q.limit < 1) {
    throw new FlowError("FLOW_INVALID", "version list limit is invalid");
  }
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<VersionRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND flow_id = $2 AND ($3::integer IS NULL OR version_no < $3)
     ORDER BY version_no DESC
     LIMIT $4`,
    [ctx.tenantId, q.flowId, q.after ?? null, q.limit + 1],
  );
  const hasMore = result.rows.length > q.limit;
  const kept = hasMore ? result.rows.slice(0, q.limit) : result.rows;
  return {
    versions: kept.map(toSummary),
    next: hasMore ? (kept[kept.length - 1]?.version_no ?? null) : null,
  };
}
