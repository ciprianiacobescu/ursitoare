import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { envelopeStore } from "./envelope-store.ts";
import { runRepository } from "./run-repository.ts";
import { stepRepository } from "./step-repository.ts";
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

export function createRunStore(pool: TenantPool): RunStore {
  return {
    createRun(ctx, run, at) {
      return withTenantTx(pool, ctx, (tx) => runRepository.create(tx, ctx, run, at));
    },
    getRun(ctx, runId) {
      return withTenantTx(pool, ctx, (tx) => runRepository.get(tx, ctx, runId));
    },
    transition(ctx, runId, change) {
      return withTenantTx(pool, ctx, (tx) => runRepository.transition(tx, ctx, runId, change));
    },
    recordStep(ctx, step) {
      return withTenantTx(pool, ctx, (tx) => stepRepository.upsert(tx, ctx, step));
    },
    listSteps(ctx, runId, q) {
      return withTenantTx(pool, ctx, (tx) => stepRepository.list(tx, ctx, runId, q));
    },
    getPayload(ctx, sha256) {
      return withTenantTx(pool, ctx, (tx) => envelopeStore.get(tx, ctx, sha256));
    },
  };
}
