// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PolicySource, ToolArgType } from "../pdp/index.ts";
import type { GrantRecord } from "./types.ts";

export function compileGrant(
  _tenantId: string,
  _grant: GrantRecord,
  _argTypes: Readonly<Record<string, ToolArgType>>,
): PolicySource | null {
  throw new Error("not implemented");
}

export function compileGrants(
  _tenantId: string,
  _grants: readonly GrantRecord[],
  _argTypes: Readonly<Record<string, ToolArgType>>,
): PolicySource[] {
  throw new Error("not implemented");
}
