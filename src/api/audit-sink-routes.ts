// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import type { TenantPool } from "../tenancy/index.ts";

export interface AuditSinkDeps {
  pool: TenantPool;
  clock: Clock;
  mintkeyTenantId: (tenantId: string) => string;
}

export function installAuditSink(_internal: FastifyInstance, _deps: AuditSinkDeps): void {
  throw new Error("not implemented");
}
