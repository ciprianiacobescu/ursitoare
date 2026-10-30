// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";

export interface SyncResult {
  added: string[];
  removed: string[];
}

export function groupsFromIdToken(_idToken: string): string[] {
  throw new Error("not implemented");
}

export async function syncMemberships(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
  _input: { issuer: string; groups: readonly string[] },
  _opts?: IdentityOptions,
): Promise<SyncResult> {
  throw new Error("not implemented");
}
