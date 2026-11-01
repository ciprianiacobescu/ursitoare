import type { Catalogue, Flow, Ref } from "../format/index.ts";
import {
  escapePointer,
  hookValueFields,
  scanTemplate,
  walkStrings,
} from "../format/index.ts";
import { describeTool } from "./tools.ts";

export type EffectClass = "read" | "write" | "send" | "pay" | "human" | "none";

export interface HookReference {
  path: string;
  field: string;
  ref: Ref | undefined;
  raw: string;
  target: string | null;
  hook: string;
  fromValue: boolean;
}

export interface AppliedHooks {
  all: HookReference[];
  code: HookReference[];
  hasCodeHook: boolean;
  malformed: boolean;
}

const SELECTOR_FIELDS = ["kind", "effect", "nodes", "tags"] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function kindOf(node: unknown): string | undefined {
  return isRecord(node) && typeof node.kind === "string" ? node.kind : undefined;
}

/** The effect class a flow-rule `effect` selector sees; unknown matches every selector. */
export function effectClass(node: unknown, catalogue: Catalogue): EffectClass | undefined {
  if (!isRecord(node)) return undefined;
  switch (node.kind) {
    case "block":
      return describeTool(catalogue, node.uses)?.effect;
    case "foreach": {
      const uses = node.uses;
      if (typeof uses !== "string") return undefined;
      return describeTool(catalogue, uses)?.effect;
    }
    case "delegate": {
      const target = node.target;
      const workflow = node.workflow;
      if (typeof target !== "string" || typeof workflow !== "string") return undefined;
      return catalogue.delegateTarget(target, workflow)?.effect;
    }
    case "llm.extract":
    case "llm.generate":
    case "llm.decide":
    case "code":
    case "switch":
    case "wait":
      return "read";
    case "human.approval":
    case "human.form":
      return "human";
    case "end":
      return "none";
    default:
      return undefined;
  }
}

function selectorMatches(
  match: Record<string, unknown>,
  id: string,
  node: unknown,
  catalogue: Catalogue,
): boolean {
  if (match.kind !== undefined && Array.isArray(match.kind)) {
    if (!match.kind.includes(kindOf(node))) return false;
  }
  if (match.effect !== undefined && Array.isArray(match.effect)) {
    const cls = effectClass(node, catalogue);
    if (cls !== undefined && !match.effect.includes(cls)) return false;
  }
  if (match.nodes !== undefined && Array.isArray(match.nodes)) {
    if (!match.nodes.includes(id)) return false;
  }
  if (match.tags !== undefined && Array.isArray(match.tags)) {
    const tags = isRecord(node) && Array.isArray(node.tags) ? node.tags : [];
    if (!match.tags.some((tag) => tags.includes(tag))) return false;
  }
  return true;
}

function ruleMatches(
  rule: Record<string, unknown>,
  id: string,
  node: unknown,
  catalogue: Catalogue,
): boolean {
  const match = rule.match;
  if (!isRecord(match)) return true;
  for (const field of SELECTOR_FIELDS) {
    const value = match[field];
    if (value !== undefined && !Array.isArray(value)) return true;
  }
  return selectorMatches(match, id, node, catalogue);
}

function targetOf(ref: Ref | undefined, wrapped: string): string | null {
  if (ref === undefined) return null;
  if (ref.root === "node") return ref.id;
  if (ref.root === "hook" && (ref.scope === "input" || ref.scope === "output")) return wrapped;
  return null;
}

function referencesOf(
  hook: unknown,
  base: string,
  id: string,
  hookId: string,
  all: HookReference[],
  code: HookReference[] | null,
): void {
  for (const field of hookValueFields(hook)) {
    walkStrings(field.value, `${base}/${escapePointer(field.field)}`, (text, path) => {
      for (const seg of scanTemplate(text)) {
        if (seg.type !== "ref") continue;
        const reference: HookReference = {
          path,
          field: field.field,
          ref: seg.ref,
          raw: seg.raw,
          target: targetOf(seg.ref, id),
          hook: hookId,
          fromValue: false,
        };
        all.push(reference);
        if (code !== null) code.push(reference);
      }
    });
  }
}

/** Which node hooks and flow rules apply to a node, and the references they hold. */
export function collectHooks(
  id: string,
  node: unknown,
  flow: Flow,
  catalogue: Catalogue,
): AppliedHooks {
  const all: HookReference[] = [];
  const code: HookReference[] = [];
  let hasCodeHook = false;
  let malformed = false;

  const addHook = (hook: unknown, base: string): void => {
    if (!isRecord(hook)) {
      malformed = true;
      return;
    }
    const hookId = typeof hook.id === "string" ? hook.id : "";
    if (hook.kind === "code") {
      hasCodeHook = true;
      referencesOf(hook, base, id, hookId, all, code);
    } else if (hook.kind === "block") {
      referencesOf(hook, base, id, hookId, all, null);
    } else {
      malformed = true;
    }
  };

  if (isRecord(node)) {
    for (const listName of ["pre", "post"] as const) {
      const list = node[listName];
      if (list === undefined) continue;
      if (!Array.isArray(list)) {
        malformed = true;
        continue;
      }
      list.forEach((entry, index) => {
        addHook(entry, `/nodes/${escapePointer(id)}/${listName}/${index}`);
      });
    }
  }

  const rules: unknown = flow.hooks;
  if (rules !== undefined) {
    if (!Array.isArray(rules)) {
      malformed = true;
    } else {
      rules.forEach((rule, index) => {
        if (!isRecord(rule)) {
          malformed = true;
          return;
        }
        if (!ruleMatches(rule, id, node, catalogue)) return;
        for (const slot of ["pre", "post"] as const) {
          const hook = rule[slot];
          if (hook === undefined) continue;
          addHook(hook, `/hooks/${index}/${slot}`);
        }
      });
    }
  }

  return { all, code, hasCodeHook, malformed };
}
