import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import { registerAdapterServerTx, submitAdapterSurfaceTx } from "../adapter-store.ts";
import { validateOrigin } from "../origin.ts";
import { assertTenant, invalid, refused } from "../store.ts";
import { type ToolServerRecord, ToolsError } from "../types.ts";
import { importOpenApi } from "./read.ts";
import type { OpenApiOverlay } from "./types.ts";

export async function registerOpenApiServerTx(
  tx: TenantTx,
  ctx: TenantContext,
  input: { id: string; origin: string; local: boolean; document: unknown; overlay: OpenApiOverlay },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  if (typeof input.origin !== "string") throw invalid("origin", "not_url");
  const checked = validateOrigin(input.origin, { local: input.local === true });
  if (!checked.ok) throw invalid("origin", checked.reason);
  const surface = importOpenApi(input.document, checked.origin, input.overlay);
  return registerAdapterServerTx(
    tx,
    ctx,
    { id: input.id, adapter: "http_openapi", origin: input.origin, local: input.local, surface },
    actor,
    opts,
  );
}

export async function submitOpenApiTx(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  input: { document: unknown; overlay: OpenApiOverlay },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  await assertTenant(tx, ctx);
  const result = await tx.query<{ adapter: string; origin: string }>(
    `SELECT adapter, origin FROM ursitoare.tool_server
     WHERE tenant_id = $1 AND tool_server_id = $2`,
    [ctx.tenantId, serverId],
  );
  const row = result.rows[0];
  if (row === undefined) {
    throw new ToolsError("TOOLS_NOT_FOUND", "tool server not found", { id: serverId });
  }
  if (row.adapter !== "http_openapi") throw refused("adapter_mismatch");
  const surface = importOpenApi(input.document, row.origin, input.overlay);
  return submitAdapterSurfaceTx(tx, ctx, serverId, surface, actor, opts);
}
