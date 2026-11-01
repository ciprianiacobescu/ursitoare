// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue } from "../authoring/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import type { BlockVersion } from "./block-store.ts";

export interface RegistryCatalogue extends Catalogue {
  blockRefs(): string[];
  roleNames(): string[];
}

export function registryCatalogue(
  _blocks: readonly BlockVersion[],
  _roles: readonly string[],
): RegistryCatalogue {
  throw new Error("not implemented");
}

export async function loadRegistryCatalogue(
  _pool: TenantPool,
  _ctx: TenantContext,
): Promise<Catalogue> {
  throw new Error("not implemented");
}
