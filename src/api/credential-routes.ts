// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { VaultWriter } from "../gateway/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface CredentialApiDeps {
  pool: TenantPool | null;
  vault: VaultWriter | null;
  ids: IdSource;
  clock: Clock;
  engineKey: KeyMaterial | null;
}

export function registerCredentialRoutes(_server: FastifyInstance, _deps: CredentialApiDeps): void {
  throw new Error("not implemented");
}
