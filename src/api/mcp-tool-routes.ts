// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { Gateway } from "../gateway/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";
import type { ServiceLookup } from "../tools/index.ts";

export interface McpToolApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  policy: Pick<PolicyEngine, "check"> | null;
  gateway: Gateway | null;
  services: ServiceLookup | null;
}

export function registerMcpToolRoutes(_server: FastifyInstance, _deps: McpToolApiDeps): void {
  throw new Error("not implemented");
}
