// Hook model, pure logic only (design sections 3, 4): metas, selectors, placement order, action validation.
// No I/O here: every outbound call stays in interpreter.ts, after policy.check (see tests/lint.mjs).
import { RunFailure } from './errors.ts';
import { catalogue } from './catalogue.ts';

export type Json = Record<string, any>;
export interface Meta { id: string; kind: string; effect: string; tags: string[] }
export interface Selector { kind?: string[]; effect?: string[]; nodes?: string[]; tags?: string[] }
export interface HookDef {
  id?: string; kind: 'code' | 'block';
  when?: { from?: Selector; next?: Selector; outcome?: string[] };
  input?: Json; source?: string; uses?: string; with?: Json;
  on_error?: 'fail' | 'continue'; routes?: string[]; max_retries?: number; allow_effect_retry?: boolean;
}
export interface Rule { id: string; match?: Selector; pre?: HookDef; post?: HookDef }
export interface Placement { phase: 'pre' | 'post'; hook: HookDef; hookId: string; ruleId?: string; label: string; stepName: string }
export interface Action { action: 'continue' | 'skip' | 'redirect' | 'retry' | 'fail'; input?: any; output?: any; outcome?: string; to?: string; feedback?: unknown; reason?: string }

export const HOOK_PHASES = ['pre', 'post'] as const;

export function effectOf(node: Json): string {
  switch (node.kind) {
    case 'block': return catalogue.blocks[node.uses]?.effect ?? 'read';
    case 'delegate': return 'send';
    case 'human.approval': case 'human.form': return 'human';
    case 'end': return 'none';
    default: return 'read'; // llm.*, code, switch, wait
  }
}
export const isHuman = (kind: string) => kind.startsWith('human.');
export const isLlm = (kind: string) => kind.startsWith('llm.');

export function metaOf(def: Json, id: string): Meta {
  const n = def.nodes[id];
  return { id, kind: n.kind, effect: effectOf(n), tags: Array.isArray(n.tags) ? n.tags : [] };
}

export function selMatch(sel: Selector | undefined, m: Meta | null): boolean {
  if (!sel) return true;
  if (m === null) return false;
  if (sel.kind && !sel.kind.includes(m.kind)) return false;
  if (sel.effect && !sel.effect.includes(m.effect)) return false;
  if (sel.nodes && !sel.nodes.includes(m.id)) return false;
  if (sel.tags && !sel.tags.some((t) => m.tags.includes(t))) return false;
  return true;
}

/** Runtime `when`: from (pre and post), next and outcome (post only). A missing `from` (start node) never matches a from-selector. */
export function whenMatch(when: HookDef['when'], from: Meta | null, next: Meta | null, outcome: string | null): boolean {
  if (!when) return true;
  if (when.from !== undefined && !selMatch(when.from, from)) return false;
  if (when.next !== undefined && !selMatch(when.next, next)) return false;
  if (when.outcome !== undefined && (outcome === null || !when.outcome.includes(outcome))) return false;
  return true;
}

function place(phase: 'pre' | 'post', nodeId: string, h: HookDef, ruleId?: string): Placement {
  const label = ruleId ? `@${ruleId}` : String(h.id);
  return { phase, hook: h, hookId: ruleId ?? String(h.id), ruleId, label, stepName: `${nodeId}#${phase}:${label}` };
}

/** Execution order (section 4): pre = matching flow rules in declaration order, then node-level; post = node-level, then matching rules in reverse declaration order. */
export function placementsFor(def: Json, nodeId: string, phase: 'pre' | 'post'): Placement[] {
  const node = def.nodes[nodeId];
  const meta = metaOf(def, nodeId);
  const rules: Rule[] = ((def.hooks ?? []) as Rule[]).filter((r) => r[phase] && selMatch(r.match ?? {}, meta));
  const rulePs = rules.map((r) => place(phase, nodeId, r[phase]!, r.id));
  const nodePs = ((node[phase] ?? []) as HookDef[]).map((h) => place(phase, nodeId, h));
  return phase === 'pre' ? [...rulePs, ...nodePs] : [...nodePs, ...rulePs.reverse()];
}

