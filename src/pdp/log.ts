import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { requestDigest } from "./digest.ts";
import type { Decision, PolicyRequest } from "./types.ts";
import { formatUid } from "./values.ts";

const INSERT_DECISION = `INSERT INTO ursitoare.policy_decision (
  tenant_id, decided_at, decision_id, run_id, node_id,
  action, principal, resource, decision, reasons, errors,
  policy_set_version, request_digest, permit
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
ON CONFLICT (tenant_id, decision_id, decided_at) DO NOTHING`;

export async function recordDecision(
  tx: TenantTx,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra?: { runId?: string; nodeId?: string },
): Promise<boolean> {
  const result = await tx.query(INSERT_DECISION, [
    ctx.tenantId,
    decision.decidedAt,
    decision.decisionId,
    extra?.runId ?? null,
    extra?.nodeId ?? null,
    req.action,
    formatUid(req.principal),
    formatUid(req.resource),
    decision.decision,
    decision.reasons,
    decision.errors,
    decision.policySetVersion,
    requestDigest(req),
    decision.permit === undefined ? null : JSON.stringify(decision.permit),
  ]);
  return result.rowCount === 1;
}
