import type { JsonValue } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import { durationMs } from "../refs.ts";
import type { NodeRuntime } from "../types.ts";

const MAX_SLEEP_MS = 86_400_000;

export const waitRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "wait") {
      throw new Error(`wait runtime received kind ${node.kind}`);
    }
    const hooks = services.hooks;
    const value = await services.ops.runStep<JsonValue>(ctx.nodeId, async () => {
      let duration: string = node.duration;
      if (hooks !== undefined) {
        const pre = await hooks.pre({ duration });
        if (pre.action === "skip") {
          throw new InterpreterError(
            "HOOK_ACTION_FORBIDDEN",
            `a pre-hook may not skip the wait node "${ctx.nodeId}"`,
            ctx.nodeId,
            { action: "skip" },
          );
        }
        const input = pre.input;
        if (input !== null && typeof input === "object" && !Array.isArray(input)) {
          const given = input["duration"];
          if (typeof given === "string") duration = given;
        }
      }
      return { ms: durationMs(duration) };
    });
    const { ms } = value as { ms: number };
    if (ctx.mode !== "mock") {
      let remaining = ms;
      while (remaining > 0) {
        const chunk = Math.min(remaining, MAX_SLEEP_MS);
        await services.ops.sleep(chunk);
        remaining -= chunk;
      }
    }
    const outcome = ctx.mode === "mock" ? "skipped" : null;
    await services.ops.runStep(`${ctx.nodeId}#wake`, async () => {
      if (hooks !== undefined) {
        await hooks.post({ output: null, outcome, next: node.next ?? null });
      }
      return null;
    });
    return {
      output: null,
      outcome,
      next: node.next ?? null,
      end: null,
    };
  },
};
