import type { BlockDef, JsonValue } from "../authoring/index.ts";
import type {
  RunError,
  RunRecord,
  RunState,
  RunTransition,
  TenantContext,
} from "../runs/index.ts";
import { InterpreterError, toInterpreterError } from "./errors.ts";
import { nodeRuntimeFor } from "./registry.ts";
import type {
  InterpreterDeps,
  LoadedVersion,
  NodeOutcome,
  RunScope,
  WorkflowOps,
} from "./types.ts";
import { visitNode } from "./visit.ts";

interface LoadValue {
  run: RunRecord;
  version: LoadedVersion | null;
  blocks: Record<string, BlockDef>;
  input: JsonValue | null;
  error: RunError | null;
}

const TERMINAL: readonly RunState[] = ["completed", "failed", "cancelled"];

function asJson<T>(value: T): JsonValue {
  return value as unknown as JsonValue;
}

function runRecord(value: JsonValue): RunRecord {
  return value as unknown as RunRecord;
}

function notFound(flowId: string, hash: string, reason: string): RunError {
  return {
    code: "INTERPRETER_VERSION_NOT_FOUND",
    message: `flow "${flowId}" version "${hash}" ${reason}`,
    node: null,
  };
}

function inputInvalid(message: string): RunError {
  return { code: "INTERPRETER_INPUT_INVALID", message, node: null };
}

async function finishCompleted(
  ops: WorkflowOps,
  deps: InterpreterDeps,
  tenant: TenantContext,
  runId: string,
  output: JsonValue | null,
  terminalNode: string,
): Promise<RunRecord> {
  const value = await ops.runStep<JsonValue>("run:finish", async () => {
    const change: RunTransition = {
      state: "completed",
      from: ["queued", "running"],
      at: deps.clock.now(),
      terminalNode,
    };
    if (output !== null) change.output = output;
    const updated = await deps.store.transition(tenant, runId, change);
    if (updated !== null) return asJson(updated);
    const current = await deps.store.getRun(tenant, runId);
    if (current === null) {
      throw new InterpreterError(
        "INTERPRETER_VERSION_NOT_FOUND",
        `run "${runId}" was not found`,
        null,
        { reason: "run_missing" },
      );
    }
    return asJson(current);
  });
  return runRecord(value);
}

async function finishFailed(
  ops: WorkflowOps,
  deps: InterpreterDeps,
  tenant: TenantContext,
  runId: string,
  error: RunError,
): Promise<RunRecord> {
  const value = await ops.runStep<JsonValue>("run:finish", async () => {
    const change: RunTransition = {
      state: "failed",
      from: ["queued", "running"],
      at: deps.clock.now(),
      error,
    };
    if (error.node !== null) change.terminalNode = error.node;
    const updated = await deps.store.transition(tenant, runId, change);
    if (updated !== null) return asJson(updated);
    const current = await deps.store.getRun(tenant, runId);
    if (current === null) {
      throw new InterpreterError(
        "INTERPRETER_VERSION_NOT_FOUND",
        `run "${runId}" was not found`,
        null,
        { reason: "run_missing" },
      );
    }
    return asJson(current);
  });
  return runRecord(value);
}

async function loadValue(
  deps: InterpreterDeps,
  tenant: TenantContext,
  runId: string,
): Promise<LoadValue> {
  const run = await deps.store.getRun(tenant, runId);
  if (run === null) {
    throw new InterpreterError(
      "INTERPRETER_VERSION_NOT_FOUND",
      `run "${runId}" was not found`,
      null,
      { reason: "run_missing" },
    );
  }

  let version: LoadedVersion | null = null;
  let error: RunError | null = null;
  try {
    version = await deps.loadVersion(tenant, run.flowId, run.flowHash);
  } catch {
    error = notFound(run.flowId, run.flowHash, "could not be loaded (load_failed)");
  }
  if (version === null && error === null) {
    error = notFound(run.flowId, run.flowHash, "was not found");
  }

  const blocks: Record<string, BlockDef> = {};
  if (version !== null && error === null) {
    try {
      const catalogue = await deps.catalogueFor(tenant);
      for (const node of Object.values(version.flow.nodes)) {
        if (node.kind !== "block") continue;
        const def = catalogue.block(node.uses);
        if (def !== undefined) blocks[node.uses] = def;
      }
    } catch {
      error = notFound(run.flowId, run.flowHash, "catalogue_failed");
    }
  }

  let input: JsonValue | null = null;
  if (version !== null && error === null) {
    if (run.inputRef === null) {
      error = inputInvalid(`run "${runId}" has no input payload`);
    } else {
      const payload = await deps.store.getPayload(tenant, run.inputRef);
      if (payload === null) {
        error = inputInvalid(`input payload of run "${runId}" is missing`);
      } else {
        input = payload.data as JsonValue;
      }
    }
  }

  return { run, version, blocks, input, error };
}

