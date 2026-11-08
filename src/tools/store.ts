// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import type { ToolAdapter, ToolServerRecord, ToolSurface } from "./types.ts";

export interface ToolServerDetail extends ToolServerRecord {
  approvedSurface: ToolSurface | null;
  pendingSurface: ToolSurface | null;
}

export async function registerToolServer(
  _pool: TenantPool,
  _ctx: TenantContext,
  _input: {
    id: string;
    adapter: ToolAdapter;
    origin: string;
    local: boolean;
    surface: ToolSurface;
  },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function registerToolServerTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: {
    id: string;
    adapter: ToolAdapter;
    origin: string;
    local: boolean;
    surface: ToolSurface;
  },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function submitSurface(
  _pool: TenantPool,
  _ctx: TenantContext,
  _serverId: string,
  _surface: ToolSurface,
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function approveSurface(
  _pool: TenantPool,
  _ctx: TenantContext,
  _serverId: string,
  _input: { digest: string; selfApproval: boolean },
  _actor: { userId: string; kind: "user" },
  _opts?: { clock?: Clock },
): Promise<{ server: ToolServerRecord; blocks: string[] }> {
  throw new Error("not implemented");
}

export async function getToolServer(
  _pool: TenantPool,
  _ctx: TenantContext,
  _serverId: string,
): Promise<ToolServerRecord | null> {
  throw new Error("not implemented");
}

export async function getToolServerDetail(
  _pool: TenantPool,
  _ctx: TenantContext,
  _serverId: string,
): Promise<ToolServerDetail | null> {
  throw new Error("not implemented");
}

export async function listToolServers(
  _pool: TenantPool,
  _ctx: TenantContext,
  _page: { limit: number; after: string | null },
): Promise<ToolServerRecord[]> {
  throw new Error("not implemented");
}
