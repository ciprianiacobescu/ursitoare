import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { JsonSchema, ToolServerRecord, ToolSurface } from "../types.ts";
import { registerAdapterServerTx, submitAdapterSurfaceTx } from "../adapter-store.ts";
import { CODE_BLOCK_ORIGIN } from "../adapter-surface.ts";

export interface CodeBlockToolInput {
  name: string;
  description?: string;
  input: JsonSchema;
  output: JsonSchema;
  source: string;
}

export function codeBlockSurface(tools: readonly CodeBlockToolInput[]): ToolSurface {
  const result: { tools: ToolSurface["tools"] } = { tools: [] };
  for (const tool of tools) {
    const entry: ToolSurface["tools"][number] = {
      name: tool.name,
      effect: "read",
      input: tool.input,
      output: tool.output,
      untrusted_result: false,
      unsafe_to_retry: false,
      call: { kind: "code", source: tool.source },
    };
    if (tool.description !== undefined) {
      entry.description = tool.description;
    }
    result.tools.push(entry);
  }
  return result as ToolSurface;
}

export async function registerCodeBlockServerTx(
  tx: TenantTx,
  ctx: TenantContext,
  input: { id: string; tools: readonly CodeBlockToolInput[] },
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  return registerAdapterServerTx(
    tx,
    ctx,
    { id: input.id, adapter: "code_block", origin: CODE_BLOCK_ORIGIN, local: false, surface: codeBlockSurface(input.tools) },
    actor,
    opts,
  );
}

export async function submitCodeBlocksTx(
  tx: TenantTx,
  ctx: TenantContext,
  serverId: string,
  tools: readonly CodeBlockToolInput[],
  actor: AuditEventInput["actor"],
  opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  return submitAdapterSurfaceTx(tx, ctx, serverId, codeBlockSurface(tools), actor, opts);
}
