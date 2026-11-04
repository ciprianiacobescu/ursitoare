import type { JsonValue } from "../../authoring/index.ts";
import { durationMs } from "../refs.ts";
import type { NodeRuntime } from "../types.ts";

const MAX_SLEEP_MS = 86_400_000;

export const waitRuntime: NodeRuntime = {
  async execute(node, ctx, services) {
    if (node.kind !== "wait") {
      throw new Error(`wait runtime received kind ${node.kind}`);
    }
    const value = await services.ops.runStep<JsonValue>(ctx.nodeId, async () => ({
      ms: durationMs(node.duration),
    }));
    const { ms } = value as { ms: number };
    if (ctx.mode !== "mock") {
      let remaining = ms;
      while (remaining > 0) {
        const chunk = Math.min(remaining, MAX_SLEEP_MS);
        await services.ops.sleep(chunk);
        remaining -= chunk;
      }
    }
    await services.ops.runStep(`${ctx.nodeId}#wake`, async () => null);
    return {
      output: null,
      outcome: ctx.mode === "mock" ? "skipped" : null,
      next: node.next ?? null,
      end: null,
    };
  },
};
