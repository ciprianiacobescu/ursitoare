// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { TenantContext } from "../../src/tenancy/index.ts";
import type { TestDatabase } from "./pg.ts";

export const TENANT_A_ID: string = "";

export const TENANT_B_ID: string = "";

export function seedTwoTenants(_db: TestDatabase): Promise<{ a: TenantContext; b: TenantContext }> {
  throw new Error("not implemented");
}
