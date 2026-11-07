import type { Catalogue, Flow, HookSelector } from "../format/index.ts";
import {
  hookValueFields,
  NODE_KINDS,
  scanTemplate,
  valueFields,
  walkStrings,
} from "../format/index.ts";
import type { Issue } from "../validate/index.ts";
import type { EffectClass, HookPlacement } from "./model.ts";
import {
  augmentedSuccessors,
  HOOKLESS_KINDS,
  hookPlacements,
  nodeMeta,
  selectorMatches,
} from "./model.ts";

type Rec = Record<string, unknown>;

const ID_PATTERN = /^[a-z][a-z0-9_]{0,63}$/;
const MAX_HOOKS = 16;
const EFFECTS: readonly string[] = ["read", "write", "send", "pay", "human", "none"];
const SELECTOR_MEMBERS = ["kind", "effect", "nodes", "tags"];
const COMMON_MEMBERS = ["id", "kind", "when", "input"];
const CODE_ONLY = ["source", "routes", "max_retries", "allow_effect_retry"];
const BLOCK_ONLY = ["uses", "with", "on_error"];
const RULE_MEMBERS = ["id", "match", "pre", "post"];
const WHEN_MEMBERS = ["from", "next", "outcome"];

function isObject(value: unknown): value is Rec {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pointer(parent: string, segment: string | number): string {
  return `${parent}/${String(segment).replace(/~/g, "~0").replace(/\//g, "~1")}`;
}

interface Scan {
  nodes: Rec;
  issues: Issue[];
}

function schema(scan: Scan, node: string | null, path: string, message: string): void {
  scan.issues.push({ layer: "H", code: "H_SCHEMA", node, path, message });
}

function checkSelector(scan: Scan, path: string, selector: unknown): void {
  if (!isObject(selector)) {
    schema(scan, null, path, "a selector must be an object");
    return;
  }
  for (const key of Object.keys(selector)) {
    const at = pointer(path, key);
    if (!SELECTOR_MEMBERS.includes(key)) {
      schema(scan, null, at, "unknown selector member");
      continue;
    }
    const list = selector[key];
    if (!Array.isArray(list)) {
      schema(scan, null, at, "a selector member must be a list");
      continue;
    }
    list.forEach((entry, i) => {
      const ok =
        key === "kind"
          ? NODE_KINDS.includes(entry as never)
          : key === "effect"
            ? EFFECTS.includes(entry as string)
            : key === "nodes"
              ? typeof entry === "string" && Object.hasOwn(scan.nodes, entry)
              : typeof entry === "string";
      if (!ok) schema(scan, null, pointer(at, i), `invalid entry in selector member ${key}`);
    });
  }
}

interface HookCtx {
  node: string | null;
  phase: "pre" | "post";
  ruleId: string | null;
}

function checkWhen(scan: Scan, ctx: HookCtx, path: string, when: unknown): void {
  if (!isObject(when)) {
    schema(scan, ctx.node, path, "when must be an object");
    return;
  }
  for (const key of Object.keys(when)) {
    const at = pointer(path, key);
    if (!WHEN_MEMBERS.includes(key)) {
      schema(scan, ctx.node, at, "unknown when member");
    } else if (ctx.phase === "pre" && key !== "from") {
      schema(scan, ctx.node, at, `when.${key} is only allowed on a post hook`);
    } else if (key === "outcome") {
      const list = when[key];
      if (!Array.isArray(list)) {
        schema(scan, ctx.node, at, "when.outcome must be a list of strings");
      } else {
        list.forEach((entry, i) => {
          if (typeof entry !== "string") {
            schema(scan, ctx.node, pointer(at, i), "when.outcome entries must be strings");
          }
        });
      }
    } else {
      const before = scan.issues.length;
      checkSelector(scan, at, when[key]);
      for (let i = before; i < scan.issues.length; i += 1) {
        const issue = scan.issues[i];
        if (issue !== undefined) issue.node = ctx.node;
      }
    }
  }
}

function checkRefs(scan: Scan, ctx: HookCtx, path: string, value: unknown, isWith: boolean): void {
  walkStrings(value, path, (text, at) => {
    for (const seg of scanTemplate(text)) {
      if (seg.type !== "ref") continue;
      if (seg.error !== undefined || seg.ref === undefined) {
        schema(scan, ctx.node, at, "unparsable reference in a hook");
        return;
      }
      if (seg.ref.root === "item") {
        schema(scan, ctx.node, at, "an item reference is not allowed in a hook");
        return;
      }
      if (seg.ref.root === "hook" && !isWith) {
        schema(scan, ctx.node, at, "a hook reference is only allowed in a block hook's with");
        return;
      }
    }
  });
}

function checkHook(scan: Scan, ctx: HookCtx, path: string, hook: unknown): void {
  if (!isObject(hook)) {
    schema(scan, ctx.node, path, "a hook must be an object");
    return;
  }
  const at = (member: string): string => pointer(path, member);
  const bad = (p: string, message: string): void => schema(scan, ctx.node, p, message);

  if (ctx.ruleId !== null) {
    if (hook.id !== undefined && hook.id !== ctx.ruleId) {
      bad(at("id"), "a rule hook id must equal the rule id");
    }
  } else if (hook.id === undefined) {
    bad(path, "a hook needs an id");
  } else if (typeof hook.id !== "string" || !ID_PATTERN.test(hook.id)) {
    bad(at("id"), "a hook id must match ^[a-z][a-z0-9_]{0,63}$ (at most 64 characters)");
  }

  if (hook.input !== undefined) {
    if (isObject(hook.input)) checkRefs(scan, ctx, at("input"), hook.input, false);
    else bad(at("input"), "input must be an object");
  }
  if (hook.when !== undefined) checkWhen(scan, ctx, at("when"), hook.when);

  const kind = hook.kind;
  if (kind !== "code" && kind !== "block") {
    bad(kind === undefined ? path : at("kind"), 'a hook kind must be "code" or "block"');
    return;
  }
  const own = kind === "code" ? CODE_ONLY : BLOCK_ONLY;
  const other = kind === "code" ? BLOCK_ONLY : CODE_ONLY;
  for (const key of Object.keys(hook)) {
    if (COMMON_MEMBERS.includes(key) || own.includes(key)) continue;
    bad(at(key), other.includes(key) ? `${key} is not allowed on a ${kind} hook` : "unknown hook member");
  }

  if (kind === "code") {
    if (hook.source === undefined) bad(path, "a code hook needs a source");
    else if (typeof hook.source !== "string") bad(at("source"), "source must be a string");
    checkCodeRetry(scan, ctx, path, hook);
  } else {
    if (hook.uses === undefined) bad(path, "a block hook needs uses");
    else if (typeof hook.uses !== "string") bad(at("uses"), "uses must be a string");
    if (hook.with === undefined) bad(path, "a block hook needs with");
    else if (!isObject(hook.with)) bad(at("with"), "with must be an object");
    else checkRefs(scan, ctx, at("with"), hook.with, true);
    if (hook.on_error !== undefined && hook.on_error !== "fail" && hook.on_error !== "continue") {
      bad(at("on_error"), 'on_error must be "fail" or "continue"');
    }
  }
}

function checkCodeRetry(scan: Scan, ctx: HookCtx, path: string, hook: Rec): void {
  const at = (member: string): string => pointer(path, member);
  const bad = (p: string, message: string): void => schema(scan, ctx.node, p, message);
  const present = (key: string): boolean => hook[key] !== undefined;
  if (ctx.phase === "pre") {
    for (const key of ["routes", "max_retries", "allow_effect_retry"]) {
      if (present(key)) bad(at(key), `${key} is only allowed on a post hook`);
    }
    return;
  }
  if (present("routes")) {
    const routes = hook.routes;
    if (!Array.isArray(routes) || routes.length === 0) {
      bad(at("routes"), "routes must be a non-empty list of node ids");
    } else {
      routes.forEach((r, i) => {
        if (typeof r !== "string") bad(pointer(at("routes"), i), "a route must be a node id");
      });
    }
  }
  if (present("max_retries")) {
    const n = hook.max_retries;
    if (typeof n !== "number" || !Number.isInteger(n) || n < 1 || n > 5) {
      bad(at("max_retries"), "max_retries must be an integer from 1 to 5");
    }
  }
  if (present("allow_effect_retry")) {
    if (hook.allow_effect_retry !== true) {
      bad(at("allow_effect_retry"), "allow_effect_retry must be true when present");
    } else if (!present("max_retries")) {
      bad(at("allow_effect_retry"), "allow_effect_retry needs max_retries");
    }
  }
}

function checkPhase(
  scan: Scan,
  id: string,
  node: Rec,
  phase: "pre" | "post",
  seen: Set<string>,
): void {
  const list = node[phase];
  const path = pointer(pointer("/nodes", id), phase);
  if (list === undefined) return;
  if (!Array.isArray(list)) {
    schema(scan, id, path, `${phase} must be a list of hooks`);
    return;
  }
  if (list.length > MAX_HOOKS) {
    schema(scan, id, path, `a node takes at most ${MAX_HOOKS} hooks per phase`);
  }
  const ctx: HookCtx = { node: id, phase, ruleId: null };
  list.forEach((hook, i) => {
    const at = pointer(path, i);
    checkHook(scan, ctx, at, hook);
    if (isObject(hook) && typeof hook.id === "string" && ID_PATTERN.test(hook.id)) {
      if (seen.has(hook.id)) schema(scan, id, pointer(at, "id"), "duplicate hook id in a node");
      seen.add(hook.id);
    }
  });
}

function checkNodes(scan: Scan): void {
  for (const id of Object.keys(scan.nodes)) {
    const node = scan.nodes[id];
    if (!isObject(node)) continue;
    const base = pointer("/nodes", id);
    if (node.tags !== undefined) {
      if (!Array.isArray(node.tags) || !node.tags.every((t) => typeof t === "string")) {
        schema(scan, id, pointer(base, "tags"), "tags must be a list of strings");
      }
    }
    const kind = String(node.kind);
    if ((HOOKLESS_KINDS as readonly string[]).includes(kind)) {
      for (const phase of ["pre", "post"]) {
        if (node[phase] !== undefined) {
          schema(scan, id, pointer(base, phase), `a ${kind} node takes no hooks`);
        }
      }
      continue;
    }
    if (kind === "end" && node.post !== undefined) {
      schema(scan, id, pointer(base, "post"), "an end node takes no post hooks");
    }
    const seen = new Set<string>();
    checkPhase(scan, id, node, "pre", seen);
    if (kind !== "end") checkPhase(scan, id, node, "post", seen);
  }
}

function checkRules(scan: Scan, rules: unknown): void {
  if (rules === undefined) return;
  if (!Array.isArray(rules)) {
    schema(scan, null, "/hooks", "hooks must be a list of rules");
    return;
  }
  if (rules.length > MAX_HOOKS) {
    schema(scan, null, "/hooks", `a flow takes at most ${MAX_HOOKS} hook rules`);
  }
  const seen = new Set<string>();
  rules.forEach((rule, i) => {
    const path = pointer("/hooks", i);
    if (!isObject(rule)) {
      schema(scan, null, path, "a rule must be an object");
      return;
    }
    for (const key of Object.keys(rule)) {
      if (!RULE_MEMBERS.includes(key)) schema(scan, null, pointer(path, key), "unknown rule member");
    }
    let ruleId: string | null = null;
    if (rule.id === undefined) {
      schema(scan, null, path, "a rule needs an id");
    } else if (typeof rule.id !== "string" || !ID_PATTERN.test(rule.id)) {
      schema(scan, null, pointer(path, "id"), "a rule id must match ^[a-z][a-z0-9_]{0,63}$ (at most 64 characters)");
    } else {
      ruleId = rule.id;
      if (seen.has(ruleId)) schema(scan, null, pointer(path, "id"), "duplicate rule id");
      seen.add(ruleId);
    }
    if (rule.pre === undefined && rule.post === undefined) {
      schema(scan, null, path, "a rule needs a pre or a post hook");
    }
    if (rule.match !== undefined) checkSelector(scan, pointer(path, "match"), rule.match);
    for (const phase of ["pre", "post"] as const) {
      if (rule[phase] === undefined) continue;
      const ctx: HookCtx = { node: null, phase, ruleId: ruleId ?? "" };
      checkHook(scan, ctx, pointer(path, phase), rule[phase]);
    }
  });
}

function compare(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function sortIssues(list: Issue[]): Issue[] {
  return list.sort(
    (a, b) => compare(a.path, b.path) || compare(a.code, b.code) || compare(a.message, b.message),
  );
}

function issue(code: string, node: string | null, path: string, message: string): Issue {
  return { layer: "H", code, node, path, message };
}

/** A hook as placed on a wrapped node, with the pointer of its definition. */
interface Placed {
  node: string;
  phase: "pre" | "post";
  hook: Rec;
  path: string;
}

function hookPath(root: Rec, nodeId: string, placement: HookPlacement): string {
  if (placement.ruleId !== null) {
    const rules = Array.isArray(root.hooks) ? root.hooks : [];
    const k = rules.findIndex((r) => isObject(r) && r.id === placement.ruleId);
    return pointer(pointer("/hooks", k), placement.phase);
  }
  const nodes = root.nodes as Rec;
  const list = (nodes[nodeId] as Rec)[placement.phase];
  const i = Array.isArray(list) ? list.indexOf(placement.hook) : -1;
  return pointer(pointer(pointer("/nodes", nodeId), placement.phase), i);
}

function safeBlock(catalogue: Catalogue, uses: unknown): Rec | undefined {
  if (typeof uses !== "string") return undefined;
  try {
    const def: unknown = catalogue.block(uses);
    return isObject(def) ? def : undefined;
  } catch {
    return undefined;
  }
}

function checkBlockDefinition(out: Issue[], node: string | null, path: string, hook: Rec, catalogue: Catalogue): void {
  if (hook.kind !== "block") return;
  const def = safeBlock(catalogue, hook.uses);
  if (def === undefined) {
    out.push(issue("H_BLOCK", node, pointer(path, "uses"), `unknown block ${String(hook.uses)}`));
    return;
  }
  const input = isObject(def.input) ? def.input : {};
  const properties = isObject(input.properties) ? input.properties : {};
  const withValue = isObject(hook.with) ? hook.with : {};
  for (const key of Object.keys(withValue)) {
    if (!Object.hasOwn(properties, key)) {
      out.push(issue("H_BLOCK", node, pointer(pointer(path, "with"), key), `${String(hook.uses)} has no input ${key}`));
    }
  }
  const required = Array.isArray(input.required) ? input.required : [];
  for (const name of required) {
    if (typeof name === "string" && !Object.hasOwn(withValue, name)) {
      out.push(issue("H_BLOCK", node, pointer(path, "with"), `${String(hook.uses)} needs input ${name}`));
    }
  }
}

function dominators(
  start: string,
  succ: ReadonlyMap<string, readonly string[]>,
): { idom: Map<string, string>; reachable: Set<string> } {
  const order: string[] = [];
  const seen = new Set<string>([start]);
  const stack: { id: string; next: number }[] = [{ id: start, next: 0 }];
  while (stack.length > 0) {
    const top = stack[stack.length - 1] as { id: string; next: number };
    const targets = succ.get(top.id) ?? [];
    const target = targets[top.next];
    top.next += 1;
    if (target === undefined) {
      order.push(top.id);
      stack.pop();
    } else if (!seen.has(target)) {
      seen.add(target);
      stack.push({ id: target, next: 0 });
    }
  }
  const rpo = order.reverse();
  const index = new Map(rpo.map((id, i) => [id, i]));
  const preds = new Map<string, string[]>();
  for (const id of rpo) {
    for (const t of succ.get(id) ?? []) {
      if (!index.has(t)) continue;
      const list = preds.get(t) ?? [];
      list.push(id);
      preds.set(t, list);
    }
  }
  const idom = new Map<string, string>([[start, start]]);
  const intersect = (a: string, b: string): string => {
    let x = a;
    let y = b;
    while (x !== y) {
      while ((index.get(x) as number) > (index.get(y) as number)) x = idom.get(x) as string;
      while ((index.get(y) as number) > (index.get(x) as number)) y = idom.get(y) as string;
    }
    return x;
  };
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of rpo) {
      if (id === start) continue;
      let current: string | undefined;
      for (const p of preds.get(id) ?? []) {
        if (!idom.has(p)) continue;
        current = current === undefined ? p : intersect(p, current);
      }
      if (current !== undefined && idom.get(id) !== current) {
        idom.set(id, current);
        changed = true;
      }
    }
  }
  return { idom, reachable: seen };
}

