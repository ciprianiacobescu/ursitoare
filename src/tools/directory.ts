// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { ToolBinding } from "./types.ts";

export interface ToolDirectory {
  resolve(ctx: TenantContext, ref: string): Promise<ToolBinding | null>;
}

export function createToolDirectory(_pool: TenantPool): ToolDirectory {
  throw new Error("not implemented");
}
