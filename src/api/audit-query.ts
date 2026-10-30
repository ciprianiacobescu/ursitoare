// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

// Module-internal. The shapes of AuditEventFilter (src/audit/query.ts) and PolicyDecisionFilter
// (src/pdp/decisions-query.ts). The scaffold does not add them to src/audit/index.ts or src/pdp/index.ts
// (add-audit-api tasks 2.1 and 3.1 do), and src/api may import those modules only through their index, so
// this stub uses structurally identical types.
type AuditEventFilterShape = {
  eventType?: string;
  actorId?: string;
  targetKind?: string;
  targetId?: string;
  afterSeq?: string;
  from?: string;
  to?: string;
};

type PolicyDecisionFilterShape = {
  decision?: "allow" | "deny";
  action?: string;
  principal?: string;
  runId?: string;
  decisionId?: string;
  from?: string;
  to?: string;
};

export interface ListQuery<F> {
  page: { limit: number; cursor: string | null };
  order: "asc" | "desc";
  filter: F;
}

export function parseAuditQuery(_query: unknown): ListQuery<AuditEventFilterShape> {
  throw new Error("not implemented");
}

export function parseDecisionQuery(_query: unknown): ListQuery<PolicyDecisionFilterShape> {
  throw new Error("not implemented");
}

export function parseVerifyQuery(_query: unknown): { fromSeq: bigint } {
  throw new Error("not implemented");
}
