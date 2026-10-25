/**
 * Rubric DSL checker (design section 8). Works on any parsed document, valid or not; it never throws on
 * flow content. A malformed check (unknown key, wrong shape) FAILS with a detail starting "malformed check".
 *
 * Rubric envelope: a bare array of checks, or {"checks": [...]}.
 *
 * Each check is an object with exactly one "main" key (see CHECK_KEYS) plus, for `has_kind` and `uses`,
 * the optional `min` / `max` bounds. Result entries are {check: <main key>, pass, detail, spec: <raw check>}.
 */
import { buildEdges } from "./graph.ts";
import { canonicalValue, stableStringify } from "./canonical.ts";
import { scan, walkStrings, type Ref } from "./refs.ts";
import { isObj, own } from "./jsonschema.ts";

export const CHECK_KEYS = [
  "has_kind",
  "no_kind",
  "uses",
  "no_uses",
  "precedes",
  "decide_outcomes",
  "param_equals",
  "param_from",
  "approval_role",
  "timeout_max",
  "foreach_over",
  "agent_tools",
  "preserves",
  "absent",
] as const;

export interface RubricCheckResult {
  check: string;
  pass: boolean;
  detail: string;
  spec: unknown;
}
export interface RubricResult {
  passed: number;
  total: number;
  ok: boolean;
  results: RubricCheckResult[];
}

type Sel = { kind: string } | { uses: string } | { id: string };

class Malformed extends Error {}

function nodesOf(doc: any): Record<string, any> {
  return isObj(doc) && isObj(doc.nodes) ? doc.nodes : {};
}
const ids = (nodes: Record<string, any>) => Object.keys(nodes).sort();

/** block.uses or foreach.uses */
function usesOf(n: any): string | null {
  if (isObj(n) && (n.kind === "block" || n.kind === "foreach") && typeof n.uses === "string") return n.uses;
  return null;
}

function parseSel(x: unknown, what: string): Sel {
  if (!isObj(x)) throw new Malformed(`${what} must be an object {kind}|{uses}|{id}`);
  const ks = Object.keys(x);
  if (ks.length !== 1 || !["kind", "uses", "id"].includes(ks[0]) || typeof x[ks[0]] !== "string")
    throw new Malformed(`${what} must have exactly one string key among kind, uses, id (got ${JSON.stringify(x)})`);
  return x as Sel;
}
function matches(sel: Sel, id: string, n: any): boolean {
  if (!isObj(n)) return false;
  if ("kind" in sel) return n.kind === sel.kind;
  if ("uses" in sel) return usesOf(n) === sel.uses;
  return id === sel.id;
}
const selStr = (s: Sel) => JSON.stringify(s);

function bounds(spec: any, key: string): { min: number; max: number | undefined } {
  const extra = Object.keys(spec).filter((k) => k !== key && k !== "min" && k !== "max");
  if (extra.length) throw new Malformed(`unexpected key(s) ${extra.join(", ")}`);
  const min = spec.min === undefined ? 1 : spec.min;
  const max = spec.max;
  if (!Number.isInteger(min) || min < 0) throw new Malformed(`min must be a non-negative integer`);
  if (max !== undefined && (!Number.isInteger(max) || max < 0)) throw new Malformed(`max must be a non-negative integer`);
  return { min, max };
}
const within = (c: number, b: { min: number; max: number | undefined }) => c >= b.min && (b.max === undefined || c <= b.max);
const rangeStr = (b: { min: number; max: number | undefined }) => `${b.min}..${b.max ?? "inf"}`;

/** ISO-8601 duration to seconds. Y = 365 d, M(onth) = 30 d, W = 7 d (fixed conversions). */
export function durationSeconds(d: unknown): number | null {
  if (typeof d !== "string") return null;
  const N = "(\\d+(?:\\.\\d+)?)";
  const m = new RegExp(`^P(?=\\d|T\\d)(?:${N}Y)?(?:${N}M)?(?:${N}W)?(?:${N}D)?(?:T(?=\\d)(?:${N}H)?(?:${N}M)?(?:${N}S)?)?$`).exec(d);
  if (!m) return null;
  const n = (i: number) => (m[i] ? Number(m[i]) : 0);
  return n(1) * 365 * 86400 + n(2) * 30 * 86400 + n(3) * 7 * 86400 + n(4) * 86400 + n(5) * 3600 + n(6) * 60 + n(7);
}

function strArray(x: unknown, what: string): string[] {
  if (!Array.isArray(x) || !x.every((s) => typeof s === "string")) throw new Malformed(`${what} must be an array of strings`);
  return x;
}

function nodeRefs(value: unknown): Ref[] {
  const out: Ref[] = [];
  walkStrings(value, "", (s) => {
    for (const seg of scan(s)) if (seg.type === "ref" && seg.ref && seg.ref.root === "node") out.push(seg.ref);
  });
  return out;
}

