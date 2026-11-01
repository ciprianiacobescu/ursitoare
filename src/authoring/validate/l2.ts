/**
 * L2: registry and graph checks (design D4). Blocks, flows, roles, model profiles and delegate targets
 * come from the given `Catalogue`; successors, reachability, cycles and the end requirement come from
 * `./graph.ts`.
 */

import { escapePointer, parseVersionedRef, requiredSuccessorFields, successorFields } from "../format/index.ts";
import type { Catalogue, JsonSchema } from "../format/index.ts";
import type { BlockDef, FlowSignature, SuccessorField } from "../format/index.ts";
import { buildEdges, findCycles, reachableFrom } from "./graph.ts";
import { isObj } from "./jsonschema.ts";
import type { Sink } from "./sink.ts";

const nodePath = (id: string, rest = ""): string => `/nodes/${escapePointer(id)}${rest}`;

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function schemaProps(schema: JsonSchema | undefined): string[] {
  if (!isObj(schema) || !isObj(schema.properties)) return [];
  return Object.keys(schema.properties);
}

function schemaRequired(schema: JsonSchema | undefined): string[] {
  if (!isObj(schema) || !Array.isArray(schema.required)) return [];
  return schema.required.filter((item): item is string => typeof item === "string");
}

function checkWith(
  id: string,
  withPath: string,
  withValue: unknown,
  input: JsonSchema | undefined,
  what: string,
  s: Sink,
): void {
  if (!isObj(withValue) || !isObj(input)) return;
  const props = schemaProps(input);
  for (const key of Object.keys(withValue).sort()) {
    if (!props.includes(key)) {
      s.err(
        "L2",
        "L2_WITH_UNKNOWN_PARAM",
        id,
        `${withPath}/${escapePointer(key)}`,
        `"${key}" is not an input of ${what} (inputs: ${props.join(", ") || "none"})`,
      );
    }
  }
  for (const key of schemaRequired(input)) {
    if (!Object.hasOwn(withValue, key)) {
      s.err("L2", "L2_WITH_MISSING_REQUIRED", id, withPath, `${what} requires input "${key}"`);
    }
  }
}

