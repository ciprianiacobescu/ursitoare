import type { JsonValue } from "../../authoring/index.ts";
import { isDurableCancellation } from "../../durable/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { checkSchema } from "../schema.ts";
import type { CallAuthorization, NodeRuntime, StepContext, ToolCall } from "../types.ts";

function toolFailed(nodeId: string, stage: string): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", nodeId, { stage });
}

function mapFailure(error: unknown, nodeId: string, stage: string): unknown {
  if (isDurableCancellation(error)) return error;
  return toInterpreterError(error) ?? toolFailed(nodeId, stage);
}

export const blockRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "block") {
      throw new Error(`block runtime received kind ${node.kind}`);
    }
    const nodeId = ctx.nodeId;
    const def = services.block(node.uses);
    if (def === undefined) {
      throw new InterpreterError(
        "INTERPRETER_VERSION_NOT_RUNNABLE",
        `block "${node.uses}" is not in the catalogue`,
        nodeId,
        { reason: "block_missing", blocks: [node.uses] },
      );
    }
    const hooks = services.hooks;

    const resolveArgs = (): JsonValue => {
      try {
        return services.resolve(node.with);
      } catch (error) {
        const copied = toInterpreterError(error);
        if (copied !== null && copied.node === null) {
          throw new InterpreterError(copied.code, copied.message, nodeId, { ...copied.details });
        }
        throw error;
      }
    };

    const build = (args: JsonValue): ToolCall => {
      const checked = checkSchema(def.input, args);
      if (!checked.ok) {
        throw new InterpreterError(
          "INTERPRETER_INPUT_INVALID",
          `input of "${nodeId}" does not match the block schema`,
          nodeId,
          { path: checked.path, keyword: checked.keyword },
        );
      }
      const call: ToolCall = { tool: node.uses, args, nodeId, effectSeq: 0 };
      if (ctx.attempt > 1) call.generation = ctx.attempt - 1;
      return call;
    };

    const prepare = (): ToolCall => build(resolveArgs());

    const checkOutput = (output: JsonValue): void => {
      const checked = checkSchema(def.output, output);
      if (!checked.ok) {
        throw new InterpreterError(
          "INTERPRETER_OUTPUT_INVALID",
          `output of "${nodeId}" does not match the block schema`,
          nodeId,
          { path: checked.path, keyword: checked.keyword },
        );
      }
    };

    const outcomeOf = (output: JsonValue) => ({
      output,
      outcome: null,
      next: node.next ?? null,
      end: null,
    });

    const authorizeOf = async (call: ToolCall): Promise<CallAuthorization | undefined> => {
      const authorize = services.invoker.authorize;
      if (authorize === undefined) return undefined;
      try {
        return await authorize(
          call,
          Object.assign({}, ctx, { taint: services.inputTaint?.() ?? ctx.taint }),
        );
      } catch (error) {
        throw mapFailure(error, nodeId, "authorize");
      }
    };

    const readCall = async (call: ToolCall): Promise<{ output: JsonValue; decisionId?: string }> => {
      const answer = await authorizeOf(call);
      const invokeCtx: StepContext =
        answer === undefined ? ctx : { ...ctx, authorization: answer };
      let result;
      try {
        result = await services.invoker.invoke(call, invokeCtx);
      } catch (error) {
        throw mapFailure(error, nodeId, "invoke");
      }
      return answer === undefined
        ? { output: result.output }
        : { output: result.output, decisionId: answer.decisionId };
    };

    if (def.effect === "read") {
      const authorized = services.invoker.authorize !== undefined;
      const step = await services.ops.runStep<JsonValue>(nodeId, async () => {
        let produced: JsonValue;
        let decisionId: string | null = null;
        if (hooks === undefined) {
          const read = await readCall(prepare());
          produced = read.output;
          decisionId = read.decisionId ?? null;
        } else {
          const pre = await hooks.pre(resolveArgs());
          if (pre.action === "skip") {
            produced = pre.output;
          } else {
            const read = await readCall(build(pre.input as JsonValue));
            produced = read.output;
            decisionId = read.decisionId ?? null;
          }
        }
        checkOutput(produced);
        let value = produced;
        if (hooks !== undefined) {
          const posted = (await hooks.post({ output: produced, outcome: null, next: node.next ?? null }))
            .output as JsonValue;
          checkOutput(posted);
          value = posted;
        }
        return authorized ? { output: value, decisionId } : value;
      });
      const recorded = authorized ? (step as { output: JsonValue; decisionId: string | null }) : null;
      if (recorded !== null && recorded.decisionId !== null) {
        services.decided?.(recorded.decisionId);
      }
      return outcomeOf(recorded === null ? step : recorded.output);
    }

    const first = await services.ops.runStep<JsonValue>(nodeId, async () => {
      let call: ToolCall;
      if (hooks === undefined) {
        call = prepare();
      } else {
        const pre = await hooks.pre(resolveArgs());
        if (pre.action === "skip") {
          throw new InterpreterError(
            "HOOK_ACTION_FORBIDDEN",
            `a pre-hook may not skip the effect node "${nodeId}"`,
            nodeId,
            { action: "skip" },
          );
        }
        call = build(pre.input as JsonValue);
      }
      const hookArgs = hooks === undefined ? {} : { args: call.args };
      const answer = await authorizeOf(call);
      let decision;
      try {
        decision = await services.effects.before(call, ctx);
      } catch (error) {
        throw mapFailure(error, nodeId, "before");
      }
      if (decision.action === "unknown") {
        throw new InterpreterError(
          "INTERPRETER_EFFECT_UNKNOWN",
          `the effect of "${nodeId}" has an unknown outcome`,
          nodeId,
          { idemKey: decision.idemKey },
        );
      }
      const recorded = (output: JsonValue) =>
        answer === undefined
          ? { output, idemKey: decision.idemKey, ...hookArgs }
          : { output, idemKey: decision.idemKey, decisionId: answer.decisionId, ...hookArgs };
      if (decision.action === "reuse") {
        return recorded(decision.result.output);
      }
      const withKey: StepContext =
        answer === undefined
          ? { ...ctx, idemKey: decision.idemKey }
          : { ...ctx, idemKey: decision.idemKey, authorization: answer };
      try {
        const result = await services.invoker.invoke(call, withKey);
        return recorded(result.output);
      } catch (error) {
        throw mapFailure(error, nodeId, "invoke");
      }
    });
    const { output, idemKey, args, decisionId } = first as {
      output: JsonValue;
      idemKey: string | null;
      args?: JsonValue;
      decisionId?: string;
    };
    if (decisionId !== undefined) services.decided?.(decisionId);

    const final = await services.ops.runStep<JsonValue>(`${nodeId}#done`, async () => {
      const call = args === undefined ? prepare() : build(args);
      try {
        await services.effects.after(call, { ...ctx, idemKey }, { output });
      } catch (error) {
        throw mapFailure(error, nodeId, "after");
      }
      checkOutput(output);
      if (hooks === undefined) return null;
      const posted = (await hooks.post({ output, outcome: null, next: node.next ?? null })).output as JsonValue;
      checkOutput(posted);
      return posted;
    });
    return outcomeOf(hooks === undefined ? output : final);
  },
};
