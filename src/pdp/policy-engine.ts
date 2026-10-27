// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock, IdSource } from "../core/index.ts";
import type { Logger } from "../observability/index.ts";
import type { ActionName } from "./actions.ts";
import type { ToolArgType } from "./cedar-schema.ts";
import type { PrincipalEntity } from "./principal.ts";
import type { Pdp, PolicySource } from "./types.ts";

export interface PolicyEngine extends Pdp {
  allowedActions(principal: PrincipalEntity, actions: readonly ActionName[]): Promise<ActionName[]>;
}

export interface PolicyEngineOptions {
  srcDir: string;
  tenantPolicies?: readonly PolicySource[];
  toolArgs?: Readonly<Record<string, ToolArgType>>;
  clock: Clock;
  ids: IdSource;
  logger: Logger;
}

export async function createPolicyEngine(_opts: PolicyEngineOptions): Promise<PolicyEngine> {
  throw new Error("not implemented");
}
