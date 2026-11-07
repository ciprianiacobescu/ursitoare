import type { JsonValue } from "../../authoring/index.ts";
import { DEFAULT_SANDBOX_LIMITS } from "../../sandbox/index.ts";
import type { SandboxLimits } from "../../sandbox/index.ts";
import { InterpreterError, toInterpreterError } from "../errors.ts";
import { checkSchema } from "../schema.ts";
import type { NodeRuntime, StepContext } from "../types.ts";

export const CODE_LIMITS: Readonly<SandboxLimits> = Object.freeze({
  ...DEFAULT_SANDBOX_LIMITS,
});

export function codeSeed(ctx: StepContext): string {
  return `${ctx.runId}:${ctx.nodeId}:${ctx.attempt}`;
}

export const codeRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "code") {
      throw new Error(`code runtime received kind ${node.kind}`);
    }
    const nodeId = ctx.nodeId;
    const output = await services.ops.runStep<JsonValue>(nodeId, async () => {
      const sandbox = services.sandbox;
      if (sandbox === undefined) {
        throw new Error("not implemented");
      }

      let input: JsonValue;
      try {
        input = services.resolve(node.input);
      } catch (error) {
        const copied = toInterpreterError(error);
        if (copied !== null && copied.node === null) {
          throw new InterpreterError(copied.code, copied.message, nodeId, { ...copied.details });
        }
        throw error;
      }

      const result = await sandbox.run(node.source, input, CODE_LIMITS, {
        seed: codeSeed(ctx),
        nowIso: ctx.now.toISOString(),
        binding: "input",
        result: "object",
      });
      if (!result.ok) {
        throw new Error("not implemented");
      }
      if (result.value === null) {
        throw new Error("not implemented");
      }

      const checked = checkSchema(node.output_schema, result.value);
      if (!checked.ok) {
        throw new InterpreterError(
          "INTERPRETER_OUTPUT_INVALID",
          `output of "${nodeId}" does not match its output_schema`,
          nodeId,
          { path: checked.path, keyword: checked.keyword },
        );
      }
      return result.value;
    });

    return {
      output,
      outcome: null,
      next: node.next ?? null,
      end: null,
    };
  },
};
