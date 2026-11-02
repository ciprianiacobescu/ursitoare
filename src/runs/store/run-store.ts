// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import type {
  NewRun,
  RunRecord,
  RunTransition,
  StepRecord,
  StepWrite,
  StoredPayload,
} from "./types.ts";

export interface RunStore {
  createRun(ctx: TenantContext, run: NewRun, at: Date): Promise<RunRecord>;
  getRun(ctx: TenantContext, runId: string): Promise<RunRecord | null>;
  transition(ctx: TenantContext, runId: string, change: RunTransition): Promise<RunRecord | null>;
  recordStep(ctx: TenantContext, step: StepWrite): Promise<StepRecord>;
  listSteps(
    ctx: TenantContext,
    runId: string,
    q: { limit: number; afterSeq?: number },
  ): Promise<{ steps: StepRecord[]; next: number | null }>;
  getPayload(ctx: TenantContext, sha256: string): Promise<StoredPayload | null>;
}

export function createRunStore(_pool: TenantPool): RunStore {
  throw new Error("not implemented");
}
