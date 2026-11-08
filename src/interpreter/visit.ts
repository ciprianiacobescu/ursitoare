import type {
  BlockDef,
  Catalogue,
  Flow,
  FlowNode,
  JsonValue,
  ProducedTaint,
  Taint,
} from "../authoring/index.ts";
import { nodeInputTaint, producedTaint } from "../authoring/index.ts";
import { attemptStepName } from "./hooks/names.ts";
import { createHookPipeline } from "./hooks/pipeline.ts";
import type { FusedStored, HookRetry } from "./hooks/pipeline.ts";
import type { HookTraceEntry } from "./hooks/types.ts";
import type { RunError, RunRecord, StepWrite, TenantContext } from "../runs/index.ts";
import { isDurableCancellation } from "../durable/index.ts";
import { resolveValue } from "./refs.ts";
import { InterpreterError, toInterpreterError } from "./errors.ts";
import type { RunTaints } from "./taint.ts";
import type {
  EffectGate,
  InterpreterDeps,
  NodeOutcome,
  NodeRuntime,
  NodeServices,
  RunScope,
  StepContext,
  ToolInvoker,
  WorkflowOps,
} from "./types.ts";

function runErrorOf(error: InterpreterError, nodeId: string): RunError {
  const runError: RunError = {
    code: error.code,
    message: error.message,
    node: error.node ?? nodeId,
  };
  if (Object.keys(error.details).length > 0) runError.details = { ...error.details };
  return runError;
}

export interface VisitRequest {
  readonly run: RunRecord;
  readonly nodeId: string;
  readonly node: FlowNode;
  readonly seq: number;
  readonly blocks: Readonly<Record<string, BlockDef>>;
  readonly scope: RunScope;
  readonly deps: InterpreterDeps;
  readonly tenant: TenantContext;
  readonly ops: WorkflowOps;
  readonly invoker: ToolInvoker;
  readonly runtime: NodeRuntime;
  readonly taints: RunTaints;
  readonly now: Date;
  readonly flow: Flow;
  readonly catalogue: Catalogue;
  readonly from: string | null;
}

function hookInputFor(
  node: FlowNode,
  resolve: (value: unknown) => JsonValue,
): JsonValue | null | undefined {
  try {
    if (node.kind === "end") return node.output === undefined ? null : resolve(node.output);
    return inputFor(node, resolve);
  } catch {
    return undefined;
  }
}

function inputFor(node: FlowNode, resolve: (value: unknown) => JsonValue): JsonValue | null {
  switch (node.kind) {
    case "block":
      return resolve(node.with);
    case "code":
      return resolve(node.input);
    case "switch":
      return { on: resolve(node.on) };
    case "wait":
      return { duration: node.duration };
    case "end":
      return null;
    default:
      return null;
  }
}

function invalidOutcome(nodeId: string): InterpreterError {
  return new InterpreterError(
    "NODE_RUNTIME_INVALID",
    `node "${nodeId}" returned neither one successor nor one end`,
    nodeId,
  );
}

export async function visitNode(
  request: VisitRequest,
): Promise<{ outcome: NodeOutcome; attempts: number; produced: ProducedTaint }> {
  let attempt = 1;
  let retry: HookRetry | undefined;
  for (;;) {
    const result = await visitAttempt(request, attempt, retry);
    if (result.retry === null) {
      return { outcome: result.outcome, attempts: attempt, produced: result.produced };
    }
    retry = result.retry;
    attempt += 1;
  }
}

