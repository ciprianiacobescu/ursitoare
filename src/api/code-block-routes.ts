// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface CodeBlockApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  engineKey: KeyMaterial | null;
}

export function registerCodeBlockRoutes(_server: FastifyInstance, _deps: CodeBlockApiDeps): void {
  throw new Error("not implemented");
}
