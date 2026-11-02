// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock, IdSource } from "../core/index.ts";
import type { InterpreterDeps, VersionLoader } from "../interpreter/index.ts";
import type { TenantPool } from "../runs/index.ts";

export function registryVersionLoader(_pool: TenantPool): VersionLoader {
  throw new Error("not implemented");
}

export interface TestRunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  interpreter: InterpreterDeps | null;
}

export function registerTestRunRoutes(_server: FastifyInstance, _deps: TestRunApiDeps): void {
  throw new Error("not implemented");
}
