// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { PolicyDecisionRecord } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface DecisionView {
  decisionId: string;
  decidedAt: string;
  nodeId: string | null;
  resource: string;
  decision: "allow" | "deny";
  reasons: string[];
  policySetVersion: string;
  permit: {
    method: string;
    host: string;
    path: string;
    bodyDigest: string;
    serviceId: string;
    ttlSeconds: number;
  } | null;
}

export function toDecisionView(_record: PolicyDecisionRecord): DecisionView {
  throw new Error("not implemented");
}

export interface RunDecisionApiDeps {
  pool: TenantPool | null;
  engineKey: KeyMaterial | null;
}

export function registerRunDecisionRoutes(
  _server: FastifyInstance,
  _deps: RunDecisionApiDeps,
): void {
  throw new Error("not implemented");
}
