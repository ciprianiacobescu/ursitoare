// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { PolicyRuntime } from "./policy-runtime.ts";

export interface PolicySetRecord {
  tenantId: string;
  version: string;
  source: string;
  grantIds: string[];
  deployedBy: string;
  deployedAt: string;
}

export interface PolicyValidation {
  ok: boolean;
  policySetVersion: string | null;
  problems: { stage: string; ids: string[]; message: string }[];
}

export class PolicyDeployError extends Error {
  readonly code: "POLICY_INVALID";
  readonly problems: PolicyValidation["problems"];

  constructor(message: string, _problems: PolicyValidation["problems"]) {
    super(message);
    throw new Error("not implemented");
  }
}

export async function validatePolicySet(
  _runtime: PolicyRuntime,
  _pool: TenantPool,
  _ctx: TenantContext,
  _source: string,
): Promise<PolicyValidation> {
  throw new Error("not implemented");
}

export async function deployPolicySet(
  _runtime: PolicyRuntime,
  _pool: TenantPool,
  _ctx: TenantContext,
  _source: string,
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<PolicySetRecord> {
  throw new Error("not implemented");
}

export async function currentPolicySet(
  _pool: TenantPool,
  _ctx: TenantContext,
): Promise<PolicySetRecord | null> {
  throw new Error("not implemented");
}

export async function pendingGrantCount(_pool: TenantPool, _ctx: TenantContext): Promise<number> {
  throw new Error("not implemented");
}
