// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { VaultAuthScheme } from "../gateway/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

export async function provisionCredential(
  _deps: CredentialDeps,
  _ctx: TenantContext,
  _input: {
    toolServerId: string;
    authScheme: VaultAuthScheme;
    headerName: string | null;
    value: string;
    serviceId?: string;
  },
  _actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  throw new Error("not implemented");
}

export async function provisionCredentialTx(
  _tx: TenantTx,
  _deps: CredentialDeps,
  _ctx: TenantContext,
  _input: {
    toolServerId: string;
    authScheme: VaultAuthScheme;
    headerName: string | null;
    value: string;
    serviceId?: string;
  },
  _actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  throw new Error("not implemented");
}
