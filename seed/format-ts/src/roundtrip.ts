import { canonicalEqual, canonicalize } from "../../format/src/canonical.ts";
import { print } from "./print.ts";
import { transpile, type L0Error } from "./transpile.ts";

export interface RoundTrip {
  ok: boolean;
  ts?: string;
  /** L0 errors from transpiling the printed source, or the printer's error */
  errors: Array<L0Error | { layer: "print"; code: "PRINT_ERROR"; message: string }>;
  /** canonical paths whose values differ, "path: expected -> got" */
  diff: string[];
}

function flatten(v: unknown, path: string, out: Map<string, string>): void {
  if (Array.isArray(v)) {
    if (!v.length) out.set(path, "[]");
    v.forEach((x, i) => flatten(x, `${path}[${i}]`, out));
  } else if (v && typeof v === "object") {
    const ks = Object.keys(v);
    if (!ks.length) out.set(path, "{}");
    for (const k of ks) flatten((v as any)[k], path ? `${path}.${k}` : k, out);
  } else out.set(path, JSON.stringify(v));
}

export function diffCanonical(expected: unknown, got: unknown): string[] {
  const a = new Map<string, string>();
  const b = new Map<string, string>();
  flatten(canonicalize(expected), "", a);
  flatten(canonicalize(got), "", b);
  const out: string[] = [];
  for (const [k, v] of a) if (b.get(k) !== v) out.push(`${k}: ${v} -> ${b.has(k) ? b.get(k) : "<missing>"}`);
  for (const [k, v] of b) if (!a.has(k)) out.push(`${k}: <missing> -> ${v}`);
  return out;
}

/** print(doc) then transpile(...) and compare canonically with doc. */
export async function roundtrip(doc: unknown): Promise<RoundTrip> {
  let ts: string;
  try {
    ts = print(doc);
  } catch (e: any) {
    return { ok: false, errors: [{ layer: "print", code: "PRINT_ERROR", message: e.message }], diff: [] };
  }
  const r = await transpile(ts);
  if (r.errors.length || !r.doc) return { ok: false, ts, errors: r.errors, diff: [] };
  const ok = canonicalEqual(doc, r.doc);
  return { ok, ts, errors: [], diff: ok ? [] : diffCanonical(doc, r.doc) };
}
