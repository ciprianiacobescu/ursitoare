/**
 * L3: data flow (design D5). Reference resolution, dominance, JSON-type compatibility, switch keys
 * and item scoping. Taint decisions are not taken here: they come from `../taint/` (design D6).
 */

import { escapePointer, isSingleRef, parseVersionedRef, refToString, scanTemplate } from "../format/index.ts";
import type { BlockDef, Catalogue, FlowSignature, Ref } from "../format/index.ts";
import { availability, buildEdges, topoOrder } from "./graph.ts";
import type { Edge } from "./graph.ts";
import { admits, compat, deref, enumValues, fmtTypes, isObj, jsType, own, resolvePath, typeSet } from "./jsonschema.ts";
import type { S } from "./jsonschema.ts";
import type { Sink } from "./sink.ts";

const nodePath = (id: string, rest = ""): string => `/nodes/${escapePointer(id)}${rest}`;

interface Resolved {
  schema: S;
  root: S;
  optional: boolean;
  ref: Ref;
  producer: string | null;
}

interface OutInfo {
  schema: S;
  root: S;
}

interface ForeachCtx {
  itemSchema: S;
  itemRoot: S;
  /** items could not be resolved to an array; item.* errors would only be noise */
  unknown?: boolean;
}

function flowSignature(catalogue: Catalogue, ref: string): FlowSignature | undefined {
  const parsed = parseVersionedRef(ref);
  if (parsed === undefined) return undefined;
  return catalogue.flow(parsed.name, parsed.major);
}

