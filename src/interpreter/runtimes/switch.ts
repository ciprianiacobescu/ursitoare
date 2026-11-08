import type { JsonValue } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import type { NodeOutcome, NodeRuntime } from "../types.ts";

export const switchRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "switch") {
      throw new Error(`switch runtime received kind ${node.kind}`);
    }
    const value = await services.ops.runStep<JsonValue>(ctx.nodeId, async () => {
      let on = services.resolve(node.on);
      const hooks = services.hooks;
      if (hooks !== undefined) {
        const pre = await hooks.pre({ on });
        if (pre.action === "skip") {
          throw new InterpreterError(
            "HOOK_ACTION_FORBIDDEN",
            `a pre-hook may not skip the switch node "${ctx.nodeId}"`,
            ctx.nodeId,
            { action: "skip" },
          );
        }
        const input = pre.input;
        if (input === null || typeof input !== "object" || Array.isArray(input) || !Object.hasOwn(input, "on")) {
          throw new InterpreterError(
            "INTERPRETER_INPUT_INVALID",
            `input of "${ctx.nodeId}" does not match the switch input`,
            ctx.nodeId,
            { path: "/on", keyword: "required" },
          );
        }
        on = input["on"] as JsonValue;
      }
      const key =
        typeof on === "string"
          ? on
          : typeof on === "number" || typeof on === "boolean"
            ? String(on)
            : null;
      const decided =
        key !== null && Object.hasOwn(node.cases, key)
          ? { outcome: key, next: node.cases[key] as string }
          : { outcome: "default", next: node.default };
      let output: JsonValue | null = null;
      if (hooks !== undefined) {
        output = (await hooks.post({ output: null, outcome: decided.outcome, next: decided.next })).output;
      }
      return { output, ...decided, end: null } as JsonValue;
    });
    return value as unknown as NodeOutcome;
  },
};
