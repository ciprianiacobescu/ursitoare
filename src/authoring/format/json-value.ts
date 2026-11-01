/**
 * JSON-value walk shared by the parser and the canonical walker (design Decision 2).
 *
 * Depth-first, first problem wins. A container at depth greater than `maxDepth`
 * is `FORMAT_TOO_DEEP` (the root container is depth 1); anything that is not a
 * plain JSON value is `FORMAT_NOT_JSON`, with a JSON Pointer path.
 */

import type { FormatErrorCode } from "./errors.ts";
import { escapePointer } from "./refs.ts";

export interface JsonProblem {
  code: FormatErrorCode;
  path: string;
  message: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

function hasLoneSurrogate(text: string): boolean {
  for (let i = 0; i < text.length; i += 1) {
    const code = text.charCodeAt(i);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = text.charCodeAt(i + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      i += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

function stringProblem(text: string): string | null {
  if (text.includes("\u0000")) return "contains U+0000";
  if (hasLoneSurrogate(text)) return "contains a lone surrogate";
  return null;
}

/** Returns the first JSON-value problem in `value`, or `null` when it is plain JSON. */
export function findJsonProblem(value: unknown, maxDepth: number): JsonProblem | null {
  const notJson = (path: string, reason: string): JsonProblem => ({
    code: "FORMAT_NOT_JSON",
    path,
    message: `value at ${path === "" ? "/" : path} is not JSON: ${reason}`,
  });
  const tooDeep = (path: string): JsonProblem => ({
    code: "FORMAT_TOO_DEEP",
    path,
    message: `value at ${path === "" ? "/" : path} is nested deeper than ${maxDepth}`,
  });

  const walk = (current: unknown, path: string, depth: number): JsonProblem | null => {
    if (current === null || typeof current === "boolean") return null;
    if (typeof current === "number") {
      return Number.isFinite(current) ? null : notJson(path, "non-finite number");
    }
    if (typeof current === "string") {
      const problem = stringProblem(current);
      return problem === null ? null : notJson(path, problem);
    }
    if (Array.isArray(current) || isPlainObject(current)) {
      if (depth > maxDepth) return tooDeep(path);
      if (Array.isArray(current)) {
        for (let i = 0; i < current.length; i += 1) {
          const problem = walk(current[i], `${path}/${i}`, depth + 1);
          if (problem !== null) return problem;
        }
        return null;
      }
      for (const [key, child] of Object.entries(current)) {
        const childPath = `${path}/${escapePointer(key)}`;
        const keyProblem = stringProblem(key);
        if (keyProblem !== null) return notJson(childPath, `key ${keyProblem}`);
        const problem = walk(child, childPath, depth + 1);
        if (problem !== null) return problem;
      }
      return null;
    }
    return notJson(path, `value of type ${typeof current} is not JSON`);
  };

  return walk(value, "", 1);
}