/** Is there a path from start to a node matching `after` that avoids every node matching `before`? */
function precedesCheck(doc: any, before: Sel, after: Sel): { pass: boolean; detail: string } {
  const nodes = nodesOf(doc);
  const all = ids(nodes);
  const B = new Set(all.filter((i) => matches(before, i, nodes[i])));
  const A = all.filter((i) => matches(after, i, nodes[i]));
  if (A.length === 0) return { pass: false, detail: `no node matches after ${selStr(after)}` };
  if (B.size === 0) return { pass: false, detail: `no node matches before ${selStr(before)}` };
  const start = isObj(doc) && typeof doc.start === "string" ? doc.start : null;
  if (!start || !Object.prototype.hasOwnProperty.call(nodes, start)) return { pass: false, detail: `flow has no valid start node` };
  const adj = new Map<string, string[]>();
  for (const e of buildEdges(nodes)) (adj.get(e.from) ?? adj.set(e.from, []).get(e.from)!).push(e.to);
  // explore from start; entering a `before` node ends that path (it is "earlier" for everything after it)
  const prev = new Map<string, string | null>();
  const q: string[] = [];
  prev.set(start, null);
  q.push(start);
  const reached = new Set<string>();
  while (q.length) {
    const cur = q.shift()!;
    reached.add(cur);
    if (B.has(cur)) continue; // blocked here; successors are preceded by a `before` node
    for (const t of (adj.get(cur) ?? []).slice().sort()) {
      if (!prev.has(t)) {
        prev.set(t, cur);
        q.push(t);
      }
    }
  }
  // A node in `after` is violated if reachable by a path whose earlier nodes contain no `before` node.
  // `cur` itself counts only if it is reached via unblocked predecessors; being in B does not excuse itself.
  const bad = A.filter((a) => reached.has(a));
  if (!bad.length) return { pass: true, detail: `every path to ${A.join(", ")} passes through a node matching ${selStr(before)}` };
  const a = bad[0];
  const p: string[] = [];
  for (let x: string | null = a; x !== null; x = prev.get(x) ?? null) p.unshift(x);
  return { pass: false, detail: `path ${p.join(" -> ")} reaches ${a} without passing through ${selStr(before)}` };
}

