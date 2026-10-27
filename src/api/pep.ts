// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface PepDeps {
  pool: TenantPool | null;
  engine: PolicyEngine | null;
  clock: Clock;
  publicBaseUrl: string;
}

export function installPep(_server: FastifyInstance, _deps: PepDeps): void {
  throw new Error("not implemented");
}
