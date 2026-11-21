// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "../../audit/index.ts";
import type { Clock } from "../../core/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";
import type { ToolServerRecord } from "../types.ts";
import type { OpenApiOverlay } from "./types.ts";

export async function registerOpenApiServerTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _input: { id: string; origin: string; local: boolean; document: unknown; overlay: OpenApiOverlay },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}

export async function submitOpenApiTx(
  _tx: TenantTx,
  _ctx: TenantContext,
  _serverId: string,
  _input: { document: unknown; overlay: OpenApiOverlay },
  _actor: AuditEventInput["actor"],
  _opts?: { clock?: Clock },
): Promise<ToolServerRecord> {
  throw new Error("not implemented");
}
