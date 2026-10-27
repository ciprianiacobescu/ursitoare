// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import type { Decision, PolicyRequest } from "./types.ts";

export async function recordDecision(
  _tx: TenantTx,
  _ctx: TenantContext,
  _decision: Decision,
  _req: PolicyRequest,
  _extra?: { runId?: string; nodeId?: string },
): Promise<boolean> {
  throw new Error("not implemented");
}
