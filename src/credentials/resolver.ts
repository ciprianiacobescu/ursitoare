// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantPool } from "../tenancy/index.ts";
import type { ServiceResolver } from "./types.ts";

export function createServiceResolver(_pool: TenantPool): ServiceResolver {
  throw new Error("not implemented");
}

export function seedServiceId(_tenantId: string, _toolServerId: string): string {
  throw new Error("not implemented");
}
