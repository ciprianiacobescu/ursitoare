// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";

export interface GrantApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  catalogueFor?: (ctx: TenantContext) => Promise<Catalogue>;
}

export function registerGrantRoutes(_server: FastifyInstance, _deps: GrantApiDeps): void {
  throw new Error("not implemented");
}
