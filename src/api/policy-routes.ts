// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import type { PolicyRuntime } from "../grants/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface PolicyApiDeps {
  pool: TenantPool | null;
  runtime: PolicyRuntime | null;
  clock: Clock;
}

export function registerPolicyRoutes(_server: FastifyInstance, _deps: PolicyApiDeps): void {
  throw new Error("not implemented");
}
