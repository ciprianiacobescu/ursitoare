// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Clock } from "../core/index.ts";
import type { TenantContext, TenantPool, TenantTx } from "../tenancy/index.ts";
import type { AuditEventInput } from "./event.ts";

export interface AppendOptions {
  clock?: Clock;
}

export async function appendAudit(
  _tx: TenantTx,
  _ctx: TenantContext,
  _event: AuditEventInput,
  _opts?: AppendOptions,
): Promise<{ seq: bigint; hash: string }> {
  throw new Error("not implemented");
}

export async function appendAuditCommitted(
  _pool: TenantPool,
  _ctx: TenantContext,
  _event: AuditEventInput,
  _opts?: AppendOptions,
): Promise<{ seq: bigint; hash: string }> {
  throw new Error("not implemented");
}
