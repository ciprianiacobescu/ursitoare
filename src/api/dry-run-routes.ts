// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock, IdSource } from "../core/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface DryRunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  interpreter: InterpreterDeps | null;
  enabled: boolean;
}

export function registerDryRunRoutes(_server: FastifyInstance, _deps: DryRunApiDeps): void {
  throw new Error("not implemented");
}
