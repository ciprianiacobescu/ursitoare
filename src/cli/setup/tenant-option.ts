// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type pg from "pg";

import type { TenantContext } from "../../tenancy/index.ts";
import type { CliCall } from "../registry.ts";

export async function resolveSetupTenant(
  _pool: Pick<pg.Pool, "query" | "connect">,
  _args: CliCall["args"],
): Promise<TenantContext> {
  throw new Error("not implemented");
}
