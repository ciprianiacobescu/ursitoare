// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { blockHookRunner } from "./hooks/block-runner.ts";
import { codeHookRunner } from "./hooks/code-runner.ts";
import { registerHookRunner } from "./hooks/registry.ts";
import { registerNodeRuntime } from "./registry.ts";
import { blockRuntime } from "./runtimes/block.ts";
import { codeRuntime } from "./runtimes/code.ts";
import { endRuntime } from "./runtimes/end.ts";
import { switchRuntime } from "./runtimes/switch.ts";
import { waitRuntime } from "./runtimes/wait.ts";

registerHookRunner("code", codeHookRunner);
registerHookRunner("block", blockHookRunner);
registerNodeRuntime("block", blockRuntime);
registerNodeRuntime("code", codeRuntime);
registerNodeRuntime("switch", switchRuntime);
registerNodeRuntime("end", endRuntime);
registerNodeRuntime("wait", waitRuntime);

export type {
  EffectMode,
  ToolCall,
  ToolResult,
  RunPrincipal,
  StepContext,
  ToolInvoker,
  EffectDecision,
  EffectGate,
  WorkflowOps,
  NodeOutcome,
  NodeServices,
  NodeRuntime,
  LoadedVersion,
  VersionLoader,
  InterpreterDeps,
  StartRunRequest,
  RunScope,
} from "./types.ts";
export { NO_EFFECT_GATE } from "./gate.ts";
export type { MemoryWorkflowOps } from "./ops.ts";
export { memoryWorkflowOps } from "./ops.ts";
export { registerNodeRuntime, nodeRuntimeFor, SUPPORTED_KINDS } from "./registry.ts";
export { codeRuntime, CODE_LIMITS, codeSeed } from "./runtimes/code.ts";
export { RUN_WORKFLOW, registerRunWorkflow, bindInterpreter, dbosWorkflowOps } from "./workflow.ts";
export { startRun, workflowIdOf } from "./start.ts";
export { executeRun } from "./execute.ts";
export type { RunTaints } from "./taint.ts";
export { blocksCatalogue, createRunTaints } from "./taint.ts";
export { resolveValue, durationMs } from "./refs.ts";
export type { MockEntry, TestMocks, MockProblem } from "./mocks.ts";
export type { DryRunFakes, FakeProblem } from "./fakes.ts";
export { checkFakes } from "./fakes.ts";
export { checkMocks, createMockInvoker, testRunInvokers } from "./mocks.ts";
export type {
  HookActionVerdict,
  HookContext,
  HookOutcome,
  HookRun,
  HookRunner,
  HookServices,
  HookStepSite,
  HookTraceEntry,
  NodeHooks,
  PreHookResult,
} from "./hooks/types.ts";
export {
  blockHookRunner,
  hookBlockRefs,
  hookMockKey,
  resolveHookValue,
} from "./hooks/block-runner.ts";
export type { HookValues } from "./hooks/block-runner.ts";
export { HOOK_LIMITS, codeHookRunner, runCodeHook } from "./hooks/code-runner.ts";
export { hookRunnerFor, registerHookRunner } from "./hooks/registry.ts";
export {
  attemptStepName,
  hookSlot,
  hookStepName,
  isFusable,
  splitFused,
} from "./hooks/names.ts";
export { checkHookAction, normalizeHookReturn } from "./hooks/actions.ts";
export { approvalsOnPath } from "./hooks/approvals.ts";
export type { Approval, PathStep } from "./hooks/approvals.ts";
export type { InterpreterErrorCode } from "./errors.ts";
export { InterpreterError } from "./errors.ts";
