// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { JsonSchema, ToolServerRecord, ToolSurface } from "../types.ts";

export interface CodeBlockToolInput {
  name: string;
  description?: string;
  input: JsonSchema;
  output: JsonSchema;
  source: string;
}

export function codeBlockSurface(_tools: readonly CodeBlockToolInput[]): ToolSurface {
  throw new Error("not implemented");
}

export async function registerCodeBlockServerTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { id: string; tools: readonly CodeBlockToolInput[] },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function submitCodeBlocksTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _serverId: string,
  _tools: readonly CodeBlockToolInput[],
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}
