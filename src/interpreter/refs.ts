import {
  isSingleRef,
  refToString,
  scanTemplate,
} from "../authoring/index.ts";
import type { JsonValue, Ref } from "../authoring/index.ts";
import { InterpreterError } from "./errors.ts";
import type { RunScope } from "./types.ts";

function unresolved(reference: string): never {
  throw new InterpreterError(
    "INTERPRETER_REF_UNRESOLVED",
    `unresolved reference "${reference}"`,
    null,
    { ref: reference },
  );
}

function referenceOfRaw(raw: string): string {
  if (!raw.startsWith("${{")) return raw.trim();
  const inner = raw.slice(3);
  return (inner.endsWith("}}") ? inner.slice(0, -2) : inner).trim();
}

function cloneJson(value: JsonValue): JsonValue {
  if (Array.isArray(value)) return value.map(cloneJson);
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJson(entry)]),
    );
  }
  return value;
}

function walk(value: JsonValue, path: readonly string[], reference: string): JsonValue {
  let current = value;
  for (const key of path) {
    if (
      current === null ||
      typeof current !== "object" ||
      Array.isArray(current) ||
      !Object.hasOwn(current, key)
    ) {
      unresolved(reference);
    }
    current = (current as { [key: string]: JsonValue })[key] as JsonValue;
  }
  return current;
}

function resolveRef(ref: Ref, scope: RunScope): JsonValue {
  const reference = refToString(ref);
  if (ref.root === "inputs") {
    return walk(scope.inputs, ref.path, reference);
  }
  if (ref.root !== "node") unresolved(reference);
  const recorded = scope.nodes.get(ref.id);
  if (recorded === undefined) unresolved(reference);
  if (ref.field === "outcome") {
    if (typeof recorded.outcome !== "string") unresolved(reference);
    return recorded.outcome;
  }
  if (
    recorded.output === null ||
    typeof recorded.output !== "object" ||
    Array.isArray(recorded.output)
  ) {
    unresolved(reference);
  }
  return walk(recorded.output, ref.path, reference);
}

export function resolveValue(value: unknown, scope: RunScope): JsonValue {
  if (typeof value === "string") {
    const segments = scanTemplate(value);
    if (isSingleRef(segments)) {
      const segment = segments[0];
      if (segment === undefined || segment.type !== "ref") unresolved(referenceOfRaw(value));
      if (segment.error !== undefined || segment.ref === undefined) {
        unresolved(referenceOfRaw(segment.raw));
      }
      return cloneJson(resolveRef(segment.ref, scope));
    }
    let text = "";
    for (const segment of segments) {
      if (segment.type === "text") {
        text += segment.text;
        continue;
      }
      if (segment.error !== undefined || segment.ref === undefined) {
        unresolved(referenceOfRaw(segment.raw));
      }
      const resolved = resolveRef(segment.ref, scope);
      text += typeof resolved === "string" ? resolved : (JSON.stringify(resolved) ?? "null");
    }
    return text;
  }
  if (Array.isArray(value)) {
    return value.map((entry) => resolveValue(entry, scope));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, resolveValue(entry, scope)]),
    );
  }
  return value as JsonValue;
}

export function durationMs(_iso: string): number {
  throw new Error("not implemented");
}