export async function executeRun(
  ops: WorkflowOps,
  deps: InterpreterDeps,
  ctx: TenantContext,
  runId: string,
): Promise<RunRecord> {
  const loadedValue = await ops.runStep<JsonValue>("run:load", async () =>
    asJson(await loadValue(deps, ctx, runId)),
  );
  const loaded = loadedValue as unknown as LoadValue;

  if (loaded.error !== null) {
    return finishFailed(ops, deps, ctx, runId, loaded.error);
  }
  if (TERMINAL.includes(loaded.run.state)) {
    return loaded.run;
  }
  const version = loaded.version;
  if (version === null) {
    return finishFailed(ops, deps, ctx, runId, inputInvalid(`run "${runId}" is not runnable`));
  }

  const startValue = await ops.runStep<JsonValue>("run:start", async () => {
    const updated = await deps.store.transition(ctx, runId, {
      state: "running",
      from: ["queued", "running"],
      at: deps.clock.now(),
    });
    return asJson({ started: updated !== null });
  });
  const start = startValue as unknown as { started: boolean };
  if (!start.started) {
    const current = await deps.store.getRun(ctx, runId);
    if (current === null) {
      throw new InterpreterError(
        "INTERPRETER_VERSION_NOT_FOUND",
        `run "${runId}" was not found`,
        null,
        { reason: "run_missing" },
      );
    }
    return current;
  }

  let invoker;
  try {
    invoker = await deps.invokerFor(loaded.run.mode, loaded.run);
  } catch {
    return finishFailed(ops, deps, ctx, runId, {
      code: "INTERPRETER_NO_INVOKER",
      message: `no tool invoker is available for run "${runId}"`,
      node: null,
    });
  }

  const flow = version.flow;
  const scope: RunScope = {
    inputs: loaded.input as JsonValue,
    nodes: new Map<string, { output: JsonValue | null; outcome: string | null }>(),
  };

  let current = flow.start;
  let seq = 0;
  const visited = new Set<string>();
  let completed: { output: JsonValue | null; terminalNode: string } | null = null;
  let failure: InterpreterError | null = null;

  while (completed === null && failure === null) {
    if (visited.has(current)) {
      failure = new InterpreterError(
        "INTERPRETER_LOOP_LIMIT",
        `node "${current}" was visited twice`,
        current,
      );
      break;
    }
    visited.add(current);
    const node = Object.hasOwn(flow.nodes, current) ? flow.nodes[current] : undefined;
    if (node === undefined) {
      failure = new InterpreterError(
        "NODE_RUNTIME_INVALID",
        `node "${current}" is not defined in the flow`,
        current,
      );
      break;
    }
    const runtime = nodeRuntimeFor(node.kind);
    if (runtime === undefined) {
      failure = new InterpreterError(
        "INTERPRETER_KIND_UNSUPPORTED",
        `node "${current}" has unsupported kind "${node.kind}"`,
        current,
        { kind: node.kind },
      );
      break;
    }

    const nodeId = current;
    let outcome: NodeOutcome;
    try {
      outcome = await visitNode({
        run: loaded.run,
        nodeId,
        node,
        seq,
        blocks: loaded.blocks,
        scope,
        deps,
        tenant: ctx,
        ops,
        invoker,
        runtime,
        now: deps.clock.now(),
      });
    } catch (error) {
      const interpreted = toInterpreterError(error);
      if (interpreted !== null) {
        failure = interpreted;
        break;
      }
      throw error;
    }

    seq += 1;
    (scope.nodes as Map<string, { output: JsonValue | null; outcome: string | null }>).set(
      nodeId,
      { output: outcome.output, outcome: outcome.outcome },
    );

    if (outcome.end !== null) {
      completed = { output: outcome.output, terminalNode: nodeId };
      break;
    }
    current = outcome.next as string;
  }

  if (failure !== null) {
    const runError: RunError = {
      code: failure.code,
      message: failure.message,
      node: failure.node,
    };
    if (Object.keys(failure.details).length > 0) runError.details = { ...failure.details };
    return finishFailed(ops, deps, ctx, runId, runError);
  }
  if (completed === null) {
    throw new InterpreterError(
      "NODE_RUNTIME_INVALID",
      `flow "${version.flowId}" produced no outcome`,
      null,
    );
  }
  return finishCompleted(
    ops,
    deps,
    ctx,
    runId,
    completed.output,
    completed.terminalNode,
  );
}
