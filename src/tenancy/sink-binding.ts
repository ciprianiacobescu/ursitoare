// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext } from "./context.ts";
import type { RouteRegistration } from "./routes.ts";
import type { TenantPool } from "./tx.ts";

export const MINTKEY_SINK_ROUTE_KINDS: Readonly<{ broker: string; proxy: string }> = {
  broker: "",
  proxy: "",
};

export async function bindSinkTokens(
  _pool: TenantPool,
  _ctx: TenantContext,
  _tokens: Readonly<{ broker: string; proxy: string }>,
): Promise<{ broker: RouteRegistration; proxy: RouteRegistration }> {
  throw new Error("not implemented");
}
