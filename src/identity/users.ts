// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock, IdSource } from "../core/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";

export type UserKind = "human" | "service";

export type UserState = "active" | "disabled";

export interface User {
  readonly userId: string;
  readonly kind: UserKind;
  readonly ownerUserId: string | null;
  readonly displayName: string;
  readonly email: string | null;
  readonly state: UserState;
}

export interface IdentityOptions {
  ids?: IdSource;
  clock?: Clock;
}

export interface TokenClaims {
  issuer: string;
  subject: string;
  email?: string | undefined;
  name?: string | undefined;
  preferredUsername?: string | undefined;
}

export interface UserPage {
  limit?: number | undefined;
  after?: string | undefined;
}

export async function upsertUserFromClaims(
  _tx: TenantTx,
  _ctx: TenantContext,
  _claims: TokenClaims,
  _opts?: IdentityOptions,
): Promise<User> {
  throw new Error("not implemented");
}

export async function getUser(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
): Promise<User | null> {
  throw new Error("not implemented");
}

export async function listUsers(
  _tx: TenantTx,
  _ctx: TenantContext,
  _page?: UserPage,
): Promise<{ users: User[]; next: string | null }> {
  throw new Error("not implemented");
}

export async function createServiceAccount(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { displayName: string; ownerUserId: string },
  _opts?: IdentityOptions,
): Promise<User> {
  throw new Error("not implemented");
}
