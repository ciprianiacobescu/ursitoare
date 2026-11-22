import { VALIDATOR_VERSION } from "../../authoring/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { VersionState } from "./flows.ts";

export async function validatorVersionOf(
  tx: TenantTx,
  ctx: TenantContext,
  flowId: string,
  hash: string,
): Promise<number | null> {
  const res = await tx.query<{ validator_version: number | null }>(
    `SELECT validator_version FROM ursitoare.flow_version
     WHERE tenant_id = $1 AND flow_id = $2 AND content_hash = $3`,
    [ctx.tenantId, flowId, hash],
  );
  return res.rows[0]?.validator_version ?? null;
}

export function isValidationStale(state: VersionState, validatorVersion: number | null): boolean {
  return state !== "draft" && (validatorVersion === null || validatorVersion < VALIDATOR_VERSION);
}
