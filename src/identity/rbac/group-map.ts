// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import type { RbacActor } from "./names.ts";

export interface GroupMapping {
  issuer: string;
  group: string;
  roleId: string | null;
  teamId: string | null;
  reviewedBy: string;
}

export async function listGroupMappings(_tx: TenantTx, _ctx: TenantContext): Promise<GroupMapping[]> {
  throw new Error("not implemented");
}

export async function setGroupMapping(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { issuer: string; group: string; roleId?: string | undefined; teamId?: string | undefined },
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<GroupMapping> {
  throw new Error("not implemented");
}

export async function removeGroupMapping(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { issuer: string; group: string },
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<boolean> {
  throw new Error("not implemented");
}
