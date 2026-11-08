import type { Flow, JsonValue, Ref } from "../../authoring/index.ts";
import {
  isSingleRef,
  refToString,
  scanTemplate,
} from "../../authoring/index.ts";
import type { HookPlacement, NodeMeta } from "../../authoring/index.ts";
import { isDurableCancellation } from "../../durable/index.ts";
import { InterpreterError } from "../errors.ts";
import { resolveValue } from "../refs.ts";
import { checkSchema } from "../schema.ts";
import type { RunScope, StepContext, ToolCall } from "../types.ts";
import { attemptStepName, hookStepName } from "./names.ts";
import type { HookRun, HookRunner } from "./types.ts";

type Reason =
  | "tool_failed"
  | "input_invalid"
  | "output_invalid"
  | "args_unresolved"
  | "block_missing"
  | "effect_unknown"
  | "effect_retry";

const FATAL: readonly Reason[] = ["block_missing", "effect_unknown", "effect_retry"];

class HookFault extends Error {
  readonly reason: Reason;
  readonly idemKey: string | null;
  constructor(reason: Reason, idemKey: string | null = null) {
    super(reason);
    this.reason = reason;
    this.idemKey = idemKey;
  }
}

type FirstStep =
  | { ok: true; output: JsonValue; idemKey: string | null }
  | { ok: false; idemKey: string | null; reason: Reason };

export const blockHookRunner: HookRunner = {
  async run(placement, hctx, step, services, site) {
    const hook = placement.hook;
    if (hook.kind !== "block") throw new Error("block hook runner received a non-block hook");
    const nodeId = step.nodeId;
    const key = hookStepName(nodeId, placement);
    const hookLabel = hook.id;
    const swallow = hook.on_error === "continue";
    const def = services.block(hook.uses);
    const phase = placement.phase;

    const toError = (reason: Reason): InterpreterError =>
      new InterpreterError(
        "HOOK_ERROR",
        `block hook "${hookLabel}" failed (${reason})`,
        nodeId,
        { hook: key, reason },
      );

    const entryOf = (
      state: "completed" | "failed",
      idem: string | null,
      reason: Reason | null,
    ): HookRun => ({
      outcome: { action: "continue" },
      entry: {
        label: `${phase}:${placement.label}`,
        kind: "block",
        fused: false,
        attempt: hctx.attempt,
        state,
        action: "continue",
        mutated: null,
        to: null,
        error:
          reason === null
            ? null
            : { code: "HOOK_ERROR", message: `block hook failed (${reason})` },
        tool: hook.uses,
        idemKey: idem,
      },
    });

    const guard = async (
      body: () => Promise<JsonValue>,
      failed: (fault: HookFault) => JsonValue,
    ): Promise<JsonValue> => {
      try {
        return await body();
      } catch (error) {
        if (isDurableCancellation(error)) throw error;
        const fault = error instanceof HookFault ? error : new HookFault("tool_failed");
        if (swallow && !FATAL.includes(fault.reason)) return failed(fault);
        throw toError(fault.reason);
      }
    };

    const prepare = (): ToolCall => {
      if (def === undefined) throw new HookFault("block_missing");
      let args: JsonValue;
      try {
        args = resolveHookValue(hook.with, services.scope, {
          input: hctx.input,
          output: hctx.output,
          node: hctx.node,
          next: hctx.next,
          from: hctx.from,
        });
      } catch (error) {
        if (isDurableCancellation(error)) throw error;
        throw new HookFault("args_unresolved");
      }
      if (!checkSchema(def.input, args).ok) throw new HookFault("input_invalid");
      const call: ToolCall = {
        tool: hook.uses,
        args,
        nodeId,
        effectSeq: site.slot,
        phase,
        hookId: placement.label,
      };
      if (hctx.attempt > 1) call.generation = hctx.attempt - 1;
      return call;
    };

    const contextFor = (idem: string | null): StepContext => ({
      ...step,
      attempt: hctx.attempt,
      effect: def?.effect ?? null,
      unsafeToRetry: def?.unsafe_to_retry === true,
      idemKey: idem,
      hook: { phase, label: placement.label },
    });

    const checkOutput = (output: JsonValue, idem: string | null): void => {
      if (def === undefined || !checkSchema(def.output, output).ok) {
        throw new HookFault("output_invalid", idem);
      }
    };

    const failedRun = (fault: HookFault): JsonValue =>
      entryOf("failed", fault.idemKey, fault.reason) as unknown as JsonValue;

    const invokeTool = async (call: ToolCall, idem: string | null): Promise<JsonValue> => {
      try {
        return (await services.invoker.invoke(call, contextFor(idem))).output;
      } catch (error) {
        if (isDurableCancellation(error)) throw error;
        throw new HookFault("tool_failed", idem);
      }
    };

    if (def === undefined || def.effect === "read") {
      const stored = await services.ops.runStep<JsonValue>(site.stepName, () =>
        guard(async () => {
          const output = await invokeTool(prepare(), null);
          checkOutput(output, null);
          return entryOf("completed", null, null) as unknown as JsonValue;
        }, failedRun),
      );
      return stored as unknown as HookRun;
    }

    const first = await services.ops.runStep<JsonValue>(site.stepName, () =>
      guard(
        async () => {
          if (hctx.attempt > 1 && def.effect === "pay") throw new HookFault("effect_retry");
          const call = prepare();
          let decision;
          try {
            decision = await services.effects.before(call, contextFor(null));
          } catch (error) {
            if (isDurableCancellation(error)) throw error;
            throw new HookFault("tool_failed");
          }
          if (decision.action === "unknown") {
            throw new HookFault("effect_unknown", decision.idemKey);
          }
          if (decision.action === "reuse") {
            return { ok: true, output: decision.result.output, idemKey: decision.idemKey };
          }
          const output = await invokeTool(call, decision.idemKey);
          return { ok: true, output, idemKey: decision.idemKey };
        },
        (fault) => ({ ok: false, idemKey: fault.idemKey, reason: fault.reason }),
      ),
    );
    const recorded = first as unknown as FirstStep;
    if (!recorded.ok) return entryOf("failed", recorded.idemKey, recorded.reason);

    const done = await services.ops.runStep<JsonValue>(
      attemptStepName(`${key}#done`, hctx.attempt),
      () =>
        guard(async () => {
          const call = prepare();
          try {
            await services.effects.after(call, contextFor(recorded.idemKey), {
              output: recorded.output,
            });
          } catch (error) {
            if (isDurableCancellation(error)) throw error;
            throw new HookFault("tool_failed", recorded.idemKey);
          }
          checkOutput(recorded.output, recorded.idemKey);
          return entryOf("completed", recorded.idemKey, null) as unknown as JsonValue;
        }, failedRun),
    );
    return done as unknown as HookRun;
  },
};

