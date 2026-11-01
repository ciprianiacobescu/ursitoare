// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export interface FlowApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
  catalogueFor?: ((ctx: TenantContext) => Promise<Catalogue>) | undefined;
}

export function registerFlowRoutes(_server: FastifyInstance, _deps: FlowApiDeps): void {
  throw new Error("not implemented");
}
