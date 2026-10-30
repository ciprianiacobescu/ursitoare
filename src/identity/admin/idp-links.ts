// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { RbacActor } from "../rbac/names.ts";
import type { IdentityOptions } from "../users.ts";

export interface IdpLinkRecord {
  issuer: string;
  subject: string;
  linkedAt: string;
}

export async function listIdpLinks(
  _tx: TenantTx,
  _ctx: TenantContext,
  _userId: string,
): Promise<IdpLinkRecord[]> {
  throw new Error("not implemented");
}

export async function addIdpLink(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { userId: string; issuer: string; subject: string },
  _actor: Extract<RbacActor, { userId: string }>,
  _opts?: IdentityOptions,
): Promise<IdpLinkRecord> {
  throw new Error("not implemented");
}
