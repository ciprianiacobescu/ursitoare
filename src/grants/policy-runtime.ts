// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock, IdSource } from "../core/index.ts";
import type { PolicyEngine, PolicyEngineOptions, ToolArgType } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface PolicyRuntime {
  readonly engine: PolicyEngine;
  toolArgs(tenantId: string): Promise<Readonly<Record<string, ToolArgType>>>;
  reload(tenantId: string): Promise<void>;
}

export async function createPolicyRuntime(_deps: {
  pool: TenantPool | null;
  srcDir: string;
  clock: Clock;
  ids: IdSource;
  logger: PolicyEngineOptions["logger"];
}): Promise<PolicyRuntime> {
  throw new Error("not implemented");
}