async function visitAttempt(
  request: VisitRequest,
  attempt: number,
  retry: HookRetry | undefined,
): Promise<{ outcome: NodeOutcome; retry: HookRetry | null; produced: ProducedTaint }> {
  const { run, nodeId, node, blocks, scope, deps, tenant, ops, invoker, runtime, taints, now } =
    request;
  const seq = request.seq + attempt - 1;

  const resolve = (value: unknown): JsonValue => resolveValue(value, scope);

  const rowTaint: Taint = nodeInputTaint(node, taints.taintOf);

  let input: JsonValue | null = null;
  try {
    input = inputFor(node, resolve);
  } catch {
    input = null;
  }

  const def = node.kind === "block" ? blocks[node.uses] : undefined;
  const ctx: StepContext = {
    tenant,
    runId: run.runId,
    lineageId: run.lineageId,
    flowId: run.flowId,
    flowHash: run.flowHash,
    nodeId,
    kind: node.kind,
    mode: run.mode,
    attempt,
    effect: def?.effect ?? null,
    unsafeToRetry: def?.unsafe_to_retry === true,
    idemKey: null,
    principal: run.principal,
    now,
  };

  const entries: HookTraceEntry[] = [];
  const hookDeps: InterpreterDeps = {
    ...deps,
    hookObserver: (observedNodeId, entry) => {
      entries.push(entry);
      return deps.hookObserver?.(observedNodeId, entry);
    },
  };

  const pipeline = createHookPipeline({
    flow: request.flow,
    catalogue: request.catalogue,
    nodeId,
    node,
    from: request.from,
    def,
    ctx,
    deps: hookDeps,
    invoker,
    ops,
    scope,
    resolve,
    block: (ref) => blocks[ref],
    baseInput: hookInputFor(node, resolve),
    baseTaint: rowTaint,
    taintOf: taints.taintOf,
    ...(retry === undefined ? {} : { retry }),
  });

  const started: StepWrite = {
    runId: run.runId,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt,
    generation: 0,
    seq,
    kind: node.kind,
    state: "started",
    input: input as StepWrite["input"],
    output: null,
    outcome: null,
    error: null,
    taint: rowTaint,
    policyDecisionId: null,
    idemKey: null,
    startedAt: now,
    endedAt: null,
  };

  const writeFinal = async (
    finalState: "completed" | "failed",
    output: JsonValue | null,
    outcome: string | null,
    error: RunError | null,
    idemKey: string | null,
  ): Promise<void> => {
    const hookState = pipeline?.state;
    const skipped = hookState !== undefined && hookState.skipped !== null;
    const state = finalState === "completed" && skipped ? "skipped" : finalState;
    const rowInput = hookState?.changed === true ? hookState.input : input;
    const step: StepWrite = {
      runId: run.runId,
      nodeId,
      effectSeq: 0,
      turn: 0,
      attempt,
      generation: 0,
      seq,
      kind: node.kind,
      state,
      input: rowInput as StepWrite["input"],
      output: output as StepWrite["output"],
      outcome,
      error,
      taint: hookState?.taint ?? rowTaint,
      policyDecisionId: null,
      idemKey,
      startedAt: now,
      endedAt: deps.clock.now(),
    };
    if (entries.length > 0) {
      step.hooks = {
        inputOriginal: entries.some((entry) => entry.mutated === "input")
          ? (input as StepWrite["input"])
          : null,
        entries,
      };
    }
    try {
      await deps.store.recordStep(tenant, step);
    } catch (writeError) {
      if (state !== "failed") throw writeError;
    }
  };

  let wrote = false;
  let storeWriteError: unknown = null;
  let idemKey: string | null = null;

  const rememberKey = (value: unknown): void => {
    if (typeof value !== "object" || value === null || Array.isArray(value)) return;
    const candidate = (value as { idemKey?: unknown }).idemKey;
    if (typeof candidate === "string") idemKey = candidate;
  };

  const shouldFinalize = (): boolean => wrote || entries.length > 0;

  const wrappedOps: WorkflowOps = {
    get workflowId(): string {
      return ops.workflowId;
    },
    async runStep<T extends JsonValue>(stepName: string, fn: () => Promise<T>): Promise<T> {
      const name = attemptStepName(stepName, attempt);
      const writeStarted = async (): Promise<void> => {
        if (wrote) return;
        wrote = true;
        try {
          await deps.store.recordStep(tenant, started);
        } catch (error) {
          storeWriteError = error;
          throw error;
        }
      };
      if (pipeline === null || !pipeline.fuses) {
        const value = await ops.runStep<T>(name, async () => {
          await writeStarted();
          return fn();
        });
        rememberKey(value);
        return value;
      }
      let ran = false;
      const stored = await ops.runStep<JsonValue>(name, async () => {
        ran = true;
        await writeStarted();
        return (await pipeline.fusedStep(fn)) as unknown as JsonValue;
      });
      const unwrapped = pipeline.unwrap(stored as unknown as FusedStored, ran) as T;
      rememberKey(unwrapped);
      return unwrapped;
    },
    sleep(ms: number): Promise<void> {
      return ops.sleep(ms);
    },
  };

  const wrappedEffects: EffectGate = {
    async before(call, context) {
      const decision = await deps.effects.before(call, context);
      idemKey = decision.idemKey;
      return decision;
    },
    async after(call, context, result) {
      if (context.idemKey !== null) idemKey = context.idemKey;
      await deps.effects.after(call, context, result);
    },
  };

  const services: NodeServices = {
    ops: wrappedOps,
    invoker,
    effects: wrappedEffects,
    resolve,
    block: (ref) => blocks[ref],
    ...(deps.sandbox === undefined ? {} : { sandbox: deps.sandbox }),
    ...(pipeline === null ? {} : { hooks: pipeline.hooks }),
  };

  await pipeline?.runOwnPre();

  let outcome: NodeOutcome;
  try {
    outcome = await runtime.execute(node, ctx, services);
  } catch (error) {
    if (error === storeWriteError) throw error;
    if (isDurableCancellation(error)) throw error;
    const mapped =
      toInterpreterError(error) ??
      new InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", nodeId);
    const rowError = runErrorOf(mapped, nodeId);
    if (shouldFinalize()) await writeFinal("failed", null, null, rowError, idemKey);
    throw new InterpreterError(mapped.code, mapped.message, mapped.node ?? nodeId, {
      ...mapped.details,
    });
  }

  if (outcome.end !== null) {
    if (outcome.next !== null) {
      const error = invalidOutcome(nodeId);
      if (shouldFinalize()) await writeFinal("failed", null, null, runErrorOf(error, nodeId), idemKey);
      throw error;
    }
    if (outcome.end.status === "failed") {
      const error = new InterpreterError(
        "FLOW_FAILED",
        `flow ended failed at node "${nodeId}"`,
        nodeId,
      );
      if (shouldFinalize()) await writeFinal("failed", null, null, runErrorOf(error, nodeId), idemKey);
      throw error;
    }
  } else if (outcome.next === null) {
    const error = invalidOutcome(nodeId);
    if (shouldFinalize()) await writeFinal("failed", null, null, runErrorOf(error, nodeId), idemKey);
    throw error;
  }

  let next: HookRetry | null = null;
  if (pipeline !== null) {
    try {
      const posted = await pipeline.runOwnPost(outcome);
      outcome = posted.outcome;
      next = posted.retry;
    } catch (error) {
      if (isDurableCancellation(error)) throw error;
      const mapped =
        toInterpreterError(error) ??
        new InterpreterError("HOOK_ERROR", "hook failed", nodeId, { fault: "unknown" });
      if (shouldFinalize()) {
        await writeFinal("failed", outcome.output, outcome.outcome, runErrorOf(mapped, nodeId), idemKey);
      }
      throw new InterpreterError(mapped.code, mapped.message, mapped.node ?? nodeId, {
        ...mapped.details,
      });
    }
  }

  if (shouldFinalize()) await writeFinal("completed", outcome.output, outcome.outcome, null, idemKey);
  const produced =
    pipeline?.produced() ?? producedTaint(node, rowTaint, request.catalogue);
  return { outcome, retry: next, produced };
}
