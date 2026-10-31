import { withTenantTx, type TenantContext, type TenantPool } from "../tenancy/index.ts";
import { PdpError } from "./errors.ts";

export interface PolicyDecisionFilter {
  decision?: "allow" | "deny";
  action?: string;
  principal?: string;
  runId?: string;
  decisionId?: string;
  from?: string;
  to?: string;
}

export interface PolicyDecisionRecord {
  decisionId: string;
  decidedAt: string;
  runId: string | null;
  nodeId: string | null;
  action: string;
  principal: string;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  errors: string[];
  policySetVersion: string;
  requestDigest: string;
  permit: Record<string, unknown> | null;
}

const UTC_TIME_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{3}|\.[0-9]{6})?Z$/;
const UTC_TIME_SIX_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{6}Z$/;

const DECIDED_AT_FORMAT = `to_char(decided_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

interface DecisionRow {
  decision_id: string;
  decided_at: string;
  run_id: string | null;
  node_id: string | null;
  action: string;
  principal: string;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  errors: string[];
  policy_set_version: string;
  request_digest: string;
  permit: Record<string, unknown> | null;
}

function reject(reason: "bad_limit" | "bad_order" | "bad_filter" | "bad_position"): never {
  throw new PdpError("PDP_OPTIONS_INVALID", "pdp options are invalid", { reason });
}

function isUtcTime(text: string): boolean {
  if (typeof text !== "string" || !UTC_TIME_PATTERN.test(text)) {
    return false;
  }
  const date = new Date(`${text.slice(0, 19)}Z`);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return date.toISOString().slice(0, 19) === text.slice(0, 19);
}

function padFraction(text: string): string {
  const dot = text.indexOf(".");
  if (dot === -1) {
    return `${text.slice(0, -1)}.000000Z`;
  }
  const fraction = text.slice(dot + 1, dot + 7);
  return `${text.slice(0, dot)}.${fraction.padEnd(6, "0")}Z`;
}

function isLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

function isValidFilter(filter: PolicyDecisionFilter): boolean {
  if (filter.decision !== undefined && filter.decision !== "allow" && filter.decision !== "deny") {
    return false;
  }
  if (filter.action !== undefined && !isLength(filter.action, 1, 128)) {
    return false;
  }
  if (filter.principal !== undefined && !isLength(filter.principal, 1, 512)) {
    return false;
  }
  if (filter.runId !== undefined && !isLength(filter.runId, 1, 128)) {
    return false;
  }
  if (filter.decisionId !== undefined && !isLength(filter.decisionId, 1, 128)) {
    return false;
  }
  if (filter.from !== undefined && !isUtcTime(filter.from)) {
    return false;
  }
  if (filter.to !== undefined && !isUtcTime(filter.to)) {
    return false;
  }
  if (
    filter.from !== undefined &&
    filter.to !== undefined &&
    padFraction(filter.to) <= padFraction(filter.from)
  ) {
    return false;
  }
  return true;
}

function isValidPosition(position: { decidedAt: string; decisionId: string }): boolean {
  return (
    UTC_TIME_SIX_PATTERN.test(position.decidedAt) &&
    isUtcTime(position.decidedAt) &&
    isLength(position.decisionId, 1, 128)
  );
}

function toRecord(row: DecisionRow): PolicyDecisionRecord {
  return {
    decisionId: row.decision_id,
    decidedAt: row.decided_at,
    runId: row.run_id,
    nodeId: row.node_id,
    action: row.action,
    principal: row.principal,
    resource: row.resource,
    decision: row.decision,
    reasons: row.reasons,
    errors: row.errors,
    policySetVersion: row.policy_set_version,
    requestDigest: row.request_digest,
    permit: row.permit,
  };
}

export async function listPolicyDecisions(
  pool: TenantPool,
  ctx: TenantContext,
  q: {
    filter?: PolicyDecisionFilter;
    continueAfter?: { decidedAt: string; decisionId: string };
    order: "asc" | "desc";
    limit: number;
  },
): Promise<PolicyDecisionRecord[]> {
  if (!Number.isInteger(q.limit) || q.limit < 1 || q.limit > 200) {
    reject("bad_limit");
  }
  if (q.order !== "asc" && q.order !== "desc") {
    reject("bad_order");
  }
  const filter = q.filter ?? {};
  if (!isValidFilter(filter)) {
    reject("bad_filter");
  }
  const after = q.continueAfter;
  if (after !== undefined && !isValidPosition(after)) {
    reject("bad_position");
  }

  const dir = q.order === "desc" ? "DESC" : "ASC";
  const params: unknown[] = [ctx.tenantId];
  const where: string[] = ["tenant_id = $1"];

  if (filter.decision !== undefined) {
    params.push(filter.decision);
    where.push(`decision = $${params.length}`);
  }
  if (filter.action !== undefined) {
    params.push(filter.action);
    where.push(`action = $${params.length}`);
  }
  if (filter.principal !== undefined) {
    params.push(filter.principal);
    where.push(`principal = $${params.length}`);
  }
  if (filter.runId !== undefined) {
    params.push(filter.runId);
    where.push(`run_id = $${params.length}`);
  }
  if (filter.decisionId !== undefined) {
    params.push(filter.decisionId);
    where.push(`decision_id = $${params.length}`);
  }
  if (filter.from !== undefined) {
    params.push(filter.from);
    where.push(`decided_at >= $${params.length}::timestamptz`);
  }
  if (filter.to !== undefined) {
    params.push(filter.to);
    where.push(`decided_at < $${params.length}::timestamptz`);
  }
  if (after !== undefined) {
    params.push(after.decidedAt);
    const atParam = params.length;
    params.push(after.decisionId);
    const idParam = params.length;
    where.push(
      `(decided_at, decision_id) ${q.order === "desc" ? "<" : ">"} ($${atParam}::timestamptz, $${idParam})`,
    );
  }
  params.push(q.limit);

  return withTenantTx(pool, ctx, async (tx) => {
    const res = await tx.query<DecisionRow>(
      `SELECT decision_id, ${DECIDED_AT_FORMAT} AS decided_at, run_id, node_id, action, principal,
              resource, decision, reasons, errors, policy_set_version, request_digest, permit
       FROM ursitoare.policy_decision
       WHERE ${where.join(" AND ")}
       ORDER BY decided_at ${dir}, decision_id ${dir}
       LIMIT $${params.length}`,
      params,
    );
    return res.rows.map(toRecord);
  });
}
