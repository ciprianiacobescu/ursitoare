// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type PolicyLayer = "platform" | "tenant";

export interface PolicySource {
  id: string;
  text: string;
  layer: PolicyLayer;
}

export interface EntityUid {
  type: string;
  id: string;
}

export interface Entity {
  uid: EntityUid;
  attrs: Record<string, unknown>;
  parents: EntityUid[];
}

export interface Egress {
  method: string;
  host: string;
  path: string;
  bodyDigest: string;
  serviceId: string;
  ttlSeconds: number;
}

export type Permit = Egress;

export interface PolicyRequest {
  principal: EntityUid;
  action: string;
  resource: EntityUid;
  context: Record<string, unknown>;
  entities: Entity[];
  egress?: Egress;
}

export interface Decision {
  decision: "allow" | "deny";
  decisionId: string;
  decidedAt: string;
  reasons: string[];
  errors: string[];
  policySetVersion: string;
  permit?: Permit;
}

export interface Pdp {
  readonly policySetVersion: string;
  readonly actions: readonly string[];
  readonly policies: readonly { id: string; layer: PolicyLayer }[];
  check(req: PolicyRequest): Promise<Decision>;
}
