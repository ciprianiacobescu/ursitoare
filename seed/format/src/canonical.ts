/**
 * Canonical form of a flow document, for equality (round-trip tests, golden comparison).
 *
 * Normalisations (and only these):
 *  1. object keys sorted (code-unit order) at every depth; array order is preserved;
 *  2. every reference inside a value position (with, input, items, on, summary, end.output) is re-printed as
 *     `${{ <ref> }}` with single spaces; text around references is untouched; malformed references are left as-is.
 *
 * Deliberately NOT done: defaults are neither injected nor removed (model_profile, max_parallel), strings are not
 * trimmed, JSON-Schema keyword arrays (required, enum) are not reordered. A printer that round-trips the authored
 * document therefore compares equal to it.
 */
import { refToString, scan, valueFields } from "./refs.ts";

function normString(s: string): string {
  if (!s.includes("${{")) return s;
  return scan(s)
    .map((seg) => (seg.type === "text" ? seg.text : seg.ref ? `\${{ ${refToString(seg.ref)} }}` : seg.raw))
    .join("");
}

function normValue(v: unknown): unknown {
  if (typeof v === "string") return normString(v);
  if (Array.isArray(v)) return v.map(normValue);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, normValue(x)]));
  return v;
}

function sortDeep(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const k of Object.keys(v).sort()) o[k] = sortDeep((v as any)[k]);
    return o;
  }
  return v;
}

/** Normalise a single value (used by the rubric checker for literal comparison). */
export function canonicalValue(v: unknown): unknown {
  return sortDeep(normValue(v));
}

export function canonicalize(doc: unknown): unknown {
  const d: any = structuredClone(doc);
  if (d && typeof d === "object" && d.nodes && typeof d.nodes === "object") {
    for (const n of Object.values<any>(d.nodes)) {
      if (!n || typeof n !== "object" || typeof n.kind !== "string") continue;
      for (const { field } of valueFields(n)) n[field] = normValue(n[field]);
    }
  }
  return sortDeep(d);
}

/** Stringify with keys sorted at every depth (independent of JS integer-key ordering). */
export function stableStringify(v: unknown, indent = 0): string {
  const nl = (d: number) => (indent ? "\n" + " ".repeat(indent * d) : "");
  const go = (x: unknown, d: number): string => {
    if (Array.isArray(x)) return x.length ? `[${x.map((i) => nl(d + 1) + go(i, d + 1)).join(",")}${nl(d)}]` : "[]";
    if (x && typeof x === "object") {
      const ks = Object.keys(x).sort();
      if (!ks.length) return "{}";
      return `{${ks.map((k) => `${nl(d + 1)}${JSON.stringify(k)}:${indent ? " " : ""}${go((x as any)[k], d + 1)}`).join(",")}${nl(d)}}`;
    }
    return JSON.stringify(x) ?? "null";
  };
  return go(v, 0);
}

export function canonicalJson(doc: unknown, opts: { pretty?: boolean } = {}): string {
  return stableStringify(canonicalize(doc), opts.pretty ? 2 : 0);
}

export function canonicalEqual(a: unknown, b: unknown): boolean {
  return canonicalJson(a) === canonicalJson(b);
}
