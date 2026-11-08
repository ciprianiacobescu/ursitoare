// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import type { CredentialDeps, CredentialRecord } from "./types.ts";

export async function rotateCredential(
  _deps: CredentialDeps,
  _ctx: TenantContext,
  _credentialId: string,
  _value: string,
  _actor: AuditEventInput["actor"],
): Promise<CredentialRecord> {
  throw new Error("not implemented");
}
