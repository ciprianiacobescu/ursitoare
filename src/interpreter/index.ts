// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { registerNodeRuntime } from "./registry.ts";
import { endRuntime } from "./runtimes/end.ts";
import { switchRuntime } from "./runtimes/switch.ts";
import { waitRuntime } from "./runtimes/wait.ts";

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
export { RUN_WORKFLOW, registerRunWorkflow, bindInterpreter, dbosWorkflowOps } from "./workflow.ts";
export { startRun, workflowIdOf } from "./start.ts";
export { executeRun } from "./execute.ts";
export { resolveValue, durationMs } from "./refs.ts";
export type { InterpreterErrorCode } from "./errors.ts";
export { InterpreterError } from "./errors.ts";
