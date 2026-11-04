import type { NodeRuntime } from "../types.ts";

export const endRuntime: NodeRuntime = {
  async execute(node, _ctx, services) {
    if (node.kind !== "end") {
      throw new Error(`end runtime received kind ${node.kind}`);
    }
    const output =
      node.output === undefined ? null : services.resolve(node.output);
    return {
      output,
      outcome: null,
      next: null,
      end: { status: node.status },
    };
  },
};
