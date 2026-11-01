/**
 * Reference and template parsing for format v0 (design Decision 7).
 *
 *   value      = JSON literal | "${{ ref }}" (single reference) | template string
 *   references = inputs.<path> | nodes.<id>.output.<path> | nodes.<id>.outcome
 *              | item[.<path>] | hook.<scope>.<path>
 *
 * A string is a single reference iff it is exactly one `${{ ... }}` and nothing else.
 * Any other string containing at least one reference is a template (always a string).
 */

import type { HookScope } from "./types.ts";

export type Ref =
  | { root: "inputs"; path: string[] }
  | { root: "node"; id: string; field: "output" | "outcome"; path: string[] }
  | { root: "item"; path: string[] }
  | { root: "hook"; scope: HookScope; path: string[] };

export type Seg =
  | { type: "text"; text: string }
  | { type: "ref"; raw: string; ref?: Ref; error?: string };

const SEG = /^[A-Za-z0-9_]+$/;
const NODE_ID = /^[a-z][a-z0-9_]*$/;
const HOOK_SCOPES: readonly HookScope[] = ["input", "output", "node", "next", "from"];

export function parseRef(content: string): { ref?: Ref; error?: string } {
  const parts = content.split(".");
  if (parts.some((p) => p === "")) return { error: `malformed reference "${content}"` };
  const root = parts[0];
  if (root === "inputs") {
    const path = parts.slice(1);
    if (path.length === 0) return { error: `"inputs" needs a path, e.g. inputs.<name>` };
    if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
    return { ref: { root: "inputs", path } };
  }
  if (root === "nodes") {
    if (parts.length < 3) {
      return { error: `"${content}" must be nodes.<id>.output.<path> or nodes.<id>.outcome` };
    }
    const id = parts[1] ?? "";
    if (!NODE_ID.test(id)) return { error: `invalid node id "${id}" in reference` };
    const field = parts[2];
    if (field === "outcome") {
      if (parts.length !== 3) return { error: `nodes.<id>.outcome takes no further path` };
      return { ref: { root: "node", id, field: "outcome", path: [] } };
    }
    if (field === "output") {
      const path = parts.slice(3);
      if (path.length === 0) {
        return { error: `nodes.${id}.output needs a path, e.g. nodes.${id}.output.<field>` };
      }
      if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
      return { ref: { root: "node", id, field: "output", path } };
    }
    return {
      error: `"nodes.${id}.${field}" is not a reference; use nodes.${id}.output.<path> or nodes.${id}.outcome`,
    };
  }
  if (root === "item") {
    const path = parts.slice(1);
    if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
    return { ref: { root: "item", path } };
  }
  if (root === "hook") {
    if (parts.length < 2) {
      return { error: `"hook" needs a scope and a path, e.g. hook.input.<field>` };
    }
    const scope = parts[1] ?? "";
    if (!HOOK_SCOPES.includes(scope as HookScope)) {
      return {
        error: `unknown hook scope "${scope}" (expected input, output, node, next or from)`,
      };
    }
    const path = parts.slice(2);
    if (path.length === 0) {
      return { error: `"hook.${scope}" needs a path, e.g. hook.input.<field>` };
    }
    if (!path.every((p) => SEG.test(p))) return { error: `invalid path segment in "${content}"` };
    return { ref: { root: "hook", scope: scope as HookScope, path } };
  }
  return {
    error: `unknown reference root "${root}" (expected inputs, nodes, item or hook)`,
  };
}

/** Split a string into text and reference segments. Never throws. */
export function scanTemplate(text: string): Seg[] {
  const out: Seg[] = [];
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("${{", i);
    if (open < 0) {
      out.push({ type: "text", text: text.slice(i) });
      break;
    }
    if (open > i) out.push({ type: "text", text: text.slice(i, open) });
    const close = text.indexOf("}}", open + 3);
    if (close < 0) {
      out.push({ type: "ref", raw: text.slice(open), error: "unterminated ${{ (missing }})" });
      break;
    }
    const raw = text.slice(open, close + 2);
    const content = text.slice(open + 3, close).trim();
    if (content.includes("{") || content.includes("}")) {
      out.push({ type: "ref", raw, error: `unexpected brace inside reference "${content}"` });
    } else {
      const r = parseRef(content);
      if (r.ref !== undefined) {
        out.push({ type: "ref", raw, ref: r.ref });
      } else {
        out.push({ type: "ref", raw, error: r.error ?? `malformed reference "${content}"` });
      }
    }
    i = close + 2;
  }
  return out;
}

export function isSingleRef(segs: Seg[]): boolean {
  return segs.length === 1 && segs[0]?.type === "ref";
}

export function refToString(ref: Ref): string {
  switch (ref.root) {
    case "inputs":
      return ["inputs", ...ref.path].join(".");
    case "item":
      return ["item", ...ref.path].join(".");
    case "hook":
      return ["hook", ref.scope, ...ref.path].join(".");
    case "node":
      return ref.field === "outcome"
        ? `nodes.${ref.id}.outcome`
        : ["nodes", ref.id, "output", ...ref.path].join(".");
  }
}

/** Suspicious-but-legal literal text that looks like a botched reference. */
export function suspiciousInterpolation(text: string): string | null {
  const trimmed = text.trim();
  if (
    /^(inputs|nodes|item|hook)\.[A-Za-z0-9_.]+$/.test(trimmed) &&
    /^(inputs\.|nodes\.[a-z][a-z0-9_]*\.(output|outcome)|item\.|hook\.)/.test(trimmed)
  ) {
    return `"${text}" looks like a reference but is not wrapped in \${{ }}; it will be treated as literal text`;
  }
  if (/\{\{[^{}]*\}\}/.test(text)) {
    return `"{{ ... }}" is not reference syntax; references are written \${{ ... }}`;
  }
  if (/\$\{(?!\{)/.test(text)) {
    return `"\${ ... }" is not reference syntax; references are written \${{ ... }}`;
  }
  return null;
}

/** Visit every string leaf in a JSON value with its JSON Pointer. */
export function walkStrings(
  value: unknown,
  path: string,
  visit: (text: string, path: string) => void,
): void {
  if (typeof value === "string") {
    visit(value, path);
  } else if (Array.isArray(value)) {
    value.forEach((x, i) => walkStrings(x, `${path}/${i}`, visit));
  } else if (value && typeof value === "object") {
    for (const [k, x] of Object.entries(value)) walkStrings(x, `${path}/${escapePointer(k)}`, visit);
  }
}

export function escapePointer(segment: string): string {
  return segment.replace(/~/g, "~0").replace(/\//g, "~1");
}
