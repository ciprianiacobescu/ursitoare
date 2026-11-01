import { appendAudit, formatAt } from "../../audit/index.ts";
import type { FlowFormat, ValidationResult } from "../../authoring/index.ts";
import { systemClock } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { FlowError } from "./errors.ts";

export interface FlowActor {
  kind: "user" | "service";
  userId: string;
}

export interface FlowOptions {
  clock?: Clock;
}

export type VersionState =
  | "draft"
  | "validated"
  | "tested"
  | "reviewed"
  | "published"
  | "deprecated";

export interface VersionSummary {
  flowId: string;
  number: number;
  hash: string;
  state: VersionState;
  surface: FlowFormat;
  author: string;
  requestedBy: string | null;
  createdAt: string;
  validatedAt: string | null;
  validationOk: boolean | null;
}

export interface VersionDetail extends VersionSummary {
  text: string;
  canonical: unknown;
  result: ValidationResult | null;
}

export interface FlowRecord {
  flowId: string;
  ownerTeam: string;
  createdBy: string;
  createdAt: string;
  versionCount: number;
  latest: VersionSummary | null;
}

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX = 64;
const TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

interface FlowRow {
  flow_id: string;
  owner_team: string;
  created_by: string;
  created_at: Date;
  last_no: number;
  v_flow_id: string | null;
  v_version_no: number | null;
  v_content_hash: string | null;
  v_state: VersionState | null;
  v_source_surface: FlowFormat | null;
  v_author: string | null;
  v_requested_by: string | null;
  v_created_at: Date | null;
  v_validated_at: Date | null;
  v_validation: ValidationResult | null;
}

const FLOW_COLUMNS = `f.flow_id, f.owner_team, f.created_by, f.created_at, f.last_no,
  v.flow_id AS v_flow_id, v.version_no AS v_version_no, v.content_hash AS v_content_hash,
  v.state AS v_state, v.source_surface AS v_source_surface, v.author AS v_author,
  v.requested_by AS v_requested_by, v.created_at AS v_created_at,
  v.validated_at AS v_validated_at, v.validation AS v_validation`;

const LATEST_JOIN = `LEFT JOIN ursitoare.flow_version v
  ON v.tenant_id = f.tenant_id AND v.flow_id = f.flow_id AND v.version_no = f.last_no`;

function summaryOf(row: FlowRow): VersionSummary | null {
  if (row.v_version_no === null || row.v_content_hash === null) {
    return null;
  }
  return {
    flowId: row.v_flow_id ?? row.flow_id,
    number: row.v_version_no,
    hash: row.v_content_hash,
    state: row.v_state ?? "draft",
    surface: row.v_source_surface ?? "yaml",
    author: row.v_author ?? row.created_by,
    requestedBy: row.v_requested_by,
    createdAt: formatAt(row.v_created_at ?? row.created_at),
    validatedAt: row.v_validated_at === null ? null : formatAt(row.v_validated_at),
    validationOk: row.v_validation === null ? null : row.v_validation.ok,
  };
}

function toFlow(row: FlowRow): FlowRecord {
  return {
    flowId: row.flow_id,
    ownerTeam: row.owner_team,
    createdBy: row.created_by,
    createdAt: formatAt(row.created_at),
    versionCount: row.last_no,
    latest: summaryOf(row),
  };
}

async function assertTenantMatches(tx: TenantTx, ctx: TenantContext): Promise<void> {
  const result = await tx.query<{ t: string | null }>(
    "SELECT current_setting('app.tenant_id', true) AS t",
  );
  if (result.rows[0]?.t !== ctx.tenantId) {
    throw new FlowError("FLOW_TENANT_MISMATCH", "transaction belongs to another tenant");
  }
}

function requireFlowId(value: unknown): string {
  if (
    typeof value !== "string" ||
    value.length > FLOW_ID_MAX ||
    !FLOW_ID_PATTERN.test(value)
  ) {
    throw new FlowError("FLOW_INVALID", "flow id is invalid");
  }
  return value;
}

