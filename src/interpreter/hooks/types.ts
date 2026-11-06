// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { BlockDef, JsonValue } from "../../authoring/index.ts";
import type { WorkerSandbox } from "../../sandbox/index.ts";
import type { EffectGate, RunScope, StepContext, ToolInvoker, WorkflowOps } from "../types.ts";
import type { HookPhase, HookPlacement, NodeMeta } from "../../authoring/index.ts";

export interface HookContext {
  phase: HookPhase;
  node: NodeMeta;
  from: NodeMeta | null;
  next: NodeMeta | null;
  next_candidates: NodeMeta[];
  input: JsonValue | null;
  output: JsonValue | null;
  outcome: string | null;
  attempt: number;
  feedback: JsonValue | null;
  args: JsonValue;
}

export type HookOutcome =
  | { action: "continue"; input?: JsonValue; output?: JsonValue }
  | { action: "skip"; output: JsonValue }
  | { action: "redirect"; to: string }
  | { action: "retry"; input?: JsonValue; feedback?: JsonValue }
  | { action: "fail"; reason: string };

export interface HookTraceEntry {
  label: string;
  kind: "code" | "block";
  fused: boolean;
  attempt: number;
  state: "completed" | "failed";
  action: HookOutcome["action"] | null;
  mutated: "input" | "output" | null;
  to: string | null;
  error: { code: string; message: string } | null;
  tool: string | null;
  idemKey: string | null;
}

export interface HookRun {
  outcome: HookOutcome;
  entry: HookTraceEntry;
}

export interface HookStepSite {
  fused: boolean;
  stepName: string;
  slot: number;
}

export interface HookServices {
  ops: WorkflowOps;
  invoker: ToolInvoker;
  effects: EffectGate;
  sandbox: WorkerSandbox | null;
  block(ref: string): BlockDef | undefined;
  resolve(value: unknown): JsonValue;
  scope: RunScope;
}

export interface HookRunner {
  run(
    placement: HookPlacement,
    hctx: HookContext,
    step: StepContext,
    services: HookServices,
    site: HookStepSite,
  ): Promise<HookRun>;
}

export type PreHookResult =
  | { action: "run"; input: JsonValue | null }
  | { action: "skip"; output: JsonValue };

export interface NodeHooks {
  pre(input: JsonValue | null): Promise<PreHookResult>;
  post(result: {
    output: JsonValue | null;
    outcome: string | null;
    next: string | null;
  }): Promise<{ output: JsonValue | null }>;
}

export type HookActionVerdict =
  | { allowed: true }
  | { allowed: false; code: "HOOK_ACTION_FORBIDDEN" | "HOOK_ROUTE_UNDECLARED"; what: string };
