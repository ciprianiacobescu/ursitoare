// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { TenantContext, TenantTx, TenantPool } from "../../tenancy/index.ts";
import type { TenantContext, TenantTx } from "../../tenancy/index.ts";

export type PayloadValue =
  | null
  | boolean
  | number
  | string
  | PayloadValue[]
  | { [key: string]: PayloadValue };

export type RunMode = "live" | "mock" | "stub";

export type RunState = "queued" | "running" | "completed" | "failed" | "cancelled";

export type StepState = "started" | "completed" | "failed" | "skipped";

export interface RunError {
  code: string;
  message: string;
  node: string | null;
  details?: Readonly<Record<string, string | string[]>>;
}

export interface RunPrincipalRecord {
  userId: string;
  kind: "human" | "service";
}

export interface PayloadRef {
  sha256: string;
  size: number;
}

export interface StoredPayload {
  sha256: string;
  mediaType: string;
  size: number;
  data: PayloadValue;
  pinned: boolean;
}

export interface NewRun {
  runId: string;
  lineageId: string;
  parentRunId: string | null;
  flowId: string;
  flowHash: string;
  ownerTeam: string;
  mode: RunMode;
  trigger: "test";
  principal: RunPrincipalRecord;
  actorChain: readonly string[];
  input: PayloadValue;
  mocks: PayloadValue | null;
}

export interface RunRecord {
  runId: string;
  lineageId: string;
  parentRunId: string | null;
  flowId: string;
  flowHash: string;
  ownerTeam: string;
  mode: RunMode;
  trigger: "test";
  state: RunState;
  principal: RunPrincipalRecord;
  actorChain: string[];
  inputRef: string | null;
  mocksRef: string | null;
  outputRef: string | null;
  error: RunError | null;
  terminalNode: string | null;
  runDay: string;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface RunTransition {
  state: RunState;
  from: readonly RunState[];
  at: Date;
  output?: PayloadValue;
  error?: RunError;
  terminalNode?: string;
}

export interface RunCursor {
  createdAt: string;
  runId: string;
}

export interface RunListQuery {
  limit: number;
  after?: RunCursor;
  flowId?: string;
  state?: RunState;
  filter: { sql: string; values: unknown[] };
}

export interface StepWrite {
  runId: string;
  nodeId: string;
  effectSeq: number;
  turn: number;
  attempt: number;
  generation: number;
  seq: number;
  kind: string;
  state: StepState;
  input: PayloadValue | null;
  output: PayloadValue | null;
  outcome: string | null;
  error: RunError | null;
  taint: readonly string[];
  policyDecisionId: string | null;
  idemKey: string | null;
  hooks?: StepHooksWrite | null;
  startedAt: Date;
  endedAt: Date | null;
}

export interface StepRecord {
  runId: string;
  nodeId: string;
  effectSeq: number;
  turn: number;
  attempt: number;
  generation: number;
  seq: number;
  kind: string;
  state: StepState;
  inputRef: string | null;
  outputRef: string | null;
  outcome: string | null;
  error: RunError | null;
  taint: string[];
  policyDecisionId: string | null;
  idemKey: string | null;
  hooks?: StepHooks;
  startedAt: string;
  endedAt: string | null;
}

export interface StepHookEntry {
  label: string;
  kind: "code" | "block";
  fused: boolean;
  attempt: number;
  state: "completed" | "failed";
  action: "continue" | "skip" | "redirect" | "retry" | "fail" | null;
  mutated: "input" | "output" | null;
  to: string | null;
  error: { code: string; message: string } | null;
  tool: string | null;
  idemKey: string | null;
}

export interface StepHooksWrite {
  inputOriginal: PayloadValue | null;
  entries: readonly StepHookEntry[];
}

export interface StepHooks {
  inputOriginalRef: string | null;
  entries: StepHookEntry[];
}

export interface RunRepository {
  create(tx: TenantTx, ctx: TenantContext, run: NewRun, at: Date): Promise<RunRecord>;
  get(tx: TenantTx, ctx: TenantContext, runId: string): Promise<RunRecord | null>;
  list(
    tx: TenantTx,
    ctx: TenantContext,
    q: RunListQuery,
  ): Promise<{ runs: RunRecord[]; next: RunCursor | null }>;
  transition(
    tx: TenantTx,
    ctx: TenantContext,
    runId: string,
    change: RunTransition,
  ): Promise<RunRecord | null>;
}

export interface StepRepository {
  upsert(tx: TenantTx, ctx: TenantContext, step: StepWrite): Promise<StepRecord>;
  list(
    tx: TenantTx,
    ctx: TenantContext,
    runId: string,
    q: { limit: number; afterSeq?: number },
  ): Promise<{ steps: StepRecord[]; next: number | null }>;
}

export interface EnvelopeStore {
  put(tx: TenantTx, ctx: TenantContext, value: PayloadValue): Promise<PayloadRef>;
  get(tx: TenantTx, ctx: TenantContext, sha256: string): Promise<StoredPayload | null>;
  referencedBy(tx: TenantTx, ctx: TenantContext, runId: string, sha256: string): Promise<boolean>;
}
