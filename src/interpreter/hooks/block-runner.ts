import type { Flow, JsonValue, Ref } from "../../authoring/index.ts";
import {
  isSingleRef,
  refToString,
  scanTemplate,
} from "../../authoring/index.ts";
import type { HookPlacement, NodeMeta } from "../../authoring/index.ts";
import { InterpreterError } from "../errors.ts";
import { resolveValue } from "../refs.ts";
import type { RunScope } from "../types.ts";
import { hookStepName } from "./names.ts";
import type { HookRunner } from "./types.ts";

export const blockHookRunner: HookRunner = {
  async run(_placement, _hctx, _step, _services, _site) {
    throw new Error("not implemented");
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