/** Run L2 on a document that passed L1. */
export function checkL2(doc: unknown, catalogue: Catalogue, s: Sink): void {
  if (!isObj(doc) || !isObj(doc.nodes)) return;
  const nodes = doc.nodes;
  const ids = Object.keys(nodes).sort();
  const start = stringValue(doc.start);

  if (start !== undefined && !Object.hasOwn(nodes, start)) {
    s.err("L2", "L2_START_UNKNOWN", null, "/start", `start node "${start}" does not exist`);
  }

  const block = (id: string, path: string, ref: string): BlockDef | null => {
    const found = catalogue.block(ref);
    if (found === undefined) {
      s.err("L2", "L2_UNKNOWN_BLOCK", id, path, `block "${ref}" is not in the catalogue`);
      return null;
    }
    return found;
  };

  const flowSignature = (id: string, path: string, ref: string): FlowSignature | null => {
    const parsed = parseVersionedRef(ref);
    const found = parsed === undefined ? undefined : catalogue.flow(parsed.name, parsed.major);
    if (found === undefined) {
      s.err("L2", "L2_UNKNOWN_FLOW", id, path, `flow "${ref}" is not in the flows registry`);
      return null;
    }
    return found;
  };

  const profile = (id: string, node: Record<string, unknown>): void => {
    const ref = node.model_profile;
    if (ref === undefined) return;
    if (typeof ref !== "string" || catalogue.modelProfile(ref) === undefined) {
      s.err("L2", "L2_UNKNOWN_MODEL_PROFILE", id, nodePath(id, "/model_profile"), `model profile "${String(ref)}" does not exist`);
    }
  };

  const role = (id: string, node: Record<string, unknown>): void => {
    const name = node.assignee_role;
    if (typeof name !== "string" || catalogue.role(name) === undefined) {
      s.err("L2", "L2_UNKNOWN_ROLE", id, nodePath(id, "/assignee_role"), `role "${String(name)}" does not exist`);
    }
  };

  const delegate = (id: string, node: Record<string, unknown>): void => {
    const target = stringValue(node.target);
    const workflow = stringValue(node.workflow);
    if (target === undefined || workflow === undefined) return;
    if (catalogue.delegateTarget(target, workflow) !== undefined) return;
    const workflows = catalogue.delegateWorkflows?.(target);
    if (workflows !== undefined) {
      s.err("L2", "L2_UNKNOWN_DELEGATE_WORKFLOW", id, nodePath(id, "/workflow"), `workflow "${workflow}" is not offered by ${target}`);
    } else {
      s.err("L2", "L2_UNKNOWN_DELEGATE_TARGET", id, nodePath(id, "/target"), `delegate target "${target}" does not exist`);
    }
  };

  for (const id of ids) {
    const node = nodes[id];
    if (!isObj(node)) continue;
    switch (node.kind) {
      case "block": {
        const uses = stringValue(node.uses);
        const found = uses === undefined ? null : block(id, nodePath(id, "/uses"), uses);
        if (found !== null) checkWith(id, nodePath(id, "/with"), node.with, found.input, `block ${String(uses)}`, s);
        break;
      }
      case "llm.extract":
      case "llm.generate":
        profile(id, node);
        break;
      case "llm.decide": {
        profile(id, node);
        const outcomes = stringList(node.outcomes);
        const cases = isObj(node.cases) ? Object.keys(node.cases) : [];
        for (const outcome of outcomes) {
          if (!cases.includes(outcome)) {
            s.err("L2", "L2_DECIDE_CASE_MISSING", id, nodePath(id, "/cases"), `outcome "${outcome}" has no entry in cases`);
          }
        }
        for (const key of [...cases].sort()) {
          if (!outcomes.includes(key)) {
            s.err("L2", "L2_DECIDE_CASE_EXTRA", id, nodePath(id, `/cases/${escapePointer(key)}`), `case "${key}" is not one of the outcomes (${outcomes.join(", ")})`);
          }
        }
        break;
      }
      case "agent": {
        profile(id, node);
        stringList(node.tools).forEach((tool, index) => block(id, nodePath(id, `/tools/${index}`), tool));
        break;
      }
      case "human.approval":
      case "human.form":
        role(id, node);
        break;
      case "foreach": {
        if (node.uses !== undefined) {
          const uses = stringValue(node.uses);
          const found = uses === undefined ? null : block(id, nodePath(id, "/uses"), uses);
          if (found !== null) checkWith(id, nodePath(id, "/with"), node.with, found.input, `block ${String(uses)}`, s);
        } else if (node.subflow !== undefined) {
          const ref = stringValue(node.subflow);
          const found = ref === undefined ? null : flowSignature(id, nodePath(id, "/subflow"), ref);
          if (found !== null) checkWith(id, nodePath(id, "/with"), node.with, found.input, `flow ${String(ref)}`, s);
        }
        break;
      }
      case "subflow": {
        const ref = stringValue(node.flow);
        const found = ref === undefined ? null : flowSignature(id, nodePath(id, "/flow"), ref);
        if (found !== null) checkWith(id, nodePath(id, "/with"), node.with, found.input, `flow ${String(ref)}`, s);
        break;
      }
      case "delegate":
        delegate(id, node);
        break;
      default:
        break;
    }
  }

  for (const id of ids) {
    const node = nodes[id];
    if (!isObj(node) || typeof node.kind !== "string") continue;
    for (const field of requiredSuccessors(node.kind)) {
      if (node[field] === undefined) {
        s.err("L2", "L2_MISSING_SUCCESSOR", id, nodePath(id, `/${field}`), `${node.kind} node "${id}" has no "${field}" successor`);
      }
    }
    for (const field of successorFieldsOf(node)) {
      if (typeof field.id === "string" && !Object.hasOwn(nodes, field.id)) {
        s.err("L2", "L2_UNKNOWN_SUCCESSOR", id, nodePath(id, field.path), `successor "${field.id}" does not exist`);
      }
    }
  }

  const edges = buildEdges(nodes);
  if (start !== undefined && Object.hasOwn(nodes, start)) {
    const reachable = reachableFrom(start, edges);
    for (const id of ids) {
      if (!reachable.has(id)) {
        s.err("L2", "L2_UNREACHABLE_NODE", id, nodePath(id), `node "${id}" cannot be reached from "${start}"`);
      }
    }
  }
  for (const cycle of findCycles(ids, edges)) {
    const first = cycle[0] as string;
    s.err("L2", "L2_CYCLE", first, nodePath(first), `cycle ${[...cycle, first].join(" -> ")}; v0 flows must be acyclic`);
  }
  if (!ids.some((id) => isObj(nodes[id]) && nodes[id].kind === "end")) {
    s.err("L2", "L2_NO_END", null, "/nodes", 'flow has no "end" node, so no path can terminate');
  }
}

function requiredSuccessors(kind: string): string[] {
  return requiredSuccessorFields(kind);
}

function successorFieldsOf(node: Record<string, unknown>): SuccessorField[] {
  return successorFields(node);
}
