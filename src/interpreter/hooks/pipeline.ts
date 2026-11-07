import type {
  BlockDef,
  Catalogue,
  Flow,
  FlowNode,
  HookPhase,
  HookPlacement,
  JsonValue,
  NodeMeta,
} from "../../authoring/index.ts";
import { augmentedSuccessors, hookPlacements, nodeMeta, whenMatches } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import { resolveValue } from "../refs.ts";
import { checkSchema } from "../schema.ts";
import type {
  InterpreterDeps,
  NodeOutcome,
  RunScope,
  StepContext,
  ToolInvoker,
  WorkflowOps,
} from "../types.ts";
import { checkHookAction } from "./actions.ts";
import { attemptStepName, hookSlot, hookStepName, splitFused } from "./names.ts";
import { hookRunnerFor } from "./registry.ts";
import type {
  HookContext,
  HookRun,
  HookRunner,
  HookServices,
  HookTraceEntry,
  NodeHooks,
} from "./types.ts";

export interface FusedRecord {
  phase: HookPhase;
  name: string;
  run: HookRun;
}

export interface FusedStored {
  value: JsonValue;
  __fused: FusedRecord[];
}

export interface HookState {
  input: JsonValue | null;
  changed: boolean;
  skipped: JsonValue | null;
}

export interface HookPipelineRequest {
  flow: Flow;
  catalogue: Catalogue;
  nodeId: string;
  node: FlowNode;
  from: string | null;
  def: BlockDef | undefined;
  ctx: StepContext;
  deps: InterpreterDeps;
  invoker: ToolInvoker;
  ops: WorkflowOps;
  scope: RunScope;
  resolve: (value: unknown) => JsonValue;
  block: (ref: string) => BlockDef | undefined;
  baseInput: JsonValue | null | undefined;
}

export interface HookPipeline {
  readonly fuses: boolean;
  readonly state: HookState;
  readonly hooks: NodeHooks;
  runOwnPre(): Promise<void>;
  runOwnPost(outcome: NodeOutcome): Promise<NodeOutcome>;
  fusedStep(run: () => Promise<JsonValue>): Promise<FusedStored>;
  unwrap(stored: FusedStored, ran: boolean): JsonValue;
}

interface View {
  input: JsonValue | null;
  output: JsonValue | null;
  outcome: string | null;
  next: string | null;
}

function observe(deps: InterpreterDeps, nodeId: string, entry: HookTraceEntry): void {
  try {
    const result: unknown = deps.hookObserver?.(nodeId, entry);
    if (typeof (result as { then?: unknown } | undefined)?.then === "function") {
      (result as Promise<unknown>).then(undefined, () => undefined);
    }
  } catch {
    // The observer is a diagnostic tap: nothing it throws changes the run.
  }
}

