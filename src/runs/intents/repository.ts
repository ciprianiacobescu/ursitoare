// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PayloadValue, RunMode, TenantContext, TenantTx } from "../store/types.ts";

export type IntentState = "intent" | "done" | "unknown";

export interface IntentRecord {
  idemKey: string;
  runId: string;
  nodeId: string;
  tool: string;
  argsDigest: string;
  mode: RunMode;
  state: IntentState;
  resultRef: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface IntentWrite {
  idemKey: string;
  runId: string;
  nodeId: string;
  tool: string;
  args: PayloadValue;
  mode: RunMode;
}

export async function recordIntent(
  _tx: TenantTx,
  _ctx: TenantContext,
  _intent: IntentWrite,
  _at: Date,
): Promise<{ record: IntentRecord; created: boolean }> {
  throw new Error("not implemented");
}

export async function completeIntent(
  _tx: TenantTx,
  _ctx: TenantContext,
  _idemKey: string,
  _result: PayloadValue,
  _at: Date,
): Promise<IntentRecord> {
  throw new Error("not implemented");
}

export async function markIntentUnknown(
  _tx: TenantTx,
  _ctx: TenantContext,
  _idemKey: string,
  _at: Date,
): Promise<IntentRecord> {
  throw new Error("not implemented");
}

export async function getIntent(
  _tx: TenantTx,
  _ctx: TenantContext,
  _idemKey: string,
): Promise<IntentRecord | null> {
  throw new Error("not implemented");
}
