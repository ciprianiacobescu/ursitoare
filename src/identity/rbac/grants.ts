// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import type { RbacActor } from "./names.ts";

export async function grantRole(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { userId: string; roleId: string },
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<"granted" | "exists"> {
  throw new Error("not implemented");
}

export async function revokeRole(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { userId: string; roleId: string },
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<boolean> {
  throw new Error("not implemented");
}