function runOne(doc: any, spec: any, seed: any): { check: string; pass: boolean; detail: string } {
  if (!isObj(spec)) throw new Malformed("check must be an object");
  const mains = CHECK_KEYS.filter((k) => k in spec);
  if (mains.length !== 1) throw new Malformed(mains.length ? `several check keys: ${mains.join(", ")}` : `unknown check ${JSON.stringify(Object.keys(spec))}`);
  const key = mains[0];
  const nodes = nodesOf(doc);
  const all = ids(nodes);
  const res = (pass: boolean, detail: string) => ({ check: key, pass, detail });

  switch (key) {
    case "has_kind": {
      if (typeof spec.has_kind !== "string") throw new Malformed("has_kind must be a string");
      const b = bounds(spec, "has_kind");
      const hit = all.filter((i) => nodes[i]?.kind === spec.has_kind);
      return res(within(hit.length, b), `${hit.length} node(s) of kind ${spec.has_kind} [${hit.join(", ")}]; required ${rangeStr(b)}`);
    }
    case "no_kind": {
      if (typeof spec.no_kind !== "string") throw new Malformed("no_kind must be a string");
      const extra = Object.keys(spec).filter((k) => k !== "no_kind");
      if (extra.length) throw new Malformed(`unexpected key(s) ${extra.join(", ")}`);
      const hit = all.filter((i) => nodes[i]?.kind === spec.no_kind);
      return res(hit.length === 0, hit.length ? `found kind ${spec.no_kind} at ${hit.join(", ")}` : `no node of kind ${spec.no_kind}`);
    }
    case "uses": {
      if (typeof spec.uses !== "string") throw new Malformed("uses must be a string");
      const b = bounds(spec, "uses");
      const hit = all.filter((i) => usesOf(nodes[i]) === spec.uses);
      return res(within(hit.length, b), `${hit.length} node(s) use ${spec.uses} [${hit.join(", ")}]; required ${rangeStr(b)}`);
    }
    case "no_uses": {
      if (typeof spec.no_uses !== "string") throw new Malformed("no_uses must be a string");
      const extra = Object.keys(spec).filter((k) => k !== "no_uses");
      if (extra.length) throw new Malformed(`unexpected key(s) ${extra.join(", ")}`);
      const hit = all.filter((i) => usesOf(nodes[i]) === spec.no_uses);
      return res(hit.length === 0, hit.length ? `${spec.no_uses} used at ${hit.join(", ")}` : `${spec.no_uses} is never used`);
    }
    case "precedes": {
      const p = spec.precedes;
      if (!isObj(p) || Object.keys(spec).length !== 1 || Object.keys(p).sort().join() !== "after,before")
        throw new Malformed(`precedes must be {before: selector, after: selector}`);
      const r = precedesCheck(doc, parseSel(p.before, "before"), parseSel(p.after, "after"));
      return res(r.pass, r.detail);
    }
    case "decide_outcomes": {
      const d = spec.decide_outcomes;
      if (!isObj(d) || Object.keys(spec).length !== 1 || Object.keys(d).join() !== "include") throw new Malformed(`decide_outcomes must be {include: [..]}`);
      const inc = strArray(d.include, "include");
      const decides = all.filter((i) => nodes[i]?.kind === "llm.decide");
      const hit = decides.filter((i) => Array.isArray(nodes[i].outcomes) && inc.every((o) => nodes[i].outcomes.includes(o)));
      return res(hit.length > 0, hit.length ? `llm.decide ${hit[0]} has outcomes ${inc.join(", ")}` : `no llm.decide has all of ${inc.join(", ")} (decides: ${decides.map((i) => `${i}=[${(nodes[i].outcomes ?? []).join(",")}]`).join("; ") || "none"})`);
    }
    case "param_equals": {
      const p = spec.param_equals;
      if (!isObj(p) || Object.keys(spec).length !== 1 || Object.keys(p).sort().join() !== "param,uses,value")
        throw new Malformed(`param_equals must be {uses, param, value}`);
      if (typeof p.uses !== "string" || typeof p.param !== "string") throw new Malformed(`uses and param must be strings`);
      const want = stableStringify(canonicalValue(p.value));
      const cands = all.filter((i) => usesOf(nodes[i]) === p.uses);
      const hit = cands.filter((i) => isObj(nodes[i].with) && Object.prototype.hasOwnProperty.call(nodes[i].with, p.param) && stableStringify(canonicalValue(nodes[i].with[p.param])) === want);
      if (hit.length) return res(true, `${hit[0]}.with.${p.param} equals ${JSON.stringify(p.value)}`);
      if (!cands.length) return res(false, `no node uses ${p.uses}`);
      return res(false, `no node using ${p.uses} has with.${p.param} = ${JSON.stringify(p.value)} (found: ${cands.map((i) => `${i}=${JSON.stringify(nodes[i].with?.[p.param])}`).join("; ")})`);
    }
    case "param_from": {
      const p = spec.param_from;
      if (!isObj(p) || Object.keys(spec).length !== 1 || Object.keys(p).sort().join() !== "param,source,uses")
        throw new Malformed(`param_from must be {uses, param, source}`);
      if (typeof p.uses !== "string" || typeof p.param !== "string") throw new Malformed(`uses and param must be strings`);
      const src = parseSel(p.source, "source");
      const cands = all.filter((i) => usesOf(nodes[i]) === p.uses);
      for (const i of cands) {
        const w = nodes[i].with;
        if (!isObj(w) || !Object.prototype.hasOwnProperty.call(w, p.param)) continue;
        const hit = nodeRefs(w[p.param]).find((r) => r.root === "node" && matches(src, r.id, own(nodes, r.id)));
        if (hit && hit.root === "node") return res(true, `${i}.with.${p.param} references ${hit.id}`);
      }
      return res(false, cands.length ? `no node using ${p.uses} has with.${p.param} referencing a node matching ${selStr(src)}` : `no node uses ${p.uses}`);
    }
    case "approval_role": {
      if (typeof spec.approval_role !== "string" || Object.keys(spec).length !== 1) throw new Malformed(`approval_role must be a role string`);
      const hit = all.filter((i) => (nodes[i]?.kind === "human.approval" || nodes[i]?.kind === "human.form") && nodes[i].assignee_role === spec.approval_role);
      return res(hit.length > 0, hit.length ? `${hit[0]} is assigned to ${spec.approval_role}` : `no human.approval/human.form has assignee_role ${spec.approval_role}`);
    }
    case "timeout_max": {
      const t = spec.timeout_max;
      if (!isObj(t) || Object.keys(spec).length !== 1 || Object.keys(t).sort().join() !== "duration,kind" || typeof t.kind !== "string")
        throw new Malformed(`timeout_max must be {kind, duration}`);
      const max = durationSeconds(t.duration);
      if (max === null) throw new Malformed(`duration "${t.duration}" is not an ISO-8601 duration`);
      const ofKind = all.filter((i) => nodes[i]?.kind === t.kind);
      if (!ofKind.length) return res(false, `no node of kind ${t.kind}`);
      const bad: string[] = [];
      for (const i of ofKind) {
        const raw = nodes[i].timeout ?? nodes[i].callback_timeout;
        const sec = durationSeconds(raw);
        if (sec === null) bad.push(`${i} has no valid timeout (${JSON.stringify(raw)})`);
        else if (sec > max) bad.push(`${i} timeout ${raw} exceeds ${t.duration}`);
      }
      return res(bad.length === 0, bad.length ? bad.join("; ") : `all ${ofKind.length} ${t.kind} node(s) have timeout <= ${t.duration}`);
    }
    case "foreach_over": {
      const f = spec.foreach_over;
      if (!isObj(f) || Object.keys(spec).length !== 1 || Object.keys(f).join() !== "source") throw new Malformed(`foreach_over must be {source: selector}`);
      const src = parseSel(f.source, "source");
      const fe = all.filter((i) => nodes[i]?.kind === "foreach");
      if (!fe.length) return res(false, `no foreach node`);
      for (const i of fe) {
        const hit = nodeRefs(nodes[i].items).find((r) => r.root === "node" && matches(src, r.id, own(nodes, r.id)));
        if (hit && hit.root === "node") return res(true, `${i} iterates over ${hit.id}`);
      }
      return res(false, `no foreach iterates over a node matching ${selStr(src)} (items: ${fe.map((i) => `${i}=${JSON.stringify(nodes[i].items)}`).join("; ")})`);
    }
    case "agent_tools": {
      const a = spec.agent_tools;
      if (!isObj(a) || Object.keys(spec).length !== 1 || Object.keys(a).some((k) => k !== "include" && k !== "exclude"))
        throw new Malformed(`agent_tools must be {include?: [..], exclude?: [..]}`);
      const inc = a.include === undefined ? [] : strArray(a.include, "include");
      const exc = a.exclude === undefined ? [] : strArray(a.exclude, "exclude");
      const agents = all.filter((i) => nodes[i]?.kind === "agent");
      if (!agents.length) return res(false, `no agent node`);
      const hit = agents.filter((i) => {
        const t: string[] = Array.isArray(nodes[i].tools) ? nodes[i].tools : [];
        return inc.every((x) => t.includes(x)) && exc.every((x) => !t.includes(x));
      });
      return res(hit.length > 0, hit.length ? `agent ${hit[0]} has tools [${nodes[hit[0]].tools.join(", ")}]` : `no agent has all of [${inc.join(", ")}] and none of [${exc.join(", ")}] (agents: ${agents.map((i) => `${i}=[${(nodes[i].tools ?? []).join(",")}]`).join("; ")})`);
    }
    case "preserves": {
      if (Object.keys(spec).length !== 1) throw new Malformed(`unexpected key(s)`);
      const want = strArray(spec.preserves, "preserves");
      if (!isObj(seed) || !isObj(seed.nodes)) return res(false, `preserves needs the seed flow (pass {seed}); none provided`);
      const bad: string[] = [];
      for (const i of want) {
        const s = own(seed.nodes, i);
        if (!s) bad.push(`${i} is not in the seed (rubric error)`);
        else if (!own(nodes, i)) bad.push(`${i} was removed`);
        else if (nodes[i].kind !== s.kind) bad.push(`${i} changed kind ${s.kind} -> ${nodes[i].kind}`);
      }
      return res(bad.length === 0, bad.length ? bad.join("; ") : `${want.join(", ")} kept with the same kind`);
    }
    case "absent": {
      if (Object.keys(spec).length !== 1) throw new Malformed(`unexpected key(s)`);
      const want = strArray(spec.absent, "absent");
      const present = want.filter((i) => Object.prototype.hasOwnProperty.call(nodes, i));
      return res(present.length === 0, present.length ? `still present: ${present.join(", ")}` : `${want.join(", ")} absent`);
    }
  }
  throw new Malformed("unreachable");
}

export function checkRubric(doc: unknown, rubric: unknown, opts: { seed?: unknown } = {}): RubricResult {
  const checks = Array.isArray(rubric) ? rubric : isObj(rubric) && Array.isArray(rubric.checks) ? rubric.checks : null;
  if (!checks) throw new TypeError(`rubric must be an array of checks or {"checks": [...]}`);
  const results: RubricCheckResult[] = checks.map((spec: any) => {
    try {
      const r = runOne(doc, spec, opts.seed);
      return { ...r, spec };
    } catch (e: any) {
      if (e instanceof Malformed) {
        const name = isObj(spec) ? (CHECK_KEYS.find((k) => k in spec) ?? "unknown") : "unknown";
        return { check: name, pass: false, detail: `malformed check: ${e.message}`, spec };
      }
      throw e;
    }
  });
  const passed = results.filter((r) => r.pass).length;
  return { passed, total: results.length, ok: passed === results.length, results };
}
