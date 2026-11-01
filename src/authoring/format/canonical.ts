/**
 * Canonical JSON for format v0 (design Decision 5).
 *
 * The canonical form is a new tree (the input is never mutated) with object keys
 * sorted by UTF-16 code unit at every depth, array order kept, and every
 * reference in a value field re-printed as `${{ <ref> }}`.
 */

import { FormatError } from "./errors.ts";
import { findJsonProblem } from "./json-value.ts";
import { hookValueFields, valueFields } from "./nodes.ts";
import { DEFAULT_PARSE_LIMITS } from "./parse.ts";
import { refToString, scanTemplate } from "./refs.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function assertJson(doc: unknown): void {
  const problem = findJsonProblem(doc, DEFAULT_PARSE_LIMITS.maxDepth);
  if (problem !== null) {
    throw new FormatError(
      problem.code,
      problem.message,
      problem.path === "" ? undefined : problem.path,
    );
  }
}

function normalizeString(text: string): string {
  const segments = scanTemplate(text);
  if (segments.length === 1 && segments[0]?.type === "text") return text;
  let out = "";
  for (const segment of segments) {
    if (segment.type === "text") {
      out += segment.text;
    } else if (segment.ref !== undefined) {
      out += `\${{ ${refToString(segment.ref)} }}`;
    } else {
      out += segment.raw;
    }
  }
  return out;
}

function normalizeValue(value: unknown): unknown {
  if (typeof value === "string") return normalizeString(value);
  if (Array.isArray(value)) return value.map(normalizeValue);
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, normalizeValue(child)]),
    );
  }
  return value;
}

function normalizeHook(hook: unknown): unknown {
  if (!isRecord(hook)) return hook;
  const out: Record<string, unknown> = { ...hook };
  for (const { field, value } of hookValueFields(hook)) {
    out[field] = normalizeValue(value);
  }
  return out;
}

function normalizeNode(node: unknown): unknown {
  if (!isRecord(node)) return node;
  const out: Record<string, unknown> = { ...node };
  for (const { field, value } of valueFields(node)) {
    out[field] = normalizeValue(value);
  }
  for (const key of ["pre", "post"] as const) {
    const hooks = node[key];
    if (Array.isArray(hooks)) out[key] = hooks.map(normalizeHook);
  }
  return out;
}

function normalizeHookRule(rule: unknown): unknown {
  if (!isRecord(rule)) return rule;
  const out: Record<string, unknown> = { ...rule };
  for (const key of ["pre", "post"] as const) {
    if (isRecord(rule[key])) out[key] = normalizeHook(rule[key]);
  }
  return out;
}

function normalizeDocument(doc: unknown): unknown {
  if (!isRecord(doc)) return doc;
  const out: Record<string, unknown> = { ...doc };
  if (isRecord(doc.nodes)) {
    out.nodes = Object.fromEntries(
      Object.entries(doc.nodes).map(([id, node]) => [id, normalizeNode(node)]),
    );
  }
  if (Array.isArray(doc.hooks)) {
    out.hooks = doc.hooks.map(normalizeHookRule);
  }
  return out;
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortValue);
  if (isRecord(value)) {
    const entries = Object.entries(value)
      .filter(([, child]) => child !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, child]) => [key, sortValue(child)]);
    return Object.fromEntries(entries);
  }
  return value;
}

export function canonicalizeFlow(doc: unknown): unknown {
  assertJson(doc);
  return sortValue(normalizeDocument(doc));
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

export function canonicalJson(doc: unknown): string {
  return stableStringify(canonicalizeFlow(doc));
}

export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