/** Declared successors of a node (v0.1 edges). */
export function successorsOf(node: Json): string[] {
  const out: string[] = [];
  const add = (x: unknown) => { if (typeof x === 'string') out.push(x); };
  switch (node.kind) {
    case 'llm.decide': case 'human.approval': Object.values(node.cases ?? {}).forEach(add); break;
    case 'switch': Object.values(node.cases ?? {}).forEach(add); add(node.default); break;
    case 'delegate': add(node.next); add(node.on_timeout); break;
    case 'end': break;
    default: add(node.next);
  }
  return [...new Set(out)];
}

/** Pre-phase `ctx.next`: the single static successor, for block, code, llm.extract/generate and wait; otherwise null. */
export function singleStaticNext(node: Json): string | null {
  return ['block', 'code', 'llm.extract', 'llm.generate', 'wait'].includes(node.kind) && typeof node.next === 'string' ? node.next : null;
}

/** Every route declared by the post hooks that wrap a node (node-level plus matching flow rules). */
export function routesOf(def: Json, nodeId: string): string[] {
  return [...new Set(placementsFor(def, nodeId, 'post').flatMap((p) => p.hook.routes ?? []))];
}

const ACTIONS = new Set(['continue', 'skip', 'redirect', 'retry', 'fail']);

/** Normalise what a code hook returned. Nothing (null/undefined/{}) means continue. */
export function normalizeAction(ret: unknown, hid: string): Action {
  if (ret === null || ret === undefined) return { action: 'continue' };
  if (typeof ret !== 'object' || Array.isArray(ret)) throw new RunFailure('hook_action_invalid', `hook ${hid} returned a non-object`);
  const r = ret as Json;
  if (Object.keys(r).length === 0) return { action: 'continue' };
  if (typeof r.action !== 'string' || !ACTIONS.has(r.action)) throw new RunFailure('hook_action_invalid', `hook ${hid} returned an unknown action ${JSON.stringify(r.action)}`);
  return r as Action;
}

const forbidden = (hid: string, what: string, node: Meta): never => {
  throw new RunFailure('hook_action_forbidden', `hook ${hid}: ${what} is not allowed on ${node.kind} node ${node.id} (effect ${node.effect})`, node.id, { hook: hid, action: what });
};

/** Section 3.4: which nodes a given action may touch. Throws hook_action_forbidden. */
export function assertAllowed(p: Placement, act: Action, node: Meta): void {
  const hid = p.stepName;
  const k = node.kind;
  const a = act.action;
  if (a === 'fail') return;
  if (p.phase === 'pre') {
    if (a === 'redirect' || a === 'retry') forbidden(hid, a, node);
    if (a === 'continue' && act.output !== undefined) forbidden(hid, 'mutate output in a pre-hook', node);
    if (a === 'skip') {
      const skippable = node.effect === 'read' && (k === 'block' || k === 'code' || isLlm(k));
      if (!skippable) forbidden(hid, 'skip', node);
    }
    return;
  }
  // post
  if (a === 'skip') forbidden(hid, 'skip in a post-hook', node);
  if (a === 'continue' && act.input !== undefined) forbidden(hid, 'mutate input in a post-hook', node);
  if (a === 'continue' && act.output !== undefined) {
    const ok = k === 'block' || k === 'code' || k === 'llm.extract' || k === 'llm.generate' || k === 'delegate';
    if (!ok) forbidden(hid, 'mutate output', node);
  }
  if (a === 'redirect') {
    if (isHuman(k) || k === 'end') forbidden(hid, 'redirect', node);
    if (typeof act.to !== 'string' || !(p.hook.routes ?? []).includes(act.to)) throw new RunFailure('hook_route_undeclared', `hook ${hid} redirected to ${JSON.stringify(act.to)}, which is not in its routes ${JSON.stringify(p.hook.routes ?? [])}`, node.id, { hook: hid, to: act.to });
  }
  if (a === 'retry') {
    if (p.hook.max_retries === undefined) forbidden(hid, 'retry (hook has no max_retries)', node);
    const ok = (k === 'block' && (node.effect === 'read' || p.hook.allow_effect_retry === true)) || k === 'code' || isLlm(k);
    if (!ok) forbidden(hid, 'retry', node);
  }
}
