// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";

export async function mapBootstrapAdminGroup(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { issuer: string; group: string; operator: string },
  _opts?: IdentityOptions,
): Promise<"mapped" | "already_mapped"> {
  throw new Error("not implemented");
}

export function bootstrapAdminGroup(_env: Readonly<Record<string, string | undefined>>): string {
  throw new Error("not implemented");
}
