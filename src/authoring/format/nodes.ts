/**
 * Node and hook structure helpers (design Decision 8).
 *
 * Single source of truth for which fields of which node kinds hold values
 * (references allowed) and which hold successor ids. Ported from the seed's
 * `refs.ts` value-field table and `graph.ts` successor tables, without `any`.
 */

import { escapePointer } from "./refs.ts";

export interface ValueField {
  field: string;
  value: unknown;
}

export interface SuccessorField {
  path: string;
  id: unknown;
  producesOutput: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Fields of each node kind that hold values (references allowed). */
export function valueFields(node: unknown): ValueField[] {
  const out: ValueField[] = [];
  if (!isRecord(node)) return out;
  const add = (field: string): void => {
    const value = node[field];
    if (value !== undefined) out.push({ field, value });
  };
  switch (node.kind) {
    case "block":
    case "subflow":
    case "delegate":
      add("with");
      break;
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "llm.decide":
    case "agent":
      add("input");
      break;
    case "foreach":
      add("items");
      add("with");
      break;
    case "human.approval":
      add("summary");
      break;
    case "switch":
      add("on");
      break;
    case "end":
      add("output");
      break;
    default:
      break;
  }
  return out;
}

/** Fields of a hook that hold values: `input`, and a block hook's `with`. */
export function hookValueFields(hook: unknown): ValueField[] {
  const out: ValueField[] = [];
  if (!isRecord(hook)) return out;
  const add = (field: string): void => {
    const value = hook[field];
    if (value !== undefined) out.push({ field, value });
  };
  add("input");
  if (hook.kind === "block") add("with");
  return out;
}

/** Single source of truth for which fields of which kinds are successors. */
export function successorFields(node: unknown): SuccessorField[] {
  const out: SuccessorField[] = [];
  if (!isRecord(node)) return out;
  const add = (path: string, id: unknown, producesOutput = true): void => {
    if (id !== undefined) out.push({ path, id, producesOutput });
  };
  switch (node.kind) {
    case "block":
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "agent":
    case "foreach":
    case "subflow":
    case "wait":
      add("/next", node.next);
      break;
    case "human.form":
    case "delegate":
      add("/next", node.next);
      add("/on_timeout", node.on_timeout, false);
      break;
    case "llm.decide":
      if (isRecord(node.cases)) {
        for (const [key, value] of Object.entries(node.cases)) {
          add(`/cases/${escapePointer(key)}`, value);
        }
      }
      break;
    case "switch":
      if (isRecord(node.cases)) {
        for (const [key, value] of Object.entries(node.cases)) {
          add(`/cases/${escapePointer(key)}`, value);
        }
      }
      add("/default", node.default);
      break;
    case "human.approval":
      if (isRecord(node.cases)) {
        for (const [key, value] of Object.entries(node.cases)) {
          add(`/cases/${escapePointer(key)}`, value, key !== "timeout");
        }
      }
      break;
    default:
      break;
  }
  return out;
}

/** Kinds whose `next` (and for some, `on_timeout`) are mandatory successors. */
export function requiredSuccessorFields(kind: string): string[] {
  switch (kind) {
    case "block":
    case "code":
    case "llm.extract":
    case "llm.generate":
    case "agent":
    case "foreach":
    case "subflow":
    case "wait":
      return ["next"];
    case "human.form":
    case "delegate":
      return ["next", "on_timeout"];
    default:
      return [];
  }
}
