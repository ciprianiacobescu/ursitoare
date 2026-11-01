// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface BlockApiDeps {
  pool: TenantPool | null;
  engineKey: KeyMaterial | null;
}

export function registerBlockRoutes(_server: FastifyInstance, _deps: BlockApiDeps): void {
  throw new Error("not implemented");
}
