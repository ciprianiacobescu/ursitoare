import type { BlockDef, Catalogue, Flow, Ref } from "../format/index.ts";
import {
  escapePointer,
  refToString,
  scanTemplate,
  valueFields,
  walkStrings,
} from "../format/index.ts";
import type { Taint } from "./labels.ts";
import { NO_TAINT, joinTaint, relabelExtract } from "./labels.ts";
import { describeTool } from "./tools.ts";

export interface NodeTaint {
  input: Taint;
  output: Taint;
  fields: { [field: string]: Taint };
}

export interface TaintEdge {
  to: string;
  path: string;
  ref: string;
  from: string | null;
  taint: Taint;
  resolved: boolean;
  hook: string | null;
}

export interface TaintAnalysis {
  nodes: { [id: string]: NodeTaint };
  edges: TaintEdge[];
}

const UNTRUSTED: Taint = Object.freeze(["untrusted"] as const);

interface Occurrence {
  path: string;
  field: string;
  ref: Ref | undefined;
  raw: string;
  target: string | null;
}

interface State {
  input: Taint;
  output: Taint;
  fields: Map<string, Taint>;
}

interface KindOutput {
  output: Taint;
  fields: Map<string, Taint>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nodeMap(flow: Flow): Map<string, unknown> {
  const map = new Map<string, unknown>();
  const raw: unknown = flow.nodes;
  if (!isRecord(raw)) return map;
  for (const [id, node] of Object.entries(raw)) map.set(id, node);
  return map;
}

function kindOf(node: unknown): string | undefined {
  return isRecord(node) && typeof node.kind === "string" ? node.kind : undefined;
}

function occurrences(id: string, node: unknown): Occurrence[] {
  const out: Occurrence[] = [];
  for (const field of valueFields(node)) {
    walkStrings(
      field.value,
      `/nodes/${escapePointer(id)}/${escapePointer(field.field)}`,
      (text, path) => {
        for (const seg of scanTemplate(text)) {
          if (seg.type !== "ref") continue;
          const ref = seg.ref;
          out.push({
            path,
            field: field.field,
            ref,
            raw: seg.raw,
            target: ref !== undefined && ref.root === "node" ? ref.id : null,
          });
        }
      },
    );
  }
  return out;
}

function referenceTaint(
  occurrence: Occurrence,
  states: Map<string, State>,
  nodes: Map<string, unknown>,
  itemTaint: Taint | undefined,
): Taint {
  const ref = occurrence.ref;
  if (ref === undefined) return NO_TAINT;
  if (ref.root === "item") {
    if (occurrence.field === "with" && itemTaint !== undefined) return itemTaint;
    return NO_TAINT;
  }
  if (ref.root !== "node") return NO_TAINT;
  const state = states.get(ref.id);
  if (state === undefined) return NO_TAINT;
  if (ref.field === "outcome") {
    const kind = kindOf(nodes.get(ref.id));
    return kind === "llm.decide" || kind === "human.approval" ? NO_TAINT : state.output;
  }
  const first = ref.path[0];
  if (first !== undefined) {
    const field = state.fields.get(first);
    if (field !== undefined) return field;
  }
  return state.output;
}

function isUntrustedTool(def: BlockDef | undefined): boolean {
  return (
    def === undefined ||
    def.untrusted_result === true ||
    (def.untrusted_fields !== undefined && def.untrusted_fields.length > 0)
  );
}

function contextTainted(node: unknown, kind: string | undefined): boolean {
  if (
    kind !== "llm.extract" &&
    kind !== "llm.generate" &&
    kind !== "llm.decide" &&
    kind !== "agent"
  ) {
    return false;
  }
  if (!isRecord(node) || !Array.isArray(node.context)) return false;
  for (const entry of node.context) {
    const tier = isRecord(entry) ? entry.tier : undefined;
    if (tier !== "approved") return true;
  }
  return false;
}

function itemTaintOf(
  found: Occurrence[],
  states: Map<string, State>,
  nodes: Map<string, unknown>,
): Taint {
  let taint: Taint = NO_TAINT;
  for (const occurrence of found) {
    if (occurrence.field !== "items") continue;
    taint = joinTaint(taint, referenceTaint(occurrence, states, nodes, undefined));
  }
  return taint;
}

function outputFor(
  kind: string | undefined,
  node: unknown,
  input: Taint,
  catalogue: Catalogue,
): KindOutput {
  switch (kind) {
    case "block": {
      const ref = isRecord(node) ? node.uses : undefined;
      const def = describeTool(catalogue, ref);
      if (def === undefined || def.untrusted_result === true) {
        return { output: joinTaint(input, UNTRUSTED), fields: new Map() };
      }
      const fields = new Map<string, Taint>();
      for (const entry of def.untrusted_fields ?? []) {
        if (typeof entry !== "string") continue;
        const name = entry.split(".")[0];
        if (name === undefined || name === "") continue;
        fields.set(name, joinTaint(input, UNTRUSTED));
      }
      return { output: input, fields };
    }
    case "delegate": {
      const target = isRecord(node) ? node.target : undefined;
      const workflow = isRecord(node) ? node.workflow : undefined;
      const def =
        typeof target === "string" && typeof workflow === "string"
          ? catalogue.delegateTarget(target, workflow)
          : undefined;
      const trusted = def !== undefined && def.untrusted_result === false;
      return { output: trusted ? input : joinTaint(input, UNTRUSTED), fields: new Map() };
    }
    case "llm.extract":
      return { output: relabelExtract(input), fields: new Map() };
    case "llm.decide":
      return { output: input, fields: new Map([["outcome", NO_TAINT]]) };
    case "agent": {
      const tools = isRecord(node) ? node.tools : undefined;
      let untrusted = !Array.isArray(tools);
      if (Array.isArray(tools)) {
        for (const tool of tools) {
          if (isUntrustedTool(describeTool(catalogue, tool))) {
            untrusted = true;
            break;
          }
        }
      }
      return {
        output: untrusted ? joinTaint(input, UNTRUSTED) : input,
        fields: new Map(),
      };
    }
    case "foreach": {
      const uses = isRecord(node) ? node.uses : undefined;
      const def = describeTool(catalogue, uses);
      const trusted = typeof uses === "string" && !isUntrustedTool(def);
      return {
        output: trusted ? input : joinTaint(input, UNTRUSTED),
        fields: new Map(),
      };
    }
    case "subflow":
      return { output: joinTaint(input, UNTRUSTED), fields: new Map() };
    case "code":
    case "llm.generate":
    case "human.approval":
    case "human.form":
    case "switch":
    case "wait":
    case "end":
      return { output: input, fields: new Map() };
    default:
      return { output: NO_TAINT, fields: new Map() };
  }
}

function evaluate(
  found: Occurrence[],
  node: unknown,
  states: Map<string, State>,
  nodes: Map<string, unknown>,
  catalogue: Catalogue,
): State {
  const kind = kindOf(node);
  const itemTaint = kind === "foreach" ? itemTaintOf(found, states, nodes) : undefined;
  let input: Taint = contextTainted(node, kind) ? UNTRUSTED : NO_TAINT;
  for (const occurrence of found) {
    input = joinTaint(input, referenceTaint(occurrence, states, nodes, itemTaint));
  }
  const result = outputFor(kind, node, input, catalogue);
  return { input, output: result.output, fields: result.fields };
}

function sameTaint(a: Taint, b: Taint): boolean {
  return a.length === b.length && a.every((label, index) => label === b[index]);
}

function joinState(old: State, next: State): State {
  const fields = new Map(old.fields);
  for (const [key, value] of next.fields) {
    fields.set(key, joinTaint(fields.get(key) ?? NO_TAINT, value));
  }
  return {
    input: joinTaint(old.input, next.input),
    output: joinTaint(old.output, next.output),
    fields,
  };
}

function sameState(a: State, b: State): boolean {
  if (!sameTaint(a.input, b.input) || !sameTaint(a.output, b.output)) return false;
  if (a.fields.size !== b.fields.size) return false;
  for (const [key, value] of a.fields) {
    const other = b.fields.get(key);
    if (other === undefined || !sameTaint(value, other)) return false;
  }
  return true;
}

export function analyzeTaint(flow: Flow, catalogue: Catalogue): TaintAnalysis {
  const nodes = nodeMap(flow);
  const ids = [...nodes.keys()].sort();
  const parsed = new Map<string, Occurrence[]>();
  for (const id of ids) parsed.set(id, occurrences(id, nodes.get(id)));

  const consumers = new Map<string, Set<string>>();
  for (const id of ids) {
    for (const occurrence of parsed.get(id) ?? []) {
      if (occurrence.target === null || !nodes.has(occurrence.target)) continue;
      const set = consumers.get(occurrence.target) ?? new Set<string>();
      set.add(id);
      consumers.set(occurrence.target, set);
    }
  }

  const states = new Map<string, State>();
  for (const id of ids) {
    states.set(id, { input: NO_TAINT, output: NO_TAINT, fields: new Map() });
  }

  const queued = new Set<string>(ids);
  const queue: string[] = [...ids];
  while (queue.length > 0) {
    const id = queue.shift();
    if (id === undefined) break;
    queued.delete(id);
    const current = states.get(id);
    if (current === undefined) continue;
    const next = joinState(
      current,
      evaluate(parsed.get(id) ?? [], nodes.get(id), states, nodes, catalogue),
    );
    if (sameState(current, next)) continue;
    states.set(id, next);
    const set = consumers.get(id);
    if (set === undefined) continue;
    for (const consumer of [...set].sort()) {
      if (queued.has(consumer)) continue;
      queued.add(consumer);
      queue.push(consumer);
    }
  }

  const nodeEntries: Array<[string, NodeTaint]> = [];
  for (const id of ids) {
    const state = states.get(id);
    if (state === undefined) continue;
    const fields: { [field: string]: Taint } = {};
    for (const key of [...state.fields.keys()].sort()) {
      const value = state.fields.get(key);
      if (value !== undefined) fields[key] = value;
    }
    nodeEntries.push([id, { input: state.input, output: state.output, fields }]);
  }

  const edges: TaintEdge[] = [];
  for (const id of ids) {
    const found = parsed.get(id) ?? [];
    const itemTaint =
      kindOf(nodes.get(id)) === "foreach" ? itemTaintOf(found, states, nodes) : undefined;
    for (const occurrence of found) {
      const ref = occurrence.ref;
      const from =
        ref !== undefined && ref.root === "node" && nodes.has(ref.id) ? ref.id : null;
      edges.push({
        to: id,
        path: occurrence.path,
        ref: ref !== undefined ? refToString(ref) : occurrence.raw,
        from,
        taint: referenceTaint(occurrence, states, nodes, itemTaint),
        resolved: true,
        hook: null,
      });
    }
  }

  return {
    nodes: Object.fromEntries(nodeEntries) as { [id: string]: NodeTaint },
    edges,
  };
}
