import type { JsonValue } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import type { NodeOutcome, NodeRuntime } from "../types.ts";

export const endRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "end") {
      throw new Error(`end runtime received kind ${node.kind}`);
    }
    const value = await services.ops.runStep<JsonValue>(ctx.nodeId, async () => {
      let output: JsonValue | null =
        node.output === undefined ? null : services.resolve(node.output);
      if (services.hooks !== undefined) {
        const pre = await services.hooks.pre(output);
        if (pre.action === "skip") {
          throw new InterpreterError(
            "HOOK_ACTION_FORBIDDEN",
            `a pre-hook may not skip the end node "${ctx.nodeId}"`,
            ctx.nodeId,
            { action: "skip" },
          );
        }
        output = pre.input;
      }
      return {
        output,
        outcome: null,
        next: null,
        end: { status: node.status },
      } as JsonValue;
    });
    return value as unknown as NodeOutcome;
  },
};
