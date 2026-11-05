import type { Flow, NodeKind } from "../authoring/index.ts";
import type { NewRun, PayloadValue, RunRecord, TenantContext } from "../runs/index.ts";
import { InterpreterError } from "./errors.ts";
import { SUPPORTED_KINDS } from "./registry.ts";
import { checkSchema } from "./schema.ts";
import type { InterpreterDeps, StartRunRequest } from "./types.ts";
import { RUN_WORKFLOW } from "./workflow.ts";

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function unsupportedKinds(flow: Flow): NodeKind[] {
  const found = new Set<NodeKind>();
  for (const node of Object.values(flow.nodes)) {
    if (!SUPPORTED_KINDS.includes(node.kind)) {
      found.add(node.kind);
    }
  }
  return [...found].sort();
}

function missingBlocks(flow: Flow, deps: InterpreterDeps, ctx: TenantContext) {
  return deps.catalogueFor(ctx).then((catalogue) => {
    const found = new Set<string>();
    for (const node of Object.values(flow.nodes)) {
      if (node.kind === "block" && catalogue.block(node.uses) === undefined) {
        found.add(node.uses);
      }
    }
    return [...found].sort();
  });
}

export async function startRun(
  deps: InterpreterDeps,
  ctx: TenantContext,
  req: StartRunRequest,
): Promise<RunRecord> {
  const version = await deps.loadVersion(ctx, req.flowId, req.hash);
  if (version === null) {
    throw new InterpreterError(
      "INTERPRETER_VERSION_NOT_FOUND",
      `flow "${req.flowId}" version "${req.hash}" was not found`,
    );
  }
  if (version.state === "draft") {
    throw new InterpreterError(
      "INTERPRETER_VERSION_NOT_RUNNABLE",
      `flow "${req.flowId}" version "${req.hash}" is a draft`,
      null,
      { reason: "draft" },
    );
  }
  const kinds = unsupportedKinds(version.flow);
  if (kinds.length > 0) {
    throw new InterpreterError(
      "INTERPRETER_KIND_UNSUPPORTED",
      `flow "${req.flowId}" uses node kinds the interpreter does not run`,
      null,
      { kinds },
    );
  }
  const blocks = await missingBlocks(version.flow, deps, ctx);
  if (blocks.length > 0) {
    throw new InterpreterError(
      "INTERPRETER_VERSION_NOT_RUNNABLE",
      `flow "${req.flowId}" uses blocks the catalogue does not define`,
      null,
      { reason: "block_missing", blocks },
    );
  }
  const input = checkSchema(version.flow.inputs, req.input);
  if (!input.ok) {
    throw new InterpreterError(
      "INTERPRETER_INPUT_INVALID",
      `input of flow "${req.flowId}" does not match its schema`,
      null,
      { path: input.path, keyword: input.keyword },
    );
  }
  const runId = req.runId ?? deps.ids.next("run");
  if (!RUN_ID_PATTERN.test(runId)) {
    throw new InterpreterError(
      "INTERPRETER_INPUT_INVALID",
      "run id is invalid",
      null,
      { field: "runId" },
    );
  }

  const run: NewRun = {
    runId,
    lineageId: runId,
    parentRunId: null,
    flowId: version.flowId,
    flowHash: version.hash,
    ownerTeam: version.ownerTeam,
    mode: req.mode,
    trigger: "test",
    principal: req.principal,
    actorChain: req.actorChain,
    input: req.input as PayloadValue,
    mocks: req.mocks as PayloadValue | null,
  };
  const stored = await deps.store.createRun(ctx, run, deps.clock.now());

  if (deps.durable !== null) {
    try {
      await deps.durable.enqueue(RUN_WORKFLOW, workflowIdOf(ctx.tenantId, stored.runId), {
        tenantId: ctx.tenantId,
        reviewProfile: ctx.reviewProfile,
        runId: stored.runId,
      });
    } catch {
      const error = new InterpreterError(
        "INTERPRETER_UNBOUND",
        "the run could not be queued",
      );
      await deps.store.transition(ctx, stored.runId, {
        state: "failed",
        from: ["queued"],
        at: deps.clock.now(),
        error: { code: error.code, message: error.message, node: error.node },
      });
      throw error;
    }
  }

  return stored;
}

export function workflowIdOf(tenantId: string, runId: string): string {
  return `${tenantId}:${runId}`;
}
