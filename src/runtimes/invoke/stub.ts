import { InterpreterError } from "../../interpreter/index.ts";
import type {
  DryRunFakes,
  InterpreterDeps,
  StepContext,
  ToolCall,
  ToolInvoker,
  ToolResult,
} from "../../interpreter/index.ts";
import type { RunStore } from "../../runs/index.ts";
import type { InvokePath } from "./types.ts";

const HOOK_KEY = /^[\x21-\x7e]{1,256}$/;
const FAKE_CODE = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

function dryRunFailure(
  reason: string,
  node: string | null,
  extra: Record<string, string> = {},
): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", `dry run ${reason}`, node, {
    reason,
    ...extra,
  });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function answerFromFake(fakes: DryRunFakes, call: ToolCall, ctx: StepContext): ToolResult {
  const isHook = call.phase !== undefined && call.hookId !== undefined;
  const key = isHook ? `${call.nodeId}:${call.phase}:${call.hookId}` : call.nodeId;
  const hook: Record<string, string> = isHook && HOOK_KEY.test(key) ? { hook: key } : {};
  const list = Object.hasOwn(fakes, key) ? fakes[key] : undefined;
  if (list === undefined) throw dryRunFailure("fake_missing", call.nodeId, hook);
  const entry = list[ctx.attempt - 1];
  if (entry === undefined) throw dryRunFailure("fake_exhausted", call.nodeId, hook);
  if ("error" in entry) {
    const code = (entry.error as { code?: unknown }).code;
    const fakeCode: Record<string, string> =
      typeof code === "string" && FAKE_CODE.test(code) ? { fakeCode: code } : {};
    throw dryRunFailure("fake_error", call.nodeId, { ...hook, ...fakeCode });
  }
  return structuredClone(entry) as ToolResult;
}

export function stubInvoker(live: ToolInvoker, fakes: DryRunFakes): ToolInvoker {
  const invoker: ToolInvoker = {
    async invoke(call, ctx) {
      if (ctx.effect === "read") return live.invoke(call, ctx);
      return answerFromFake(fakes, call, ctx);
    },
  };
  const authorize = live.authorize;
  if (authorize !== undefined) {
    invoker.authorize = (call, ctx) => authorize.call(live, call, ctx);
  }
  return invoker;
}

export function dryRunInvokers(
  path: InvokePath,
  store: RunStore,
  fallback: InterpreterDeps["invokerFor"],
): InterpreterDeps["invokerFor"] {
  return async (mode, run) => {
    if (mode !== "stub") return fallback(mode, run);
    let live: ToolInvoker;
    try {
      live = await path.liveInvoker(run);
    } catch {
      throw dryRunFailure("live_unavailable", null);
    }
    let loaded: Promise<ToolInvoker> | null = null;
    const load = async (tenant: StepContext["tenant"]): Promise<ToolInvoker> => {
      if (run.mocksRef === null) throw dryRunFailure("fakes_unavailable", null);
      let data: unknown;
      try {
        const payload = await store.getPayload(tenant, run.mocksRef);
        data = payload === null ? null : payload.data;
      } catch {
        throw dryRunFailure("fakes_unavailable", null);
      }
      if (!isPlainObject(data)) throw dryRunFailure("fakes_unavailable", null);
      return stubInvoker(live, data as DryRunFakes);
    };
    return {
      async invoke(call, ctx) {
        loaded ??= load(ctx.tenant);
        try {
          const invoker = await loaded;
          return await invoker.invoke(call, ctx);
        } catch (error) {
          if (error instanceof InterpreterError && error.details["reason"] === "fakes_unavailable") {
            loaded = null;
          }
          throw error;
        }
      },
      async authorize(call, ctx) {
        if (live.authorize === undefined) {
          throw dryRunFailure("live_unavailable", call.nodeId);
        }
        return live.authorize(call, ctx);
      },
    };
  };
}
