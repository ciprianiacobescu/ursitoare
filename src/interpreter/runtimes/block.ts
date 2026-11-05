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

    const prepare = (): ToolCall => {
      let args: JsonValue;
      try {
        args = services.resolve(node.with);
      } catch (error) {
        const copied = toInterpreterError(error);
        if (copied !== null && copied.node === null) {
          throw new InterpreterError(copied.code, copied.message, nodeId, { ...copied.details });
        }
        throw error;
      }
      const checked = checkSchema(def.input, args);
      if (!checked.ok) {
        throw new InterpreterError(
          "INTERPRETER_INPUT_INVALID",
          `input of "${nodeId}" does not match the block schema`,
          nodeId,
          { path: checked.path, keyword: checked.keyword },
        );
      }
      return { tool: node.uses, args, nodeId, effectSeq: 0 };
    };

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

    if (def.effect === "read") {
      const output = await services.ops.runStep<JsonValue>(nodeId, async () => {
        const call = prepare();
        let result;
        try {
          result = await services.invoker.invoke(call, ctx);
        } catch (error) {
          throw mapFailure(error, nodeId, "invoke");
        }
        checkOutput(result.output);
        return result.output;
      });
      return outcomeOf(output);
    }

    const first = await services.ops.runStep<JsonValue>(nodeId, async () => {
      const call = prepare();
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
        return { output: decision.result.output, idemKey: decision.idemKey };
      }
      const withKey: StepContext = { ...ctx, idemKey: decision.idemKey };
      try {
        const result = await services.invoker.invoke(call, withKey);
        return { output: result.output, idemKey: decision.idemKey };
      } catch (error) {
        throw mapFailure(error, nodeId, "invoke");
      }
    });
    const { output, idemKey } = first as { output: JsonValue; idemKey: string | null };

    await services.ops.runStep(`${nodeId}#done`, async () => {
      const call = prepare();
      try {
        await services.effects.after(call, { ...ctx, idemKey }, { output });
      } catch (error) {
        throw mapFailure(error, nodeId, "after");
      }
      checkOutput(output);
      return null;
    });
    return outcomeOf(output);
  },
};
