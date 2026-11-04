import type { JsonValue } from "../../authoring/index.ts";
import { isDurableCancellation } from "../../durable/index.ts";
import { InterpreterError } from "../errors.ts";
import type { InterpreterErrorCode } from "../errors.ts";
import { checkSchema } from "../schema.ts";
import type { NodeRuntime, StepContext, ToolCall } from "../types.ts";

const CODES: readonly string[] = [
  "INTERPRETER_VERSION_NOT_FOUND",
  "INTERPRETER_VERSION_NOT_RUNNABLE",
  "INTERPRETER_KIND_UNSUPPORTED",
  "INTERPRETER_UNBOUND",
  "INTERPRETER_REF_UNRESOLVED",
  "INTERPRETER_INPUT_INVALID",
  "INTERPRETER_OUTPUT_INVALID",
  "INTERPRETER_TOOL_FAILED",
  "INTERPRETER_EFFECT_UNKNOWN",
  "INTERPRETER_NO_INVOKER",
  "INTERPRETER_LOOP_LIMIT",
  "NODE_RUNTIME_DUPLICATE",
  "NODE_RUNTIME_INVALID",
  "FLOW_FAILED",
] satisfies InterpreterErrorCode[];

function isInterpreterError(error: unknown): error is InterpreterError {
  const code = (error as { code?: unknown } | null)?.code;
  return error instanceof Error && typeof code === "string" && CODES.includes(code);
}

function toolFailed(nodeId: string, stage: string): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", "node execution failed", nodeId, { stage });
}

function mapFailure(error: unknown, nodeId: string, stage: string): unknown {
  if (isDurableCancellation(error)) return error;
  if (isInterpreterError(error)) return error;
  return toolFailed(nodeId, stage);
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
        if (isInterpreterError(error) && error.node === null) {
          throw new InterpreterError(error.code, error.message, nodeId, { ...error.details });
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