function findCycles(start: string, succ: ReadonlyMap<string, readonly string[]>): string[][] {
  const cycles: string[][] = [];
  const state = new Map<string, 1 | 2>([[start, 1]]);
  const stack: { id: string; targets: string[]; next: number }[] = [
    { id: start, targets: [...(succ.get(start) ?? [])].sort(compare), next: 0 },
  ];
  while (stack.length > 0) {
    const top = stack[stack.length - 1] as { id: string; targets: string[]; next: number };
    const target = top.targets[top.next];
    top.next += 1;
    if (target === undefined) {
      state.set(top.id, 2);
      stack.pop();
    } else if (state.get(target) === 1) {
      const ids = stack.map((f) => f.id);
      const cycle = ids.slice(ids.indexOf(target));
      const smallest = cycle.reduce((a, b) => (compare(b, a) < 0 ? b : a));
      const at = cycle.indexOf(smallest);
      cycles.push([...cycle.slice(at), ...cycle.slice(0, at)]);
    } else if (!state.has(target)) {
      state.set(target, 1);
      stack.push({ id: target, targets: [...(succ.get(target) ?? [])].sort(compare), next: 0 });
    }
  }
  return cycles;
}

function checkSemantics(root: Rec, catalogue: Catalogue): { errors: Issue[]; warnings: Issue[] } {
  const flow = root as unknown as Flow;
  const nodes = root.nodes as Rec;
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const ids = Object.keys(nodes).filter((id) => isObject(nodes[id]));
  const rules = Array.isArray(root.hooks) ? root.hooks : [];

  // H_BLOCK: once per definition
  ids.forEach((id) => {
    for (const phase of ["pre", "post"] as const) {
      const list = (nodes[id] as Rec)[phase];
      if (!Array.isArray(list)) continue;
      list.forEach((hook, i) => {
        if (isObject(hook)) {
          checkBlockDefinition(errors, id, pointer(pointer(pointer("/nodes", id), phase), i), hook, catalogue);
        }
      });
    }
  });
  rules.forEach((rule, k) => {
    if (!isObject(rule)) return;
    for (const phase of ["pre", "post"] as const) {
      const hook = rule[phase];
      if (isObject(hook)) {
        checkBlockDefinition(errors, null, pointer(pointer("/hooks", k), phase), hook, catalogue);
      }
    }
  });

  const effectOf = (id: string): EffectClass | null => nodeMeta(flow, id, catalogue)?.effect ?? null;
  const all: Placed[] = [];
  const post: Placed[] = [];
  for (const id of ids) {
    if (!isObject(nodes[id])) continue;
    const placements = hookPlacements(flow, id, catalogue);
    for (const phase of ["pre", "post"] as const) {
      for (const p of placements[phase]) {
        const placed: Placed = {
          node: id,
          phase,
          hook: p.hook as unknown as Rec,
          path: hookPath(root, id, p),
        };
        all.push(placed);
        if (phase === "post") post.push(placed);
      }
    }
  }

  for (const p of post) {
    const kind = String((nodes[p.node] as Rec).kind);
    const routes = Array.isArray(p.hook.routes) ? p.hook.routes : [];
    routes.forEach((target, j) => {
      if (typeof target !== "string") return;
      const at = pointer(pointer(p.path, "routes"), j);
      if (!Object.hasOwn(nodes, target) || target === p.node) {
        errors.push(issue("H_ROUTE_TARGET", p.node, at, `route ${target} is not another node of the flow`));
      } else {
        const effect = effectOf(target);
        if (effect === null || effect === "write" || effect === "send" || effect === "pay") {
          errors.push(issue("H_ROUTE_EFFECT", p.node, at, `route ${target} leads into an effect node`));
        }
      }
    });
    if (kind.startsWith("human.") && routes.length > 0) {
      errors.push(issue("H_ROUTE_HUMAN", p.node, pointer(p.path, "routes"), "a human node takes no hook routes"));
    }
    if (p.hook.max_retries === undefined) continue;
    const maxAt = pointer(p.path, "max_retries");
    if (kind.startsWith("human.") || ["delegate", "switch", "wait", "end"].includes(kind)) {
      errors.push(issue("H_RETRY_SCOPE", p.node, maxAt, `a ${kind} node cannot be retried`));
      continue;
    }
    const scope: (EffectClass | null)[] = [effectOf(p.node)];
    for (const placement of hookPlacements(flow, p.node, catalogue).post) {
      if ((placement.hook as unknown as Rec).kind === "block") {
        const def = safeEffectOfBlock(placement.hook as unknown as Rec, catalogue);
        scope.push(def);
      }
    }
    const flagged = p.hook.allow_effect_retry === true;
    const flagAt = p.hook.allow_effect_retry !== undefined ? pointer(p.path, "allow_effect_retry") : maxAt;
    if (scope.includes("pay")) {
      errors.push(issue("H_RETRY_SCOPE", p.node, flagAt, "a pay effect is never retried"));
    } else if (!flagged && scope.some((e) => e === null || e === "write" || e === "send")) {
      errors.push(issue("H_RETRY_SCOPE", p.node, maxAt, "retrying an effect needs allow_effect_retry: true"));
    }
  }

  // H_CYCLE and H_DOMINANCE
  const start = root.start;
  if (typeof start === "string" && Object.hasOwn(nodes, start)) {
    const succ = augmentedSuccessors(flow, catalogue);
    for (const cycle of findCycles(start, succ)) {
      errors.push(
        issue("H_CYCLE", null, "/nodes", `the augmented graph has a cycle: ${[...cycle, cycle[0]].join(" -> ")}`),
      );
    }
    let dom: ReturnType<typeof dominators> | undefined;
    const reported = new Set<string>();
    const consume = (consumer: string, base: string, value: unknown, selfOk: boolean): void => {
      walkStrings(value, base, (text, at) => {
        for (const seg of scanTemplate(text)) {
          if (seg.type !== "ref" || seg.ref === undefined || seg.ref.root !== "node") continue;
          dom ??= dominators(start, succ);
          if (!dom.reachable.has(consumer)) continue;
          const p = seg.ref.id;
          let ok: boolean;
          if (!Object.hasOwn(nodes, p)) ok = false;
          else if (p === consumer) ok = selfOk;
          else {
            ok = false;
            let x = consumer;
            while (dom.idom.has(x)) {
              const up = dom.idom.get(x) as string;
              if (up === p) {
                ok = true;
                break;
              }
              if (up === x) break;
              x = up;
            }
          }
          const key = `${consumer} ${at} ${p}`;
          if (ok || reported.has(key)) continue;
          reported.add(key);
          errors.push(issue("H_DOMINANCE", consumer, at, `${consumer} reads nodes.${p} which does not always run before it`));
        }
      });
    };
    for (const id of ids) {
      for (const f of valueFields(nodes[id])) {
        consume(id, pointer(pointer("/nodes", id), f.field), f.value, false);
      }
    }
    for (const p of all) {
      for (const f of hookValueFields(p.hook)) {
        consume(p.node, pointer(p.path, f.field), f.value, p.phase === "post");
      }
    }
  }

  // W_NO_MATCH
  rules.forEach((rule, k) => {
    if (!isObject(rule)) return;
    const matched = ids.some((id) => {
      const meta = nodeMeta(flow, id, catalogue);
      if (meta === null || (HOOKLESS_KINDS as readonly string[]).includes(meta.kind)) return false;
      return selectorMatches(rule.match as HookSelector | undefined, meta);
    });
    if (!matched) warnings.push(issue("W_NO_MATCH", null, pointer("/hooks", k), "the rule matches no node"));
  });

  return { errors, warnings };
}

function safeEffectOfBlock(hook: Rec, catalogue: Catalogue): EffectClass | null {
  const fake = { kind: "block", uses: hook.uses };
  return nodeMeta({ nodes: { x: fake } } as unknown as Flow, "x", catalogue)?.effect ?? null;
}

export function checkHooks(
  doc: unknown,
  catalogue: Catalogue,
): { errors: Issue[]; warnings: Issue[] } {
  const root: Rec = isObject(doc) ? doc : {};
  const scan: Scan = { nodes: isObject(root.nodes) ? root.nodes : {}, issues: [] };
  checkRules(scan, root.hooks);
  checkNodes(scan);
  if (scan.issues.length > 0) return { errors: sortIssues(scan.issues), warnings: [] };
  const found = checkSemantics({ ...root, nodes: scan.nodes }, catalogue);
  return { errors: sortIssues(found.errors), warnings: sortIssues(found.warnings) };
}
