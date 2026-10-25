// Static checker for the hook-augmented graph (design section 6). Independent of format/.
import { catalogue } from './catalogue.ts';
import { referencedNodes } from './refs.ts';
import { isHuman, metaOf, placementsFor, routesOf, selMatch, successorsOf, type Json, type Placement, type Rule } from './hooks.ts';

export interface Issue { code: string; severity: 'error' | 'warning'; node?: string; hook?: string; message: string }
export interface CheckResult { errors: Issue[]; warnings: Issue[] }

const SNAKE = /^[a-z][a-z0-9_]*$/;
const SELECTOR_FIELDS = ['kind', 'effect', 'nodes', 'tags'];
const HOOK_FIELDS = ['id', 'kind', 'when', 'input', 'source', 'uses', 'with', 'on_error', 'routes', 'max_retries', 'allow_effect_retry'];
const KINDS = ['block', 'code', 'llm.extract', 'llm.generate', 'llm.decide', 'human.approval', 'delegate', 'switch', 'wait', 'end'];
const EFFECTS = ['read', 'write', 'send', 'pay', 'human', 'none'];

export function checkFlow(def: Json): CheckResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const err = (code: string, message: string, node?: string, hook?: string) => errors.push({ code, severity: 'error', node, hook, message });
  const warn = (code: string, message: string, node?: string, hook?: string) => warnings.push({ code, severity: 'warning', node, hook, message });
  const isObj = (x: unknown): x is Json => !!x && typeof x === 'object' && !Array.isArray(x);
  const strArr = (x: unknown): x is string[] => Array.isArray(x) && x.every((s) => typeof s === 'string');
  const nodes = def.nodes as Record<string, Json>;

  // ---- H_SCHEMA
  const checkSelector = (sel: unknown, where: string, node?: string, hook?: string) => {
    if (!isObj(sel)) { err('H_SCHEMA', `${where}: selector must be an object`, node, hook); return; }
    for (const [k, v] of Object.entries(sel)) {
      if (!SELECTOR_FIELDS.includes(k)) { err('H_SCHEMA', `${where}: unknown selector field ${k}`, node, hook); continue; }
      if (!strArr(v)) { err('H_SCHEMA', `${where}: selector field ${k} must be a list of strings`, node, hook); continue; }
      if (k === 'kind') for (const x of v) if (!KINDS.includes(x)) err('H_SCHEMA', `${where}: unknown node kind ${x}`, node, hook);
      if (k === 'effect') for (const x of v) if (!EFFECTS.includes(x)) err('H_SCHEMA', `${where}: unknown effect ${x}`, node, hook);
      if (k === 'nodes') for (const x of v) if (!nodes[x]) err('H_SCHEMA', `${where}: selector names unknown node ${x}`, node, hook);
    }
  };
  const checkHook = (h: unknown, phase: 'pre' | 'post', label: string, node?: string, ruleId?: string) => {
    if (!isObj(h)) { err('H_SCHEMA', `${label}: hook must be an object`, node, label); return; }
    for (const k of Object.keys(h)) if (!HOOK_FIELDS.includes(k)) err('H_SCHEMA', `${label}: unknown hook field ${k}`, node, label);
    if (ruleId === undefined) { if (typeof h.id !== 'string' || !SNAKE.test(h.id)) err('H_SCHEMA', `${label}: hook id must be snake_case`, node, label); }
    else if (h.id !== undefined && h.id !== ruleId) err('H_SCHEMA', `${label}: a flow-rule hook's id must equal the rule id ${ruleId}`, node, label);
    if (h.kind !== 'code' && h.kind !== 'block') err('H_SCHEMA', `${label}: hook kind must be code or block`, node, label);
    if (h.when !== undefined) {
      if (!isObj(h.when)) err('H_SCHEMA', `${label}: when must be an object`, node, label);
      else {
        for (const k of Object.keys(h.when)) if (!['from', 'next', 'outcome'].includes(k)) err('H_SCHEMA', `${label}: unknown when field ${k}`, node, label);
        if (h.when.from !== undefined) checkSelector(h.when.from, `${label}.when.from`, node, label);
        if (h.when.next !== undefined) { checkSelector(h.when.next, `${label}.when.next`, node, label); if (phase === 'pre') err('H_SCHEMA', `${label}: when.next is only valid on post hooks`, node, label); }
        if (h.when.outcome !== undefined) { if (!strArr(h.when.outcome)) err('H_SCHEMA', `${label}: when.outcome must be a list of strings`, node, label); if (phase === 'pre') err('H_SCHEMA', `${label}: when.outcome is only valid on post hooks`, node, label); }
      }
    }
    if (h.input !== undefined && !isObj(h.input)) err('H_SCHEMA', `${label}: input must be an object`, node, label);
    if (h.on_error !== undefined && h.on_error !== 'fail' && h.on_error !== 'continue') err('H_SCHEMA', `${label}: on_error must be fail or continue`, node, label);
    if (h.kind === 'code') {
      if (typeof h.source !== 'string') err('H_SCHEMA', `${label}: code hook needs source`, node, label);
      if (h.uses !== undefined || h.with !== undefined) err('H_SCHEMA', `${label}: code hook must not have uses/with`, node, label);
    }
    if (h.kind === 'block') {
      if (typeof h.uses !== 'string' || !isObj(h.with)) err('H_SCHEMA', `${label}: block hook needs uses and with`, node, label);
      if (h.source !== undefined) err('H_SCHEMA', `${label}: block hook must not have source`, node, label);
    }
    const postCodeOnly = h.kind === 'code' && phase === 'post';
    for (const k of ['routes', 'max_retries', 'allow_effect_retry']) if (h[k] !== undefined && !postCodeOnly) err('H_SCHEMA', `${label}: ${k} is only allowed on post code hooks`, node, label);
    if (h.routes !== undefined && (!strArr(h.routes) || h.routes.length === 0)) err('H_SCHEMA', `${label}: routes must be a non-empty list of node ids`, node, label);
    if (h.max_retries !== undefined && (!Number.isInteger(h.max_retries) || h.max_retries < 1 || h.max_retries > 5)) err('H_SCHEMA', `${label}: max_retries must be an integer 1..5`, node, label);
    if (h.allow_effect_retry !== undefined && h.allow_effect_retry !== true) err('H_SCHEMA', `${label}: allow_effect_retry must be true when present`, node, label);
    if (h.allow_effect_retry !== undefined && h.max_retries === undefined) err('H_SCHEMA', `${label}: allow_effect_retry needs max_retries`, node, label);
  };

  const version = def.ursitoare;
  const rules: Rule[] = Array.isArray(def.hooks) ? def.hooks : [];
  if (def.hooks !== undefined && !Array.isArray(def.hooks)) err('H_SCHEMA', 'hooks must be a list of rules');
  if (version === '0.1') {
    if (def.hooks !== undefined) err('H_SCHEMA', 'format 0.1 has no flow-level hooks (use ursitoare: "0.2-draft")');
    for (const [id, n] of Object.entries(nodes)) for (const k of ['pre', 'post', 'tags']) if (n[k] !== undefined) err('H_SCHEMA', `format 0.1 node ${id} has no ${k} field (use ursitoare: "0.2-draft")`, id);
    return { errors, warnings };
  }
  const ruleIds = new Set<string>();
  rules.forEach((r, i) => {
    const lbl = `hooks[${i}]`;
    if (!isObj(r)) { err('H_SCHEMA', `${lbl}: rule must be an object`); return; }
    for (const k of Object.keys(r)) if (!['id', 'match', 'pre', 'post'].includes(k)) err('H_SCHEMA', `${lbl}: unknown rule field ${k}`);
    if (typeof r.id !== 'string' || !SNAKE.test(r.id)) err('H_SCHEMA', `${lbl}: rule id must be snake_case`);
    else if (ruleIds.has(r.id)) err('H_SCHEMA', `${lbl}: duplicate rule id ${r.id}`);
    else ruleIds.add(r.id);
    if (r.match !== undefined) checkSelector(r.match, `${lbl}.match`);
    if (!r.pre && !r.post) err('H_SCHEMA', `${lbl}: rule needs pre or post`);
    if (r.pre) checkHook(r.pre, 'pre', `@${r.id}`, undefined, r.id);
    if (r.post) checkHook(r.post, 'post', `@${r.id}`, undefined, r.id);
  });
  for (const [id, n] of Object.entries(nodes)) {
    if (n.tags !== undefined && !strArr(n.tags)) err('H_SCHEMA', `node ${id}: tags must be a list of strings`, id);
    const seen = new Set<string>();
    for (const phase of ['pre', 'post'] as const) {
      if (n[phase] === undefined) continue;
      if (!Array.isArray(n[phase])) { err('H_SCHEMA', `node ${id}: ${phase} must be a list of hooks`, id); continue; }
      for (const h of n[phase] as unknown[]) {
        checkHook(h, phase, `${id}.${phase}.${isObj(h) ? h.id : '?'}`, id);
        if (isObj(h) && typeof h.id === 'string') { if (seen.has(h.id)) err('H_SCHEMA', `node ${id}: duplicate hook id ${h.id}`, id, h.id); seen.add(h.id); }
      }
    }
  }
  if (errors.some((e) => e.code === 'H_SCHEMA')) return { errors, warnings }; // later rules assume well-formed hooks

  // ---- per-node placements
  const pl: Record<string, { pre: Placement[]; post: Placement[] }> = {};
  for (const id of Object.keys(nodes)) pl[id] = { pre: placementsFor(def, id, 'pre'), post: placementsFor(def, id, 'post') };

  // ---- H_BLOCK
  for (const [id, p] of Object.entries(pl)) for (const x of [...p.pre, ...p.post]) {
    const h = x.hook;
    if (h.kind !== 'block') continue;
    const cat = catalogue.blocks[h.uses!];
    if (!cat) { err('H_BLOCK', `${x.stepName}: block ${h.uses} is not in the catalogue`, id, x.label); continue; }
    const props = Object.keys(cat.input.properties ?? {});
    const keys = Object.keys(h.with ?? {});
    for (const k of keys) if (!props.includes(k)) err('H_BLOCK', `${x.stepName}: with key ${k} is not an input of ${h.uses}`, id, x.label);
    for (const r of cat.input.required ?? []) if (!keys.includes(r)) err('H_BLOCK', `${x.stepName}: required input ${r} of ${h.uses} is missing`, id, x.label);
  }

  // ---- H_ROUTE_TARGET, H_ROUTE_HUMAN, H_RETRY_SCOPE
  for (const [id, p] of Object.entries(pl)) {
    const meta = metaOf(def, id);
    for (const x of p.post) {
      const h = x.hook;
      for (const to of h.routes ?? []) {
        if (!nodes[to]) err('H_ROUTE_TARGET', `${x.stepName}: route ${to} does not exist`, id, x.label);
        else if (to === id) err('H_ROUTE_TARGET', `${x.stepName}: route ${to} is the wrapped node itself`, id, x.label);
      }
      if (h.routes && (isHuman(meta.kind) || meta.kind === 'end')) err('H_ROUTE_HUMAN', `${x.stepName}: routes are not allowed on ${meta.kind} nodes`, id, x.label);
      if (h.max_retries !== undefined) {
        if (isHuman(meta.kind) || ['delegate', 'switch', 'wait', 'end'].includes(meta.kind)) err('H_RETRY_SCOPE', `${x.stepName}: max_retries is not allowed on ${meta.kind} nodes`, id, x.label);
        else if (meta.effect !== 'read' && h.allow_effect_retry !== true) err('H_RETRY_SCOPE', `${x.stepName}: node ${id} has effect ${meta.effect}; retry needs allow_effect_retry: true`, id, x.label);
      }
    }
  }

  // ---- augmented graph
  const succ: Record<string, string[]> = {};
  for (const [id, n] of Object.entries(nodes)) succ[id] = [...new Set([...successorsOf(n), ...routesOf(def, id)])].filter((t) => nodes[t]);
  const start = def.start as string;

  // H_CYCLE: DFS colouring
  const colour: Record<string, number> = {};
  const cycles: string[] = [];
  const dfs = (u: string, path: string[]) => {
    colour[u] = 1;
    for (const v of succ[u] ?? []) {
      if (colour[v] === 1) cycles.push([...path.slice(path.indexOf(v)), u, v].join(' -> '));
      else if (!colour[v]) dfs(v, [...path, u]);
    }
    colour[u] = 2;
  };
  if (nodes[start]) dfs(start, []);
  for (const c of cycles) err('H_CYCLE', `the augmented graph has a cycle: ${c}`);

  // H_DOMINANCE: iterative dominators on the augmented graph
  const reach = new Set<string>();
  const stack = nodes[start] ? [start] : [];
  while (stack.length) { const u = stack.pop()!; if (reach.has(u)) continue; reach.add(u); stack.push(...(succ[u] ?? [])); }
  const preds: Record<string, string[]> = {};
  for (const u of reach) for (const v of succ[u] ?? []) (preds[v] ??= []).push(u);
  const dom: Record<string, Set<string>> = {};
  for (const u of reach) dom[u] = u === start ? new Set([start]) : new Set(reach);
  for (let changed = true; changed;) {
    changed = false;
    for (const u of reach) {
      if (u === start) continue;
      const ps = (preds[u] ?? []).filter((p) => reach.has(p));
      let inter: Set<string> | undefined;
      for (const p of ps) { const dp = dom[p]!; inter = inter === undefined ? new Set(dp) : new Set([...inter].filter((x: string) => dp.has(x))); }
      const next = new Set<string>(inter ?? []); next.add(u);
      if (next.size !== dom[u]!.size) { dom[u] = next; changed = true; }
    }
  }
  const checkRefs = (value: unknown, consumer: string, allowSelf: boolean, where: string, hook?: string) => {
    if (!reach.has(consumer)) return;
    for (const p of referencedNodes(value)) {
      if (!nodes[p]) { err('H_DOMINANCE', `${where}: references unknown node ${p}`, consumer, hook); continue; }
      if (p === consumer) { if (!allowSelf) err('H_DOMINANCE', `${where}: references its own node ${p} before it has run`, consumer, hook); continue; }
      if (!dom[consumer]!.has(p)) err('H_DOMINANCE', `${where}: producer ${p} does not dominate ${consumer} on the augmented graph (some path reaches ${consumer} without running ${p})`, consumer, hook);
    }
  };
  for (const [id, n] of Object.entries(nodes)) {
    const { pre: _pre, post: _post, tags: _tags, ...fields } = n;
    checkRefs(fields, id, false, `node ${id}`);
    for (const x of pl[id]!.pre) checkRefs([x.hook.input, x.hook.with], id, false, x.stepName, x.label);
    for (const x of pl[id]!.post) checkRefs([x.hook.input, x.hook.with], id, true, x.stepName, x.label);
  }

  // ---- W_NO_MATCH
  rules.forEach((r) => {
    if (!Object.keys(nodes).some((id) => selMatch(r.match ?? {}, metaOf(def, id)))) warn('W_NO_MATCH', `flow rule ${r.id} matches no node`, undefined, `@${r.id}`);
  });
  return { errors, warnings };
}
