import { Ajv2020 } from "ajv/dist/2020.js";

import type { Catalogue, Flow, FlowNode, JsonSchema, JsonValue } from "../authoring/index.ts";
import { augmentedSuccessors, hookPlacements } from "../authoring/index.ts";
import { hookStepName } from "./hooks/names.ts";
import type { TestMocks } from "./mocks.ts";

export type DryRunFakes = TestMocks;

export interface FakeProblem {
  key: string;
  index: number | null;
  reason: "missing" | "not_an_effect" | "unknown_node" | "schema" | "shape";
  detail: string;
}

const SHAPE_DETAIL = "entry must be {output} or {error: {code, message}}";
const ERROR_CODE = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const MAX_PROBLEMS = 50;
const EFFECTS = new Set(["write", "send", "pay"]);

const ajv = new Ajv2020({ allErrors: false, strict: false, validateFormats: false });

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as unknown;
  return proto === Object.prototype || proto === null;
}

function isJsonValue(value: unknown, ancestors: Set<object>): value is JsonValue {
  if (value === null) {
    return true;
  }
  switch (typeof value) {
    case "boolean":
    case "string":
      return true;
    case "number":
      return Number.isFinite(value);
    case "object": {
      if (ancestors.has(value)) {
        return false;
      }
      ancestors.add(value);
      let ok: boolean;
      if (Array.isArray(value)) {
        ok = value.every((item) => isJsonValue(item, ancestors));
      } else if (isPlainObject(value)) {
        ok = Object.values(value).every((item) => isJsonValue(item, ancestors));
      } else {
        ok = false;
      }
      ancestors.delete(value);
      return ok;
    }
    default:
      return false;
  }
}

function isErrorEntry(value: Record<string, unknown>): boolean {
  const error = value["error"];
  if (!isPlainObject(error)) {
    return false;
  }
  if (
    Object.keys(error).length !== 2 ||
    !Object.hasOwn(error, "code") ||
    !Object.hasOwn(error, "message")
  ) {
    return false;
  }
  const code = error["code"];
  const message = error["message"];
  return (
    typeof code === "string" &&
    ERROR_CODE.test(code) &&
    typeof message === "string" &&
    message.length >= 1 &&
    message.length <= 500
  );
}

function schemaProblem(output: JsonValue, schema: JsonSchema): string | null {
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch {
    return "output schema cannot be compiled";
  }
  if (validate(output)) {
    return null;
  }
  const first = validate.errors?.[0];
  if (first === undefined) {
    return "/ invalid";
  }
  const path = first.instancePath === "" ? "/" : first.instancePath;
  return `${path} ${first.keyword}`;
}

function checkEntry(
  entry: unknown,
  schema: JsonSchema | undefined,
): { reason: "shape" | "schema"; detail: string } | null {
  if (!isPlainObject(entry)) {
    return { reason: "shape", detail: SHAPE_DETAIL };
  }
  const keys = Object.keys(entry);
  if (keys.length !== 1) {
    return { reason: "shape", detail: SHAPE_DETAIL };
  }
  if (keys[0] === "output") {
    const output = entry["output"];
    if (!isJsonValue(output, new Set())) {
      return { reason: "shape", detail: "output is not JSON" };
    }
    if (schema !== undefined) {
      const detail = schemaProblem(output, schema);
      if (detail !== null) {
        return { reason: "schema", detail };
      }
    }
    return null;
  }
  if (keys[0] === "error" && isErrorEntry(entry)) {
    return null;
  }
  return { reason: "shape", detail: SHAPE_DETAIL };
}

function reachableNodeIds(flow: Flow, catalogue: Catalogue): Set<string> {
  const seen = new Set<string>();
  if (!Object.hasOwn(flow.nodes, flow.start)) {
    return seen;
  }
  const successors = augmentedSuccessors(flow, catalogue);
  const queue: string[] = [flow.start];
  seen.add(flow.start);
  while (queue.length > 0) {
    const id = queue.shift() as string;
    for (const next of successors.get(id) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        queue.push(next);
      }
    }
  }
  return seen;
}

