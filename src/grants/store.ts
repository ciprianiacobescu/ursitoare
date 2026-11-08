// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import type {
  ArgConstraint,
  GrantDeps,
  GrantRecord,
  GrantScope,
  GrantStatus,
  GrantSubject,
  Reconfirmation,
} from "./types.ts";

export async function createGrant(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: {
    subject: GrantSubject;
    tool: string;
    scope: GrantScope;
    args: ArgConstraint[];
    versionHash?: string;
  },
  _actor: AuditEventInput["actor"],
  _deps: GrantDeps,
): Promise<GrantRecord> {
  throw new Error("not implemented");
}

export async function revokeGrant(
  _tx: TenantTx,
  _ctx: TenantContext,
  _grantId: string,
  _actor: AuditEventInput["actor"],
  _deps: GrantDeps,
): Promise<GrantRecord> {
  throw new Error("not implemented");
}

export async function confirmGrant(
  _tx: TenantTx,
  _ctx: TenantContext,
  _grantId: string,
  _versionHash: string | null,
  _actor: AuditEventInput["actor"],
  _deps: GrantDeps,
): Promise<GrantRecord> {
  throw new Error("not implemented");
}

export async function listGrants(
  _pool: TenantPool,
  _ctx: TenantContext,
  _page: { limit: number; after: string | null },
): Promise<{ grant: GrantRecord; status: GrantStatus }[]> {
  throw new Error("not implemented");
}

export async function reconfirmationsFor(
  _pool: TenantPool,
  _ctx: TenantContext,
  _oldHash: string,
  _newHash: string,
  _deps: GrantDeps,
): Promise<Reconfirmation[]> {
  throw new Error("not implemented");
}
