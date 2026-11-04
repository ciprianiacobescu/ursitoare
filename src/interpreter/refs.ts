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

const DURATION_PATTERN =
  /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/;

const DURATION_LIMIT_MS = 31_622_400_000;

function invalidDuration(iso: string, details: Record<string, string> = {}): never {
  throw new InterpreterError(
    "INTERPRETER_INPUT_INVALID",
    `invalid duration "${iso}"`,
    null,
    { field: "duration", ...details },
  );
}

export function durationMs(iso: string): number {
  const match = DURATION_PATTERN.exec(iso);
  if (match === null) invalidDuration(iso);
  const [, weeks, days, hours, minutes, seconds] = match;
  const hasTime =
    hours !== undefined || minutes !== undefined || seconds !== undefined;
  const hasComponent = weeks !== undefined || days !== undefined || hasTime;
  if (!hasComponent) invalidDuration(iso);
  if (iso.includes("T") && !hasTime) invalidDuration(iso);
  const total =
    (weeks === undefined ? 0 : Number(weeks)) * 604_800_000 +
    (days === undefined ? 0 : Number(days)) * 86_400_000 +
    (hours === undefined ? 0 : Number(hours)) * 3_600_000 +
    (minutes === undefined ? 0 : Number(minutes)) * 60_000 +
    (seconds === undefined ? 0 : Number(seconds)) * 1_000;
  if (!Number.isFinite(total) || total > DURATION_LIMIT_MS) {
    invalidDuration(iso, { reason: "duration_too_large" });
  }
  return Math.round(total);
}
