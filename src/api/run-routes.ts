// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { DurableRuntime } from "../durable/index.ts";
import type { TenantPool } from "../runs/index.ts";

export interface RunApiDeps {
  pool: TenantPool | null;
  clock: Clock;
  ids: IdSource;
  engineKey: KeyMaterial | null;
  durable: Pick<DurableRuntime, "cancel"> | null;
}

export function registerRunRoutes(_server: FastifyInstance, _deps: RunApiDeps): void {
  throw new Error("not implemented");
}