function requireOwnerTeam(value: unknown): string {
  if (typeof value !== "string" || !TEAM_PATTERN.test(value)) {
    throw new FlowError("FLOW_INVALID", "owner team is invalid");
  }
  return value;
}

async function teamExists(
  tx: TenantTx,
  ctx: TenantContext,
  teamId: string,
): Promise<boolean> {
  const result = await tx.query(
    "SELECT 1 FROM ursitoare.team WHERE tenant_id = $1 AND team_id = $2",
    [ctx.tenantId, teamId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function createFlow(
  tx: TenantTx,
  ctx: TenantContext,
  input: { name: string; ownerTeam: string },
  actor: FlowActor,
  opts?: FlowOptions,
): Promise<FlowRecord> {
  const name = requireFlowId(input.name);
  const ownerTeam = requireOwnerTeam(input.ownerTeam);
  await assertTenantMatches(tx, ctx);
  if (!(await teamExists(tx, ctx, ownerTeam))) {
    throw new FlowError("FLOW_UNKNOWN_TEAM", "owner team is unknown");
  }
  const clock = opts?.clock ?? systemClock;
  const now = clock.now();
  try {
    await tx.query(
      `INSERT INTO ursitoare.flow (tenant_id, flow_id, owner_team, created_by, created_at, last_no)
       VALUES ($1, $2, $3, $4, $5, 0)`,
      [ctx.tenantId, name, ownerTeam, actor.userId, now],
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error) {
      const code = (error as { code?: unknown }).code;
      if (code === "23505") {
        throw new FlowError("FLOW_EXISTS", "flow already exists");
      }
    }
    throw error;
  }
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "flow.created",
      actor: { kind: actor.kind, id: actor.userId },
      target: { kind: "flow", id: name },
      payload: { ownerTeam },
    },
    { clock },
  );
  return {
    flowId: name,
    ownerTeam,
    createdBy: actor.userId,
    createdAt: formatAt(now),
    versionCount: 0,
    latest: null,
  };
}

export async function getFlow(
  tx: TenantTx,
  ctx: TenantContext,
  flowId: string,
): Promise<FlowRecord | null> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<FlowRow>(
    `SELECT ${FLOW_COLUMNS} FROM ursitoare.flow f ${LATEST_JOIN}
     WHERE f.tenant_id = $1 AND f.flow_id = $2`,
    [ctx.tenantId, flowId],
  );
  const row = result.rows[0];
  return row === undefined ? null : toFlow(row);
}

export async function flowOwnerTeam(
  tx: TenantTx,
  ctx: TenantContext,
  flowId: string,
): Promise<string | null> {
  await assertTenantMatches(tx, ctx);
  const result = await tx.query<{ owner_team: string }>(
    "SELECT owner_team FROM ursitoare.flow WHERE tenant_id = $1 AND flow_id = $2",
    [ctx.tenantId, flowId],
  );
  return result.rows[0]?.owner_team ?? null;
}

export async function listFlows(
  tx: TenantTx,
  ctx: TenantContext,
  q: {
    limit: number;
    after?: string | undefined;
    filter: { sql: string; values: unknown[] };
  },
): Promise<{ flows: FlowRecord[]; next: string | null }> {
  if (!Number.isInteger(q.limit) || q.limit < 1) {
    throw new FlowError("FLOW_INVALID", "flow list limit is invalid");
  }
  await assertTenantMatches(tx, ctx);
  const params: unknown[] = [ctx.tenantId, q.after ?? null, q.limit + 1, ...q.filter.values];
  const result = await tx.query<FlowRow>(
    `SELECT ${FLOW_COLUMNS} FROM ursitoare.flow f ${LATEST_JOIN}
     WHERE f.tenant_id = $1
       AND ($2::text IS NULL OR f.flow_id COLLATE "C" > $2)
       AND (${q.filter.sql})
     ORDER BY f.flow_id COLLATE "C"
     LIMIT $3`,
    params,
  );
  const hasMore = result.rows.length > q.limit;
  const kept = hasMore ? result.rows.slice(0, q.limit) : result.rows;
  return {
    flows: kept.map(toFlow),
    next: hasMore ? (kept[kept.length - 1]?.flow_id ?? null) : null,
  };
}
