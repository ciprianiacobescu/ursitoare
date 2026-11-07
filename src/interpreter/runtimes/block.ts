import type { JsonValue } from "../../authoring/index.ts";
import { isDurableCancellation } from "../../durable/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { checkSchema } from "../schema.ts";
import type { NodeRuntime, StepContext, ToolCall } from "../types.ts";

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

    const readCall = async (call: ToolCall): Promise<JsonValue> => {
      let result;
      try {
        result = await services.invoker.invoke(call, ctx);
      } catch (error) {
        throw mapFailure(error, nodeId, "invoke");
      }
      return result.output;
    };

    if (def.effect === "read") {
      const output = await services.ops.runStep<JsonValue>(nodeId, async () => {
        let produced: JsonValue;
        if (hooks === undefined) {
          produced = await readCall(prepare());
        } else {
          const pre = await hooks.pre(resolveArgs());
          produced = pre.action === "skip" ? pre.output : await readCall(build(pre.input as JsonValue));
        }
        checkOutput(produced);
        if (hooks === undefined) return produced;
        const posted = (await hooks.post({ output: produced, outcome: null, next: node.next ?? null }))
          .output as JsonValue;
        checkOutput(posted);
        return posted;
      });
      return outcomeOf(output);
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
      if (decision.action === "reuse") {
        return { output: decision.result.output, idemKey: decision.idemKey, ...hookArgs };
      }
      const withKey: StepContext = { ...ctx, idemKey: decision.idemKey };
      try {
        const result = await services.invoker.invoke(call, withKey);
        return { output: result.output, idemKey: decision.idemKey, ...hookArgs };
      } catch (error) {
        throw mapFailure(error, nodeId, "invoke");
      }
    });
    const { output, idemKey, args } = first as {
      output: JsonValue;
      idemKey: string | null;
      args?: JsonValue;
    };

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
