// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface AdminApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
}

export function registerAdminRoutes(_server: FastifyInstance, _deps: AdminApiDeps): void {
  throw new Error("not implemented");
}