function compareProblems(a: FakeProblem, b: FakeProblem): number {
  if (a.key !== b.key) {
    return a.key < b.key ? -1 : 1;
  }
  if (a.index === b.index) {
    return 0;
  }
  if (a.index === null) {
    return -1;
  }
  if (b.index === null) {
    return 1;
  }
  return a.index - b.index;
}

function check(
  flow: Flow,
  catalogue: Catalogue,
  fakes: unknown,
): { fakes: DryRunFakes | null; problems: FakeProblem[] } {
  if (!isPlainObject(fakes)) {
    return {
      fakes: null,
      problems: [{ key: "", index: null, reason: "shape", detail: "fakes must be an object" }],
    };
  }

  const problems: FakeProblem[] = [];
  // key -> block ref of every block hook, and the node that carries it
  const hooks = new Map<string, { nodeId: string; uses: string }>();
  for (const nodeId of Object.keys(flow.nodes)) {
    const placed = hookPlacements(flow, nodeId, catalogue);
    for (const placement of [...placed.pre, ...placed.post]) {
      const hook = placement.hook as unknown as Record<string, unknown>;
      if (hook["kind"] === "block" && typeof hook["uses"] === "string") {
        hooks.set(hookStepName(nodeId, placement), { nodeId, uses: hook["uses"] });
      }
    }
  }

  for (const key of Object.keys(fakes)) {
    let uses: string | undefined;
    if (Object.hasOwn(flow.nodes, key)) {
      const node: FlowNode | undefined = flow.nodes[key];
      uses = node !== undefined && node.kind === "block" ? node.uses : undefined;
    } else {
      const hook = hooks.get(key);
      if (hook === undefined) {
        problems.push({ key, index: null, reason: "unknown_node", detail: "no such node or hook" });
        continue;
      }
      uses = hook.uses;
    }
    const def = uses === undefined ? undefined : catalogue.block(uses);
    if (def === undefined || !EFFECTS.has(def.effect)) {
      problems.push({
        key,
        index: null,
        reason: "not_an_effect",
        detail: "only write, send and pay take a fake",
      });
      continue;
    }
    const list = fakes[key];
    if (!Array.isArray(list)) {
      problems.push({ key, index: null, reason: "shape", detail: "entries must be an array" });
      continue;
    }
    for (let index = 0; index < list.length; index += 1) {
      const problem = checkEntry(list[index], def.output);
      if (problem !== null) {
        problems.push({ key, index, reason: problem.reason, detail: problem.detail });
      }
    }
  }

  const needed: string[] = [];
  for (const nodeId of reachableNodeIds(flow, catalogue)) {
    const node: FlowNode | undefined = flow.nodes[nodeId];
    if (node !== undefined && node.kind === "block") {
      const effect = catalogue.block(node.uses)?.effect;
      if (effect !== undefined && EFFECTS.has(effect)) {
        needed.push(nodeId);
      }
    }
    for (const [key, hook] of hooks) {
      if (hook.nodeId !== nodeId) {
        continue;
      }
      const effect = catalogue.block(hook.uses)?.effect;
      if (effect !== undefined && EFFECTS.has(effect)) {
        needed.push(key);
      }
    }
  }
  for (const key of needed) {
    const list = Object.hasOwn(fakes, key) ? fakes[key] : undefined;
    if (list === undefined || (Array.isArray(list) && list.length === 0)) {
      problems.push({ key, index: null, reason: "missing", detail: "no fake entry" });
    }
  }

  problems.sort(compareProblems);
  const capped = problems.slice(0, MAX_PROBLEMS);
  if (capped.length > 0) {
    return { fakes: null, problems: capped };
  }
  return { fakes: structuredClone(fakes) as DryRunFakes, problems: [] };
}

export function checkFakes(
  flow: Flow,
  catalogue: Catalogue,
  fakes: unknown,
): { fakes: DryRunFakes | null; problems: FakeProblem[] } {
  try {
    return check(flow, catalogue, fakes);
  } catch {
    return {
      fakes: null,
      problems: [
        { key: "", index: null, reason: "shape", detail: "fakes cannot be checked" },
      ],
    };
  }
}
