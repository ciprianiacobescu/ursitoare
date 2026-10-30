// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { IdentityOptions } from "../users.ts";
import type { RbacActor } from "./names.ts";

export async function listRoles(_tx: TenantTx, _ctx: TenantContext): Promise<string[]> {
  throw new Error("not implemented");
}

export async function listTeams(_tx: TenantTx, _ctx: TenantContext): Promise<string[]> {
  throw new Error("not implemented");
}

export async function createTeam(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { teamId: string },
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<{ teamId: string }> {
  throw new Error("not implemented");
}

export async function deleteTeam(
  _tx: TenantTx,
  _ctx: TenantContext,
  _teamId: string,
  _actor: RbacActor,
  _opts?: IdentityOptions,
): Promise<void> {
  throw new Error("not implemented");
}
