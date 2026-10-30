// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export interface PolicyDecisionFilter {
  decision?: "allow" | "deny";
  action?: string;
  principal?: string;
  runId?: string;
  decisionId?: string;
  from?: string;
  to?: string;
}

export interface PolicyDecisionRecord {
  decisionId: string;
  decidedAt: string;
  runId: string | null;
  nodeId: string | null;
  action: string;
  principal: string;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  errors: string[];
  policySetVersion: string;
  requestDigest: string;
  permit: Record<string, unknown> | null;
}

export async function listPolicyDecisions(
  _pool: TenantPool,
  _ctx: TenantContext,
  _q: {
    filter?: PolicyDecisionFilter;
    continueAfter?: { decidedAt: string; decisionId: string };
    order: "asc" | "desc";
    limit: number;
  },
): Promise<PolicyDecisionRecord[]> {
  throw new Error("not implemented");
}
