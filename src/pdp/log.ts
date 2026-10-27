import { TENANT_ID_PATTERN } from "../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { requestDigest, sha256Hex } from "./digest.ts";
import { PdpError } from "./errors.ts";
import type { Decision, PolicyRequest } from "./types.ts";
import { formatUid } from "./values.ts";

const INSERT_DECISION = `INSERT INTO ursitoare.policy_decision (
  tenant_id, decided_at, decision_id, run_id, node_id,
  action, principal, resource, decision, reasons, errors,
  policy_set_version, request_digest, permit
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING`;

const ACTION_LIMIT = 128;
const UID_LIMIT = 512;
const VERSION_PATTERN = /^[0-9a-f]{64}$/;

function invalid(reason: string): PdpError {
  return new PdpError("PDP_RECORD_INVALID", `PDP_RECORD_INVALID: ${reason}`, { reason });
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isLength(value: unknown, min: number, max: number): value is string {
  return typeof value === "string" && value.length >= min && value.length <= max;
}

function isRoundTrippingDate(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }
  try {
    return new Date(value).toISOString() === value;
  } catch {
    return false;
  }
}

function validate(
  ctx: TenantContext,
  decision: Decision,
  extra: { runId?: string; nodeId?: string } | undefined,
): void {
  if (typeof ctx.tenantId !== "string" || !TENANT_ID_PATTERN.test(ctx.tenantId)) {
    throw invalid("tenant_id");
  }
  if (decision.decision !== "allow" && decision.decision !== "deny") {
    throw invalid("decision");
  }
  if (!isLength(decision.decisionId, 1, 128)) {
    throw invalid("decision_id");
  }
  if (!isRoundTrippingDate(decision.decidedAt)) {
    throw invalid("decided_at");
  }
  if (typeof decision.policySetVersion !== "string" || !VERSION_PATTERN.test(decision.policySetVersion)) {
    throw invalid("policy_set_version");
  }
  if (!isStringArray(decision.reasons)) {
    throw invalid("reasons");
  }
  if (!isStringArray(decision.errors)) {
    throw invalid("errors");
  }
  if (extra?.runId !== undefined && !isLength(extra.runId, 1, 128)) {
    throw invalid("run_id");
  }
  if (extra?.nodeId !== undefined && !isLength(extra.nodeId, 1, 128)) {
    throw invalid("node_id");
  }
  if (decision.permit !== undefined && decision.decision !== "allow") {
    throw invalid("permit");
  }
}

function bound(text: string, limit: number): string {
  const clean = text.replaceAll("\u0000", "\uFFFD");
  if (clean.length <= limit) {
    return clean;
  }
  return `${clean.slice(0, limit - 17)}#${sha256Hex(clean).slice(0, 16)}`;
}

function readAction(req: PolicyRequest): string {
  try {
    const action: unknown = (req as PolicyRequest | null)?.action;
    return typeof action === "string" ? action : "";
  } catch {
    return "";
  }
}

function readUidText(req: PolicyRequest, key: "principal" | "resource"): string {
  try {
    return formatUid((req as PolicyRequest | null)?.[key] as never);
  } catch {
    return "(invalid)";
  }
}

export async function recordDecision(
  tx: TenantTx,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra?: { runId?: string; nodeId?: string },
): Promise<boolean> {
  validate(ctx, decision, extra);

  const action = bound(readAction(req), ACTION_LIMIT);
  const principal = bound(readUidText(req, "principal"), UID_LIMIT);
  const resource = bound(readUidText(req, "resource"), UID_LIMIT);

  try {
    const result = await tx.query(INSERT_DECISION, [
      ctx.tenantId,
      decision.decidedAt,
      decision.decisionId,
      extra?.runId ?? null,
      extra?.nodeId ?? null,
      action,
      principal,
      resource,
      decision.decision,
      decision.reasons,
      decision.errors,
      decision.policySetVersion,
      requestDigest(req),
      decision.permit === undefined ? null : JSON.stringify(decision.permit),
    ]);
    return result.rowCount === 1;
  } catch (err) {
    const code = (err as { code?: unknown } | null)?.code;
    const sqlstate = typeof code === "string" ? code : "unknown";
    throw new PdpError("PDP_RECORD_FAILED", "PDP_RECORD_FAILED: record decision insert failed", {
      sqlstate,
    });
  }
}
