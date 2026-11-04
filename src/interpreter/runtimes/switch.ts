import type { NodeRuntime } from "../types.ts";

export const switchRuntime: NodeRuntime = {
  async execute(node, _ctx, services) {
    if (node.kind !== "switch") {
      throw new Error(`switch runtime received kind ${node.kind}`);
    }
    const on = services.resolve(node.on);
    const key =
      typeof on === "string"
        ? on
        : typeof on === "number" || typeof on === "boolean"
          ? String(on)
          : null;
    if (key !== null && Object.hasOwn(node.cases, key)) {
      return {
        output: null,
        outcome: key,
        next: node.cases[key] as string,
        end: null,
      };
    }
    return {
      output: null,
      outcome: "default",
      next: node.default,
      end: null,
    };
  },
};
