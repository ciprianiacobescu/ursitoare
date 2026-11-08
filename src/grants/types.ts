// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { TenantContext } from "../tenancy/index.ts";

export type GrantSubject = { kind: "role"; role: string } | { kind: "user"; userId: string };

export type GrantScope = { kind: "any_step" } | { kind: "node"; flowId: string; nodeId: string };

export interface ArgConstraint {
  arg: string;
  op: "eq" | "lte" | "gte";
  value: string | number | boolean;
}

export interface GrantRecord {
  id: string;
  subject: GrantSubject;
  tool: string;
  scope: GrantScope;
  args: ArgConstraint[];
  fingerprints: string[];
  state: "active" | "revoked";
  createdBy: string;
  createdAt: string;
  revokedBy: string | null;
  revokedAt: string | null;
}

export type GrantStatus = "active" | "needs_reconfirm" | "revoked";

export interface Reconfirmation {
  grantId: string;
  nodeId: string;
  from: string | null;
  to: string | null;
}

export type GrantsErrorCode =
  | "GRANTS_INVALID"
  | "GRANTS_NOT_FOUND"
  | "GRANTS_REFUSED"
  | "GRANTS_TENANT_MISMATCH";

export class GrantsError extends Error {
  readonly code: GrantsErrorCode;
  readonly details: Readonly<Record<string, string>>;

  constructor(_code: GrantsErrorCode, _details?: Readonly<Record<string, string>>) {
    super();
    throw new Error("not implemented");
  }
}

export interface GrantDeps {
  ids: IdSource;
  clock: Clock;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
}