function blockOf(catalogue: Catalogue, ref: unknown): BlockDef | undefined {
  return typeof ref === "string" ? catalogue.block(ref) : undefined;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Run L3 on a document that passed L1 and L2. */
export function checkL3(doc: unknown, catalogue: Catalogue, s: Sink): void {
  if (!isObj(doc) || !isObj(doc.nodes)) return;
  const nodes = doc.nodes;
  const ids = Object.keys(nodes).sort();
  const start = typeof doc.start === "string" ? doc.start : "";
  const edges = buildEdges(nodes);
  const order = topoOrder(ids, edges);
  const avail = availability(start, order, edges);
  const inputsSchema = doc.inputs;

  const out = new Map<string, OutInfo | null>();
  const perItem = (node: Record<string, unknown>): OutInfo | null => {
    const block = blockOf(catalogue, node.uses);
    if (block !== undefined) return { schema: block.output, root: block.output };
    const subflow = node.subflow;
    if (typeof subflow === "string") {
      const flow = flowSignature(catalogue, subflow);
      if (flow !== undefined) return { schema: flow.output, root: flow.output };
    }
    return null;
  };

  for (const id of ids) {
    const node = nodes[id];
    if (!isObj(node)) {
      out.set(id, null);
      continue;
    }
    let info: OutInfo | null = null;
    switch (node.kind) {
      case "block": {
        const block = blockOf(catalogue, node.uses);
        if (block !== undefined) info = { schema: block.output, root: block.output };
        break;
      }
      case "code":
      case "llm.extract":
      case "llm.generate":
      case "agent":
        info = { schema: node.output_schema, root: node.output_schema };
        break;
      case "human.form":
        info = { schema: node.form_schema, root: node.form_schema };
        break;
      case "llm.decide": {
        const schema = {
          type: "object",
          properties: { outcome: { type: "string", enum: stringList(node.outcomes) }, rationale: { type: "string" } },
          required: ["outcome", "rationale"],
        };
        info = { schema, root: schema };
        break;
      }
      case "human.approval": {
        const schema = {
          type: "object",
          properties: {
            decision: { type: "string", enum: ["approved", "rejected"] },
            approver: { type: "string" },
            comment: { type: "string" },
          },
          required: ["decision", "approver", "comment"],
        };
        info = { schema, root: schema };
        break;
      }
      case "foreach": {
        const item = perItem(node);
        const schema: Record<string, unknown> = {
          type: "object",
          properties: {
            results: { type: "array", ...(item !== null ? { items: item.schema } : {}) },
          },
          required: ["results"],
        };
        if (item !== null && isObj(item.root) && item.root.$defs !== undefined) schema.$defs = item.root.$defs;
        info = { schema, root: schema };
        break;
      }
      case "subflow": {
        const ref = node.flow;
        const flow = typeof ref === "string" ? flowSignature(catalogue, ref) : undefined;
        if (flow !== undefined) info = { schema: flow.output, root: flow.output };
        break;
      }
      case "delegate": {
        const schema = {
          type: "object",
          properties: {
            correlation_id: { type: "string" },
            result: { type: "object" },
          },
          required: ["correlation_id", "result"],
        };
        info = { schema, root: schema };
        break;
      }
      default:
        info = null; // switch, wait, end
    }
    out.set(id, info);
  }

  const adjacency = new Map<string, Edge[]>();
  for (const edge of edges) {
    const list = adjacency.get(edge.from);
    if (list === undefined) adjacency.set(edge.from, [edge]);
    else list.push(edge);
  }

  const witness = (producer: string, consumer: string): string[] | null => {
    const previous = new Map<string, string | null>([[start, null]]);
    const queue = [start];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      if (current === consumer) {
        const path: string[] = [];
        for (let at: string | null = current; at !== null; at = previous.get(at) ?? null) {
          path.unshift(at);
        }
        return path;
      }
      for (const edge of adjacency.get(current) ?? []) {
        if (edge.from === producer && edge.producesOutput) continue;
        if (!previous.has(edge.to)) {
          previous.set(edge.to, current);
          queue.push(edge.to);
        }
      }
    }
    return null;
  };

  for (const id of order) {
    const node = nodes[id];
    if (!isObj(node)) continue;
    const available = avail.get(id) ?? new Set<string>();
    let foreachCtx: ForeachCtx | null = null;

    const resolve = (ref: Ref, path: string): Resolved | null => {
      const refStr = refToString(ref);
      switch (ref.root) {
        case "inputs": {
          const resolved = resolvePath(inputsSchema, inputsSchema, ref.path);
          if (!resolved.ok) {
            s.err(
              "L3",
              "L3_REF_UNKNOWN_PATH",
              id,
              path,
              `reference "${refStr}" does not resolve: ${resolved.reason.replace("the root", "the flow inputs")}`,
            );
            return null;
          }
          return { schema: resolved.schema, root: inputsSchema, optional: resolved.optional, ref, producer: null };
        }
        case "item": {
          if (foreachCtx === null) {
            s.err("L3", "L3_ITEM_OUTSIDE_FOREACH", id, path, `"${refStr}" can only be used in the "with" of a foreach node`);
            return null;
          }
          if (foreachCtx.unknown === true) return null;
          if (ref.path.length === 0) {
            return { schema: foreachCtx.itemSchema, root: foreachCtx.itemRoot, optional: false, ref, producer: null };
          }
          if (foreachCtx.itemSchema === undefined) {
            s.err(
              "L3",
              "L3_REF_UNKNOWN_PATH",
              id,
              path,
              `reference "${refStr}" does not resolve: the element type of the array is not declared`,
            );
            return null;
          }
          const resolved = resolvePath(foreachCtx.itemSchema, foreachCtx.itemRoot, ref.path);
          if (!resolved.ok) {
            s.err(
              "L3",
              "L3_REF_UNKNOWN_PATH",
              id,
              path,
              `reference "${refStr}" does not resolve: ${resolved.reason.replace("the root", "each item")}`,
            );
            return null;
          }
          return {
            schema: resolved.schema,
            root: foreachCtx.itemRoot,
            optional: resolved.optional,
            ref,
            producer: null,
          };
        }
        case "node": {
          const target = own(nodes, ref.id);
          if (!isObj(target)) {
            s.err("L3", "L3_REF_UNKNOWN_NODE", id, path, `reference "${refStr}" names node "${ref.id}", which does not exist`);
            return null;
          }
          if (ref.field === "outcome" && target.kind !== "llm.decide") {
            s.err(
              "L3",
              "L3_REF_OUTCOME_NOT_DECIDE",
              id,
              path,
              `"${refStr}": .outcome exists only on llm.decide nodes, but "${ref.id}" is ${String(target.kind)}`,
            );
            return null;
          }
          const info = out.get(ref.id);
          if (info === null || info === undefined) {
            s.err(
              "L3",
              "L3_REF_NO_OUTPUT",
              id,
              path,
              `"${refStr}": ${String(target.kind)} node "${ref.id}" produces no output`,
            );
            return null;
          }
          if (!available.has(ref.id)) {
            const onPath = witness(ref.id, id);
            const why =
              ref.id === id
                ? "a node cannot read its own output"
                : onPath !== null
                  ? `on the path ${onPath.join(" -> ")}, "${ref.id}" has not produced output (it is not on that path, or the path leaves it through a timeout branch, which carries no output)`
                  : `"${ref.id}" is not guaranteed to run before "${id}"`;
            s.err(
              "L3",
              "L3_REF_NOT_DOMINATING",
              id,
              path,
              `"${refStr}": ${why}. A producer must run on every path from start to its consumer`,
            );
            return null;
          }
          const segments = ref.field === "outcome" ? ["outcome"] : ref.path;
          const resolved = resolvePath(info.schema, info.root, segments);
          if (!resolved.ok) {
            s.err(
              "L3",
              "L3_REF_UNKNOWN_PATH",
              id,
              path,
              `reference "${refStr}" does not resolve: ${resolved.reason.replace("the root", `the output of "${ref.id}"`)}`,
            );
            return null;
          }
          return {
            schema: resolved.schema,
            root: info.root,
            optional: resolved.optional,
            ref,
            producer: ref.id,
          };
        }
      }
      return null;
    };

    const literalCheck = (value: unknown, consumerSchema: S, consumerRoot: S, path: string): void => {
      const type = jsType(value);
      const types = typeSet(consumerSchema, consumerRoot);
      if (!admits(types, type)) {
        s.err(
          "L3",
          "L3_TYPE_MISMATCH",
          id,
          path,
          `literal ${JSON.stringify(value)} is ${type} but ${fmtTypes(types)} is expected`,
        );
        return;
      }
      const values = enumValues(consumerSchema, consumerRoot);
      if (values !== null && !values.some((allowed) => JSON.stringify(allowed) === JSON.stringify(value))) {
        s.err(
          "L3",
          "L3_ENUM_VIOLATION",
          id,
          path,
          `literal ${JSON.stringify(value)} is not one of ${values.map((entry) => JSON.stringify(entry)).join(", ")}`,
        );
      }
    };

    const checkValue = (value: unknown, consumerSchema: S, consumerRoot: S, path: string): void => {
      const consumerKnown = consumerSchema !== undefined;
      if (typeof value === "string") {
        const segments = scanTemplate(value);
        const refs = segments.filter((segment): segment is Extract<(typeof segments)[number], { type: "ref" }> => segment.type === "ref");
        if (refs.length === 0) {
          if (consumerKnown) literalCheck(value, consumerSchema, consumerRoot, path);
          return;
        }
        const results: Array<Resolved | null> = refs.map((entry) => (entry.ref !== undefined ? resolve(entry.ref, path) : null));
        for (const result of results) {
          if (result === null) continue;
          if (result.optional) {
            s.warn(
              "L3",
              "W_OPTIONAL_REFERENCE",
              id,
              path,
              `"${refToString(result.ref)}" is an optional field and may be absent at run time`,
            );
          }
        }
        if (isSingleRef(segments)) {
          const result = results[0];
          if (result !== undefined && result !== null && consumerKnown) {
            const compatibility = compat(result.schema, result.root, consumerSchema, consumerRoot);
            if (!compatibility.ok) {
              s.err("L3", compatibility.code, id, path, `"${refToString(result.ref)}": ${compatibility.reason}`);
            }
          }
        } else if (consumerKnown) {
          const types = typeSet(consumerSchema, consumerRoot);
          if (!admits(types, "string")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `a template string is always text but ${fmtTypes(types)} is expected`);
          }
        }
        return;
      }
      if (Array.isArray(value)) {
        if (consumerKnown) {
          const types = typeSet(consumerSchema, consumerRoot);
          if (!admits(types, "array")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `array literal where ${fmtTypes(types)} is expected`);
            value.forEach((entry, index) => checkValue(entry, undefined, undefined, `${path}/${index}`));
            return;
          }
        }
        const dereferenced = consumerKnown ? deref(consumerSchema, consumerRoot) : undefined;
        value.forEach((entry, index) =>
          checkValue(entry, isObj(dereferenced) ? dereferenced.items : undefined, consumerRoot, `${path}/${index}`),
        );
        return;
      }
      if (isObj(value)) {
        let dereferenced: S = undefined;
        if (consumerKnown) {
          const types = typeSet(consumerSchema, consumerRoot);
          if (!admits(types, "object")) {
            s.err("L3", "L3_TYPE_MISMATCH", id, path, `object literal where ${fmtTypes(types)} is expected`);
          } else {
            dereferenced = deref(consumerSchema, consumerRoot);
          }
        }
        if (isObj(dereferenced)) {
          for (const key of Array.isArray(dereferenced.required) ? dereferenced.required : []) {
            if (typeof key === "string" && !Object.hasOwn(value, key)) {
              s.err("L3", "L3_TYPE_MISMATCH", id, path, `object literal is missing required field "${key}"`);
            }
          }
        }
        for (const [key, entry] of Object.entries(value)) {
          let child: S = undefined;
          if (isObj(dereferenced)) {
            if (isObj(dereferenced.properties) && Object.hasOwn(dereferenced.properties, key)) {
              child = dereferenced.properties[key];
            } else if (isObj(dereferenced.additionalProperties)) {
              child = dereferenced.additionalProperties;
            } else if (isObj(dereferenced.properties) && dereferenced.additionalProperties === false) {
              s.err("L3", "L3_TYPE_MISMATCH", id, `${path}/${escapePointer(key)}`, `unexpected field "${key}" in object literal`);
            }
          }
          checkValue(entry, child, consumerRoot, `${path}/${escapePointer(key)}`);
        }
        return;
      }
      if (consumerKnown) literalCheck(value, consumerSchema, consumerRoot, path);
    };

    const checkMap = (map: unknown, fieldPath: string, schemaOf: (key: string) => S, root: S): void => {
      if (!isObj(map)) return;
      for (const key of Object.keys(map)) {
        checkValue(map[key], schemaOf(key), root, `${fieldPath}/${escapePointer(key)}`);
      }
    };

    const noSchema = (): S => undefined;
    const propertyOf = (schema: S): ((key: string) => S) => {
      return (key: string) => (isObj(schema) && isObj(schema.properties) ? own(schema.properties, key) : undefined);
    };

    switch (node.kind) {
      case "block": {
        const block = blockOf(catalogue, node.uses);
        if (block !== undefined) {
          checkMap(node.with, nodePath(id, "/with"), propertyOf(block.input), block.input);
        }
        break;
      }
      case "code":
      case "llm.extract":
      case "llm.generate":
      case "llm.decide":
        checkMap(node.input, nodePath(id, "/input"), noSchema, undefined);
        break;
      case "agent":
        checkMap(node.input, nodePath(id, "/input"), noSchema, undefined);
        break;
      case "switch": {
        const on = node.on;
        if (typeof on === "string") {
          const segments = scanTemplate(on);
          const first = segments[0];
          const resolved =
            first !== undefined && first.type === "ref" && first.ref !== undefined
              ? resolve(first.ref, nodePath(id, "/on"))
              : null;
          if (resolved !== null) {
            const types = typeSet(resolved.schema, resolved.root);
            if (types !== null && (types.has("object") || types.has("array"))) {
              s.err(
                "L3",
                "L3_SWITCH_ON_TYPE",
                id,
                nodePath(id, "/on"),
                `switch cannot branch on a value of type ${fmtTypes(types)}; use string, number, integer or boolean`,
              );
            } else {
              const values = enumValues(resolved.schema, resolved.root);
              const cases = isObj(node.cases) ? Object.keys(node.cases) : [];
              for (const key of cases.sort()) {
                const keyPath = nodePath(id, `/cases/${escapePointer(key)}`);
                if (values !== null) {
                  if (!values.map((entry) => String(entry)).includes(key)) {
                    s.err(
                      "L3",
                      "L3_SWITCH_KEY_INCOMPATIBLE",
                      id,
                      keyPath,
                      `case key "${key}" is not one of the possible values of ${refToString(resolved.ref)} (${values.map((entry) => JSON.stringify(entry)).join(", ")})`,
                    );
                  }
                  continue;
                }
                if (types === null) continue;
                const matches = [...types].some((type) => {
                  if (type === "string") return true;
                  if (type === "boolean") return key === "true" || key === "false";
                  if (type === "integer") return /^-?(0|[1-9][0-9]*)$/.test(key);
                  if (type === "number") return /^-?(0|[1-9][0-9]*)(\.[0-9]+)?$/.test(key);
                  return false;
                });
                if (!matches) {
                  s.err(
                    "L3",
                    "L3_SWITCH_KEY_INCOMPATIBLE",
                    id,
                    keyPath,
                    `case key "${key}" cannot match a value of type ${fmtTypes(types)}${types.has("boolean") ? ' (boolean cases are written "true" and "false")' : ""}`,
                  );
                }
              }
            }
            if (resolved.optional) {
              s.warn(
                "L3",
                "W_OPTIONAL_REFERENCE",
                id,
                nodePath(id, "/on"),
                `"${refToString(resolved.ref)}" is an optional field and may be absent at run time`,
              );
            }
          }
        }
        break;
      }
      case "human.approval":
        checkValue(node.summary, undefined, undefined, nodePath(id, "/summary"));
        break;
      case "human.form":
        break;
      case "foreach": {
        let context: ForeachCtx | null = null;
        const items = node.items;
        if (typeof items === "string") {
          const segments = scanTemplate(items);
          const first = segments[0];
          const resolved =
            first !== undefined && first.type === "ref" && first.ref !== undefined
              ? resolve(first.ref, nodePath(id, "/items"))
              : null;
          if (resolved !== null) {
            const types = typeSet(resolved.schema, resolved.root);
            if (types === null || types.size !== 1 || !types.has("array")) {
              s.err(
                "L3",
                "L3_TYPE_MISMATCH",
                id,
                nodePath(id, "/items"),
                `foreach items must be an array but "${refToString(resolved.ref)}" is ${fmtTypes(types)}`,
              );
            } else {
              const dereferenced = deref(resolved.schema, resolved.root);
              context = {
                itemSchema: isObj(dereferenced) ? dereferenced.items : undefined,
                itemRoot: resolved.root,
              };
            }
            if (resolved.optional) {
              s.warn(
                "L3",
                "W_OPTIONAL_REFERENCE",
                id,
                nodePath(id, "/items"),
                `"${refToString(resolved.ref)}" is an optional field and may be absent at run time`,
              );
            }
          }
        }
        foreachCtx = context ?? { itemSchema: undefined, itemRoot: undefined, unknown: true };
        if (node.uses !== undefined) {
          const block = blockOf(catalogue, node.uses);
          if (block !== undefined) {
            checkMap(node.with, nodePath(id, "/with"), propertyOf(block.input), block.input);
          }
        } else {
          const ref = node.subflow;
          const flow = typeof ref === "string" ? flowSignature(catalogue, ref) : undefined;
          if (flow !== undefined) {
            checkMap(node.with, nodePath(id, "/with"), propertyOf(flow.input), flow.input);
          }
        }
        break;
      }
      case "subflow": {
        const ref = node.flow;
        const flow = typeof ref === "string" ? flowSignature(catalogue, ref) : undefined;
        if (flow !== undefined) {
          checkMap(node.with, nodePath(id, "/with"), propertyOf(flow.input), flow.input);
        }
        break;
      }
      case "delegate":
        checkMap(node.with, nodePath(id, "/with"), noSchema, undefined);
        break;
      case "end":
        checkMap(node.output, nodePath(id, "/output"), noSchema, undefined);
        break;
      default:
        break; // wait
    }
  }
}
