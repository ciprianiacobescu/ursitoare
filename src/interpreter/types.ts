// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type {
  BlockDef,
  Catalogue,
  Effect,
  Flow,
  FlowNode,
  HookPhase,
  JsonValue,
  NodeKind,
} from "../authoring/index.ts";
import type { Clock, IdSource } from "../core/index.ts";
import type { DurableRuntime } from "../durable/index.ts";
import type { Permit } from "../pdp/index.ts";
import type { VersionState } from "../registry/index.ts";
import type { RunRecord, RunStore, TenantContext } from "../runs/index.ts";
import type { WorkerSandbox } from "../sandbox/index.ts";
import type { HookTraceEntry, NodeHooks } from "./hooks/types.ts";

export type EffectMode = "live" | "mock" | "stub";

export interface ToolCall {
  tool: string;
  args: JsonValue;
  nodeId: string;
  effectSeq: number;
  phase?: "pre" | "post";
  hookId?: string;
  generation?: number;
}

export interface ToolResult {
  output: JsonValue;
}

export interface RunPrincipal {
  userId: string;
  kind: "human" | "service";
}

export interface StepContext {
  readonly tenant: TenantContext;
  readonly runId: string;
  readonly lineageId: string;
  readonly flowId: string;
  readonly flowHash: string;
  readonly nodeId: string;
  readonly kind: NodeKind;
  readonly mode: EffectMode;
  readonly attempt: number;
  readonly effect: Effect | null;
  readonly unsafeToRetry: boolean;
  readonly idemKey: string | null;
  readonly principal: RunPrincipal;
  readonly now: Date;
  readonly hook?: { phase: HookPhase; label: string };
  readonly authorization?: CallAuthorization;
  readonly taint?: readonly string[];
}

export interface CallAuthorization {
  readonly decisionId: string;
  readonly permit: Permit;
}

export interface ToolInvoker {
  invoke(call: ToolCall, ctx: StepContext): Promise<ToolResult>;
  authorize?(call: ToolCall, ctx: StepContext): Promise<CallAuthorization>;
}

export type EffectDecision =
  | { action: "invoke"; idemKey: string | null }
  | { action: "reuse"; idemKey: string; result: ToolResult }
  | { action: "unknown"; idemKey: string };

export interface EffectGate {
  before(call: ToolCall, ctx: StepContext): Promise<EffectDecision>;
  after(call: ToolCall, ctx: StepContext, result: ToolResult): Promise<void>;
}

export interface WorkflowOps {
  readonly workflowId: string;
  runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T>;
  sleep(ms: number): Promise<void>;
}

export interface NodeOutcome {
  output: JsonValue | null;
  outcome: string | null;
  next: string | null;
  end: { status: "completed" | "failed" } | null;
}

export interface NodeServices {
  ops: WorkflowOps;
  invoker: ToolInvoker;
  effects: EffectGate;
  resolve(value: unknown): JsonValue;
  block(ref: string): BlockDef | undefined;
  sandbox?: WorkerSandbox;
  hooks?: NodeHooks;
  inputTaint?: () => readonly string[];
  decided?: (decisionId: string) => void;
}

export interface NodeRuntime {
  execute(node: FlowNode, ctx: StepContext, services: NodeServices): Promise<NodeOutcome>;
}

export interface LoadedVersion {
  flowId: string;
  hash: string;
  state: VersionState;
  ownerTeam: string;
  flow: Flow;
}

export type VersionLoader = (
  ctx: TenantContext,
  flowId: string,
  hash: string,
) => Promise<LoadedVersion | null>;

export interface InterpreterDeps {
  store: RunStore;
  durable: Pick<DurableRuntime, "enqueue"> | null;
  loadVersion: VersionLoader;
  catalogueFor: (ctx: TenantContext) => Promise<Catalogue>;
  invokerFor: (mode: EffectMode, run: RunRecord) => Promise<ToolInvoker>;
  effects: EffectGate;
  clock: Clock;
  ids: IdSource;
  sandbox?: WorkerSandbox;
  hookObserver?: (nodeId: string, entry: HookTraceEntry) => void;
}

export interface StartRunRequest {
  flowId: string;
  hash: string;
  mode: EffectMode;
  input: JsonValue;
  mocks: JsonValue | null;
  principal: RunPrincipal;
  actorChain: readonly string[];
  runId?: string;
}

export interface RunScope {
  inputs: JsonValue;
  nodes: ReadonlyMap<string, { output: JsonValue | null; outcome: string | null }>;
}
