import type { JsonValue } from "../../authoring/index.ts";
import type { NodeOutcome, NodeRuntime } from "../types.ts";

export const endRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "end") {
      throw new Error(`end runtime received kind ${node.kind}`);
    }
    const value = await services.ops.runStep<JsonValue>(ctx.nodeId, async () => {
      const output =
        node.output === undefined ? null : services.resolve(node.output);
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
