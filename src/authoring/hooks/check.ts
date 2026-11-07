import type { Catalogue } from "../format/index.ts";
import { NODE_KINDS, scanTemplate, walkStrings } from "../format/index.ts";
import type { Issue } from "../validate/index.ts";
import { HOOKLESS_KINDS } from "./model.ts";

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

export function checkHooks(
  doc: unknown,
  _catalogue: Catalogue,
): { errors: Issue[]; warnings: Issue[] } {
  const root: Rec = isObject(doc) ? doc : {};
  const scan: Scan = { nodes: isObject(root.nodes) ? root.nodes : {}, issues: [] };
  checkRules(scan, root.hooks);
  checkNodes(scan);
  const errors = scan.issues.sort(
    (a, b) => compare(a.path, b.path) || compare(a.code, b.code) || compare(a.message, b.message),
  );
  return { errors, warnings: [] };
}
