import { appendAudit } from "../../audit/index.ts";
import { canonicalizeFlow, validateFlow } from "../../authoring/index.ts";
import type { Catalogue, ValidationResult } from "../../authoring/index.ts";
import { systemClock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { FlowError } from "./errors.ts";
import type { FlowActor, FlowOptions, VersionState, VersionSummary } from "./flows.ts";
import {
  HASH_PATTERN,
  SUMMARY_COLUMNS,
  assertTenantMatches,
  requireFlowId,
  toSummary,
} from "./versions.ts";
import type { VersionRow } from "./versions.ts";

export async function validateVersion(
  tx: TenantTx,
  ctx: TenantContext,
  input: { flowId: string; hash: string; catalogue: Catalogue },
  actor: FlowActor,
  opts?: FlowOptions,
): Promise<{ version: VersionSummary; result: ValidationResult }> {
  const flowId = requireFlowId(input.flowId);
  if (typeof input.hash !== "string" || !HASH_PATTERN.test(input.hash)) {
    throw new FlowError("FLOW_INVALID", "version hash is invalid");
  }
  await assertTenantMatches(tx, ctx);
  const locked = await tx.query<VersionRow>(
    `SELECT ${SUMMARY_COLUMNS}, canonical FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3 FOR UPDATE`,
    [ctx.tenantId, flowId, input.hash],
  );
  const row = locked.rows[0];
  if (row === undefined) {
    throw new FlowError("FLOW_NOT_FOUND", "flow version not found");
  }
  const result = validateFlow(canonicalizeFlow(row.canonical), input.catalogue);
  const clock = opts?.clock ?? systemClock;
  const now = clock.now();
  let state: VersionState = row.state;
  if (row.state === "draft" || row.state === "validated") {
    state = result.ok ? "validated" : "draft";
  }
  await tx.query(
    `UPDATE ursitoare.flow_version SET state = $4, validation = $5::jsonb, validated_at = $6
     WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3`,
    [ctx.tenantId, flowId, input.hash, state, JSON.stringify(result), now],
  );
  await appendAudit(
    tx,
    ctx,
    {
      eventType: "flow.version_validated",
      actor: { kind: actor.kind, id: actor.userId },
      target: { kind: "flow_version", id: input.hash },
      payload: {
        flowId,
        ok: result.ok,
        errors: result.errors.length,
        warnings: result.warnings.length,
        state,
      },
    },
    { clock },
  );
  const updated = await tx.query<VersionRow>(
    `SELECT ${SUMMARY_COLUMNS} FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3`,
    [ctx.tenantId, flowId, input.hash],
  );
  const fresh = updated.rows[0];
  if (fresh === undefined) {
    throw new FlowError("FLOW_NOT_FOUND", "flow version not found");
  }
  return { version: toSummary(fresh), result };
}
