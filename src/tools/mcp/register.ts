// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { ToolServerRecord } from "../types.ts";

export async function registerMcpServerTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { id: string; url: string; local: boolean },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<{ server: ToolServerRecord; endpoint: string }> {
  throw new Error("not implemented");
}

export async function mcpEndpointOf(
  _tx: TenantTx,
  _ctx: TenantContext,
  _serverId: string,
): Promise<string | null> {
  throw new Error("not implemented");
}
