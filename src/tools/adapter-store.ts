// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import { CODE_BLOCK_ORIGIN, checkAdapterSurface } from "./adapter-surface.ts";
import { validateOrigin } from "./origin.ts";
import { assertTenant, checkId, insertServerTx, invalid, refused, submitLockedTx } from "./store.ts";
import type { ToolAdapter, ToolServerRecord, ToolSurface } from "./types.ts";

const REGISTRABLE: readonly ToolAdapter[] = ["http_openapi", "mcp", "code_block"];

export async function registerAdapterServerTx(
  tx: TenantTx,
  ctx: TenantContext,
  input: {
    id: string;
    adapter: "http_openapi" | "mcp" | "code_block";
    origin: string;
    local: boolean;
    surface: ToolSurface | null;
  },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  await assertTenant(tx, ctx);
  const id = checkId(input.id);
  const adapter = input.adapter;
  if (typeof adapter !== "string" || !REGISTRABLE.includes(adapter)) {
    throw invalid("adapter", "bad_value");
  }
  let origin: string;
  if (adapter === "code_block") {
    if (input.origin !== CODE_BLOCK_ORIGIN || input.local !== false) {
      throw invalid("origin", "code_block");
    }
    origin = CODE_BLOCK_ORIGIN;
  } else {
    if (typeof input.origin !== "string") throw invalid("origin", "not_url");
    const result = validateOrigin(input.origin, { local: input.local === true });
    if (!result.ok) throw invalid("origin", result.reason);
    origin = result.origin;
  }
  if (input.surface === null && adapter !== "mcp") throw invalid("surface", "required");
  const surface = input.surface === null ? null : checkAdapterSurface(adapter, input.surface);
  return insertServerTx(tx, ctx, { id, adapter, origin, local: input.local, surface }, actor, opts);
}

export async function submitAdapterSurfaceTx(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  surface: ToolSurface,
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  return submitLockedTx(
    tx,
    ctx,
    serverId,
    actor,
    (adapter) => {
      if (adapter === "fixture") throw refused("adapter_mismatch");
      return checkAdapterSurface(adapter, surface);
    },
    opts,
  );
}