export function hookMockKey(nodeId: string, placement: HookPlacement): string {
  return hookStepName(nodeId, placement);
}

function isRecord(value: unknown): value is { [key: string]: unknown } {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function hookBlockRefs(flow: Flow): string[] {
  const refs = new Set<string>();
  const fromHook = (hook: unknown): void => {
    if (!isRecord(hook) || hook.kind !== "block") return;
    if (typeof hook.uses === "string") refs.add(hook.uses);
  };
  const nodes: unknown = isRecord(flow) ? flow.nodes : undefined;
  if (isRecord(nodes)) {
    for (const node of Object.values(nodes)) {
      if (!isRecord(node)) continue;
      for (const list of [node.pre, node.post]) {
        if (!Array.isArray(list)) continue;
        for (const hook of list) fromHook(hook);
      }
    }
  }
  const rules: unknown = isRecord(flow) ? flow.hooks : undefined;
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      if (!isRecord(rule)) continue;
      fromHook(rule.pre);
      fromHook(rule.post);
    }
  }
  return [...refs].sort();
}

function unresolved(reference: string): never {
  throw new InterpreterError(
    "INTERPRETER_REF_UNRESOLVED",
    `unresolved reference "${reference}"`,
    null,
    { ref: reference },
  );
}

function copyOf(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(copyOf);
  if (isRecord(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, copyOf(entry)]));
  }
  return value;
}

function walkHook(target: unknown, path: readonly string[], reference: string): JsonValue {
  let current: unknown = target;
  for (const key of path) {
    if (!isRecord(current) || !Object.hasOwn(current, key)) unresolved(reference);
    current = (current as { [key: string]: unknown })[key];
  }
  return current as JsonValue;
}

export interface HookValues {
  input: JsonValue | null;
  output: JsonValue | null;
  node: NodeMeta;
  next: NodeMeta | null;
  from: NodeMeta | null;
}

function rawOf(ref: Ref): string {
  return ref.root === "node" && ref.field === "outcome"
    ? "${{ nodes." + ref.id + ".outcome }}"
    : ["${{ ", refToString(ref), " }}"].join("");
}

function refOf(ref: Ref, hook: HookValues, scope: RunScope): JsonValue {
  if (ref.root === "hook") {
    const reference = refToString(ref);
    const root = hook[ref.scope];
    if (root === null) unresolved(reference);
    return walkHook(copyOf(root), ref.path, reference);
  }
  return resolveValue(rawOf(ref), scope);
}

function stringify(resolved: JsonValue): string {
  return typeof resolved === "string" ? resolved : (JSON.stringify(resolved) ?? "null");
}

export function resolveHookValue(value: unknown, scope: RunScope, hook: HookValues): JsonValue {
  if (typeof value === "string") {
    const segments = scanTemplate(value);
    if (isSingleRef(segments)) {
      const segment = segments[0];
      if (segment === undefined || segment.type !== "ref") unresolved(value.trim());
      if (segment.ref === undefined) unresolved(segment.raw.slice(3, -2).trim());
      if (segment.ref.root === "hook") {
        return refOf(segment.ref, hook, scope);
      }
      return resolveValue(value, scope);
    }
    if (segments.some((segment) => segment.type === "ref" && segment.ref?.root === "hook")) {
      let text = "";
      for (const segment of segments) {
        if (segment.type === "text") {
          text += segment.text;
          continue;
        }
        const raw = segment.raw.slice(3, segment.raw.endsWith("}}") ? -2 : undefined).trim();
        if (segment.ref === undefined) unresolved(raw);
        const resolved = refOf(segment.ref, hook, scope);
        text += stringify(resolved);
      }
      return text;
    }
    return resolveValue(value, scope);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveHookValue(entry, scope, hook));
  }
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveHookValue(entry, scope, hook)]),
    );
  }
  return value as JsonValue;
}
