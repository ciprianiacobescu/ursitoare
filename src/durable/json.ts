import type { DurableJson } from "./launch.ts";

const MAX_DEPTH = 64;

function depthOf(value: unknown, ancestors: Set<object>): number | null {
  if (value === null || typeof value === "boolean" || typeof value === "string") {
    return 0;
  }
  if (typeof value === "number") {
    return Number.isFinite(value) ? 0 : null;
  }
  if (typeof value !== "object") {
    return null;
  }
  if (ancestors.has(value)) {
    return null;
  }
  let children: unknown[];
  if (Array.isArray(value)) {
    children = value;
  } else {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      return null;
    }
    children = Object.values(value);
  }
  ancestors.add(value);
  let deepest = 0;
  for (const child of children) {
    const depth = depthOf(child, ancestors);
    if (depth === null) {
      ancestors.delete(value);
      return null;
    }
    deepest = Math.max(deepest, depth);
    if (deepest + 1 > MAX_DEPTH) {
      ancestors.delete(value);
      return null;
    }
  }
  ancestors.delete(value);
  return 1 + deepest;
}

export function isDurableJson(value: unknown): value is DurableJson {
  return depthOf(value, new Set()) !== null;
}
