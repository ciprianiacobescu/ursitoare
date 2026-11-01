// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, ValidationResult } from "../../authoring/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { FlowActor, FlowOptions, VersionSummary } from "./flows.ts";

export async function validateVersion(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { flowId: string; hash: string; catalogue: Catalogue },
  _actor: FlowActor,
  _opts?: FlowOptions,
): Promise<{ version: VersionSummary; result: ValidationResult }> {
  throw new Error("not implemented");
}
