// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import type { IdentityOptions, User, UserKind, UserState } from "../users.ts";

export interface AdminAccount extends User {
  roles: string[];
  teams: string[];
  localRoles: string[];
}

export async function getAccount(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
  _kind: UserKind,
): Promise<AdminAccount | null> {
  throw new Error("not implemented");
}

export async function listAccounts(
  _tx: TenantTx,
  _ctx: TenantContext,
  _q: { kind: UserKind; state?: UserState | undefined; limit: number; after?: string | undefined },
): Promise<{ users: AdminAccount[]; next: string | null }> {
  throw new Error("not implemented");
}

export async function provisionServiceAccount(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { displayName: string; ownerUserId: string },
  _actor: Extract<RbacActor, { userId: string }>,
  _opts?: IdentityOptions,
): Promise<User> {
  throw new Error("not implemented");
}

export async function setAccountState(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { userId: string; kind: UserKind; state: UserState },
  _actor: Extract<RbacActor, { userId: string }>,
  _opts?: IdentityOptions,
): Promise<{ user: User; changed: boolean }> {
  throw new Error("not implemented");
}
