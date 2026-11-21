// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantTx } from "../tenancy/index.ts";
import type { ToolServerRecord, ToolSurface } from "./types.ts";

export async function registerAdapterServerTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: {
    id: string;
    adapter: "http_openapi" | "mcp" | "code_block";
    origin: string;
    local: boolean;
    surface: ToolSurface | null;
  },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function submitAdapterSurfaceTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _serverId: string,
  _surface: ToolSurface,
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}