export function createHookPipeline(request: HookPipelineRequest): HookPipeline | null {
  const { flow, catalogue, nodeId, node, def, ctx, deps, scope } = request;
  const placements = hookPlacements(flow, nodeId, catalogue);
  if (placements.pre.length + placements.post.length === 0) return null;

  for (const placement of [...placements.pre, ...placements.post]) {
    const label = hookStepName(nodeId, placement);
    const kind = placement.hook.kind;
    if (hookRunnerFor(kind) === undefined) {
      throw new InterpreterError(
        "HOOK_UNSUPPORTED",
        `hook "${label}" has kind "${kind}", which has no runner`,
        nodeId,
        { hook: label, kind },
      );
    }
    if (kind === "code" && deps.sandbox === undefined) {
      throw new InterpreterError(
        "INTERPRETER_NO_SANDBOX",
        `no sandbox is available for hook "${label}"`,
        nodeId,
        { hook: label },
      );
    }
  }

  const { ownPre, fusedPre, fusedPost, ownPost } = splitFused(placements);
  const metaOf = (id: string | null): NodeMeta | null =>
    id === null ? null : nodeMeta(flow, id, catalogue);
  const nodeMetaOfThis: NodeMeta = metaOf(nodeId) ?? {
    id: nodeId,
    kind: node.kind,
    effect: null,
    tags: [],
  };
  const fromMeta = metaOf(request.from);
  const candidates = (augmentedSuccessors(flow, catalogue).get(nodeId) ?? [])
    .map((id) => metaOf(id))
    .filter((meta): meta is NodeMeta => meta !== null);
  const staticNext =
    node.kind === "block" || node.kind === "code" || node.kind === "wait"
      ? (node.next ?? null)
      : null;

  const state: HookState = {
    input: request.baseInput ?? null,
    changed: false,
    skipped: null,
  };
  let records: FusedRecord[] | null = null;

  const outputSchema = (): unknown =>
    node.kind === "block" ? def?.output : node.kind === "code" ? node.output_schema : undefined;

  const checkOutput = (output: JsonValue, label: string): void => {
    const schema = outputSchema();
    if (schema === undefined) return;
    const checked = checkSchema(schema, output);
    if (!checked.ok) {
      throw new InterpreterError(
        "INTERPRETER_OUTPUT_INVALID",
        `output of "${nodeId}" does not match its schema (hook "${label}")`,
        nodeId,
        { path: checked.path, keyword: checked.keyword, hook: label },
      );
    }
  };

  const unsupported = (label: string, action: string): InterpreterError =>
    new InterpreterError("HOOK_ERROR", `hook "${label}" failed (unsupported_action)`, nodeId, {
      hook: label,
      fault: "unsupported_action",
      action,
    });

  const exec = async (
    placement: HookPlacement,
    fused: boolean,
    view: View,
  ): Promise<HookRun> => {
    const label = hookStepName(nodeId, placement);
    const runner = hookRunnerFor(placement.hook.kind) as HookRunner;
    const post = placement.phase === "post";
    let hookScope = scope;
    if (post) {
      const nodes = new Map(scope.nodes);
      nodes.set(nodeId, { output: view.output, outcome: view.outcome });
      hookScope = { inputs: scope.inputs, nodes };
    }
    const resolveArgs = post ? (value: unknown) => resolveValue(value, hookScope) : request.resolve;
    const hctx: HookContext = {
      phase: placement.phase,
      node: nodeMetaOfThis,
      from: fromMeta,
      next: metaOf(view.next),
      next_candidates: candidates,
      input: view.input,
      output: view.output,
      outcome: view.outcome,
      attempt: ctx.attempt,
      feedback: null,
      args: resolveArgs(placement.hook.input ?? {}),
    };
    const services: HookServices = {
      ops: request.ops,
      invoker: request.invoker,
      effects: deps.effects,
      sandbox: deps.sandbox ?? null,
      block: request.block,
      resolve: post ? (value) => resolveValue(value, hookScope) : request.resolve,
      scope: hookScope,
    };
    const run = await runner.run(placement, hctx, ctx, services, {
      fused,
      stepName: attemptStepName(label, ctx.attempt),
      slot: hookSlot(placements, placement),
    });
    observe(deps, nodeId, run.entry);
    if (fused) records?.push({ phase: placement.phase, name: label, run });
    const verdict = checkHookAction(placement, run.outcome, nodeMetaOfThis);
    if (!verdict.allowed) {
      if (verdict.code === "HOOK_ROUTE_UNDECLARED") {
        const to = run.outcome.action === "redirect" ? run.outcome.to : "";
        throw new InterpreterError(
          verdict.code,
          `hook "${label}" may not route to "${to}"`,
          nodeId,
          { hook: label, to },
        );
      }
      throw new InterpreterError(
        verdict.code,
        `hook "${label}" may not ${verdict.what}`,
        nodeId,
        { hook: label, action: run.outcome.action },
      );
    }
    if (run.outcome.action === "redirect") {
      const to = run.outcome.to;
      const target = candidates.find((meta) => meta.id === to) ?? metaOf(to);
      const effect = target?.effect ?? null;
      if (effect === null || effect === "write" || effect === "send" || effect === "pay") {
        const what = "redirect into an effect node";
        throw new InterpreterError("HOOK_ACTION_FORBIDDEN", `hook "${label}" may not ${what}`, nodeId, {
          hook: label,
          action: what,
        });
      }
    }
    return run;
  };

  const applyPre = (placement: HookPlacement, run: HookRun): void => {
    const label = hookStepName(nodeId, placement);
    const outcome = run.outcome;
    if (outcome.action === "continue") {
      if (outcome.input !== undefined) {
        state.input = outcome.input;
        state.changed = true;
      }
    } else if (outcome.action === "skip") {
      checkOutput(outcome.output, label);
      state.skipped = outcome.output;
    } else {
      throw unsupported(label, outcome.action);
    }
  };

  const applyPost = (placement: HookPlacement, run: HookRun, view: View): void => {
    const label = hookStepName(nodeId, placement);
    const outcome = run.outcome;
    if (outcome.action === "continue") {
      if (outcome.output !== undefined) {
        checkOutput(outcome.output, label);
        view.output = outcome.output;
      }
    } else if (outcome.action === "redirect") {
      view.next = outcome.to;
    } else if (outcome.action === "fail") {
      throw new InterpreterError("HOOK_FAILED", `hook "${label}" failed the node`, nodeId, {
        hook: label,
        reason: outcome.reason,
      });
    } else {
      throw unsupported(label, outcome.action);
    }
  };

  const postChain = async (
    chain: HookPlacement[],
    fused: boolean,
    view: View,
  ): Promise<void> => {
    for (const placement of chain) {
      if (!whenMatches(placement.hook.when, fromMeta, metaOf(view.next), view.outcome)) continue;
      const run = await exec(placement, fused, view);
      applyPost(placement, run, view);
    }
  };

  const placementOf = (record: FusedRecord): HookPlacement => {
    const found = [...fusedPre, ...fusedPost].find(
      (placement) => hookStepName(nodeId, placement) === record.name,
    );
    if (found === undefined) {
      throw new InterpreterError("HOOK_ERROR", `hook "${record.name}" is not in the flow`, nodeId, {
        hook: record.name,
        fault: "record_unknown",
      });
    }
    return found;
  };

  const hooks: NodeHooks = {
    async pre(arg) {
      if (state.skipped !== null) return { action: "skip", output: state.skipped };
      if (!state.changed) state.input = arg;
      for (const placement of fusedPre) {
        if (!whenMatches(placement.hook.when, fromMeta, null, null)) continue;
        const run = await exec(placement, true, {
          input: state.input,
          output: null,
          outcome: null,
          next: staticNext,
        });
        applyPre(placement, run);
        if (state.skipped !== null) return { action: "skip", output: state.skipped };
      }
      return { action: "run", input: state.input };
    },
    async post(result) {
      const view: View = {
        input: state.input,
        output: result.output,
        outcome: result.outcome,
        next: result.next,
      };
      await postChain(fusedPost, true, view);
      return { output: view.output };
    },
  };

  return {
    fuses: fusedPre.length + fusedPost.length > 0,
    state,
    hooks,
    async runOwnPre() {
      if (request.baseInput === undefined) return;
      for (const placement of ownPre) {
        if (!whenMatches(placement.hook.when, fromMeta, null, null)) continue;
        const run = await exec(placement, false, {
          input: state.input,
          output: null,
          outcome: null,
          next: staticNext,
        });
        applyPre(placement, run);
        if (state.skipped !== null) return;
      }
    },
    async runOwnPost(outcome) {
      const view: View = {
        input: state.input,
        output: outcome.output,
        outcome: outcome.outcome,
        next: outcome.next,
      };
      await postChain(ownPost, false, view);
      return { ...outcome, output: view.output, next: view.next };
    },
    async fusedStep(run) {
      const own: FusedRecord[] = [];
      const previous = records;
      records = own;
      try {
        return { value: await run(), __fused: own };
      } finally {
        records = previous;
      }
    },
    unwrap(stored, ran) {
      if (!ran) {
        for (const record of stored.__fused) {
          observe(deps, nodeId, record.run.entry);
          if (record.phase === "pre") applyPre(placementOf(record), record.run);
        }
      }
      return stored.value;
    },
  };
}
