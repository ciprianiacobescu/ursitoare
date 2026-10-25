// Format v0 values and references (design 4.3). No expressions beyond references; computation belongs in code nodes.
import { RunFailure } from './errors.ts';

export interface NodeResult { output: unknown; outcome?: string }
export interface HookScope { input?: unknown; output?: unknown; node?: unknown; next?: unknown; from?: unknown }
export interface Scope { inputs: unknown; nodes: Record<string, NodeResult>; hook?: HookScope }

const SINGLE = /^\s*\$\{\{\s*([^}]+?)\s*\}\}\s*$/;
const ANY = /\$\{\{\s*([^}]+?)\s*\}\}/g;

export function resolveRef(ref: string, scope: Scope): unknown {
  const parts = ref.split('.');
  let cur: unknown;
  let rest: string[];
  if (parts[0] === 'inputs') { cur = scope.inputs; rest = parts.slice(1); }
  else if (parts[0] === 'hook' && parts.length >= 2) {
    if (!scope.hook || !['input', 'output', 'node', 'next', 'from'].includes(parts[1]!)) throw new RunFailure('ref_unresolved', `unsupported reference ${ref}`);
    cur = (scope.hook as Record<string, unknown>)[parts[1]!]; rest = parts.slice(2);
  }
  else if (parts[0] === 'nodes' && parts.length >= 3) {
    const n = scope.nodes[parts[1]!];
    if (!n) throw new RunFailure('ref_unresolved', `node ${parts[1]} has no recorded output (ref: ${ref})`);
    if (parts[2] === 'outcome' && parts.length === 3) {
      if (n.outcome === undefined) throw new RunFailure('ref_unresolved', `node ${parts[1]} has no outcome (ref: ${ref})`);
      return n.outcome;
    }
    if (parts[2] !== 'output') throw new RunFailure('ref_unresolved', `bad reference ${ref}`);
    cur = n.output; rest = parts.slice(3);
  } else throw new RunFailure('ref_unresolved', `unsupported reference ${ref}`);
  for (const p of rest) {
    if (cur === null || typeof cur !== 'object' || !(p in (cur as object))) throw new RunFailure('ref_unresolved', `path ${ref} does not resolve`);
    cur = (cur as Record<string, unknown>)[p];
  }
  return cur;
}

export function resolveValue(v: unknown, scope: Scope): unknown {
  if (typeof v === 'string') {
    const m = SINGLE.exec(v);
    if (m) return resolveRef(m[1]!, scope);
    return v.replace(ANY, (_s, r: string) => {
      const x = resolveRef(r, scope);
      return typeof x === 'string' ? x : JSON.stringify(x);
    });
  }
  if (Array.isArray(v)) return v.map((x) => resolveValue(x, scope));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolveValue(x, scope)]));
  return v;
}

/** Node ids referenced from a value (for taint tracking). */
export function referencedNodes(v: unknown, out = new Set<string>()): Set<string> {
  if (typeof v === 'string') { for (const m of v.matchAll(ANY)) { const p = m[1]!.split('.'); if (p[0] === 'nodes' && p[1]) out.add(p[1]); } }
  else if (Array.isArray(v)) v.forEach((x) => referencedNodes(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => referencedNodes(x, out));
  return out;
}

/** ISO-8601 duration (PnW, PnDTnHnMnS) to milliseconds. */
export function durationMs(d: string): number {
  const m = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/.exec(d);
  if (!m || d === 'P' || d.endsWith('T')) throw new RunFailure('bad_duration', `invalid ISO-8601 duration ${d}`);
  const [, w, dd, h, mi, s] = m;
  return Math.round((((+(w ?? 0) * 7 + +(dd ?? 0)) * 24 + +(h ?? 0)) * 60 + +(mi ?? 0)) * 60 * 1000 + +(s ?? 0) * 1000);
}

/** Every reference string (the part inside `${{ }}`) in a value. */
export function refStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') { for (const m of v.matchAll(ANY)) out.push(m[1]!); }
  else if (Array.isArray(v)) v.forEach((x) => refStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => refStrings(x, out));
  return out;
}
