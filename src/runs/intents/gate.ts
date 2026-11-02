// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PayloadValue, RunMode, TenantContext, TenantPool } from "../store/types.ts";

export interface IntentCall {
  tool: string;
  args: PayloadValue;
  nodeId: string;
  effectSeq: number;
}

export interface IntentContext {
  tenant: TenantContext;
  runId: string;
  lineageId: string;
  mode: RunMode;
  unsafeToRetry: boolean;
  now: Date;
}

export type IntentDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: { output: PayloadValue } }
  | { action: "unknown"; idemKey: string };

export interface EffectIntents {
  before(call: IntentCall, ctx: IntentContext): Promise<IntentDecision>;
  after(call: IntentCall, ctx: IntentContext, result: { output: PayloadValue }): Promise<void>;
}

export function createEffectIntents(_pool: TenantPool): EffectIntents {
  throw new Error("not implemented");
}
