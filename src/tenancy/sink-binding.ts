import type { TenantContext } from "./context.ts";
import { TenancyError } from "./errors.ts";
import { registerTenantRoute, type RouteRegistration } from "./routes.ts";
import { withTenantTx, type TenantPool } from "./tx.ts";

export const MINTKEY_SINK_ROUTE_KINDS: Readonly<{ broker: string; proxy: string }> = Object.freeze({
  broker: "mintkey_sink_broker",
  proxy: "mintkey_sink_proxy",
});

export async function bindSinkTokens(
  pool: TenantPool,
  ctx: TenantContext,
  tokens: Readonly<{ broker: string; proxy: string }>,
): Promise<{ broker: RouteRegistration; proxy: RouteRegistration }> {
  if (tokens.broker === tokens.proxy) {
    throw new TenancyError("TENANT_INVALID", "the two sink tokens must differ");
  }
  return withTenantTx(pool, ctx, async (tx) => {
    const broker = await registerTenantRoute(tx, MINTKEY_SINK_ROUTE_KINDS.broker, tokens.broker);
    const proxy = await registerTenantRoute(tx, MINTKEY_SINK_ROUTE_KINDS.proxy, tokens.proxy);
    return { broker, proxy };
  });
}
