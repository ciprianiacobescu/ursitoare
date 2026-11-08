import { Ajv2020 } from "ajv/dist/2020.js";

import type { Catalogue, Flow, FlowNode, JsonSchema, JsonValue } from "../authoring/index.ts";
import { augmentedSuccessors, hookPlacements } from "../authoring/index.ts";
import type { RunStore, TenantContext } from "../runs/index.ts";
import type { InterpreterDeps, ToolInvoker } from "./types.ts";
import { InterpreterError } from "./errors.ts";
import { hookStepName } from "./hooks/names.ts";

export type MockEntry = { output: JsonValue } | { error: { code: string; message: string } };

export type TestMocks = { [nodeId: string]: MockEntry[] };

export interface MockProblem {
  nodeId: string;
  index: number | null;
  reason: "missing" | "unknown_node" | "not_a_block" | "schema" | "shape";
  detail: string;
}

const SHAPE_DETAIL = "entry must be {output} or {error: {code, message}}";
const ERROR_CODE = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;
const MAX_PROBLEMS = 50;

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

function isErrorEntry(value: unknown): value is { error: { code: string; message: string } } {
  if (!isPlainObject(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length !== 1 || keys[0] !== "error") {
    return false;
  }
  const error = value["error"];
  if (!isPlainObject(error)) {
    return false;
  }
  const errorKeys = Object.keys(error);
  if (
    errorKeys.length !== 2 ||
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

interface EntryProblem {
  reason: "shape" | "schema";
  detail: string;
}

function checkEntry(entry: unknown, schema: JsonSchema | undefined): EntryProblem | null {
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
  if (keys[0] === "error") {
    return isErrorEntry(entry) ? null : { reason: "shape", detail: SHAPE_DETAIL };
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
      if (seen.has(next)) {
        continue;
      }
      seen.add(next);
      queue.push(next);
    }
  }
  return seen;
}

interface HookMock {
  nodeId: string;
  uses: string;
}

function hookMockMap(flow: Flow, catalogue: Catalogue): Map<string, HookMock> {
  const map = new Map<string, HookMock>();
  for (const nodeId of Object.keys(flow.nodes)) {
    const placed = hookPlacements(flow, nodeId, catalogue);
    for (const placement of [...placed.pre, ...placed.post]) {
      const hook = placement.hook as unknown as Record<string, unknown>;
      if (hook["kind"] === "block" && typeof hook["uses"] === "string") {
        map.set(hookStepName(nodeId, placement), { nodeId, uses: hook["uses"] });
      }
    }
  }
  return map;
}

function compareProblems(a: MockProblem, b: MockProblem): number {
  if (a.nodeId !== b.nodeId) {
    return a.nodeId < b.nodeId ? -1 : 1;
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

export function checkMocks(
  flow: Flow,
  catalogue: Catalogue,
  mocks: unknown,
): { mocks: TestMocks | null; problems: MockProblem[] } {
  if (!isPlainObject(mocks)) {
    return {
      mocks: null,
      problems: [
        { nodeId: "", index: null, reason: "shape", detail: "mocks must be an object" },
      ],
    };
  }

  const problems: MockProblem[] = [];
  const hookKeys = hookMockMap(flow, catalogue);

  for (const nodeId of Object.keys(mocks)) {
    const hookMock = Object.hasOwn(flow.nodes, nodeId) ? undefined : hookKeys.get(nodeId);
    if (hookMock !== undefined) {
      const hookList = mocks[nodeId];
      if (!Array.isArray(hookList)) {
        problems.push({ nodeId, index: null, reason: "shape", detail: "entries must be an array" });
        continue;
      }
      const hookSchema = catalogue.block(hookMock.uses)?.output;
      for (let index = 0; index < hookList.length; index += 1) {
        const check = checkEntry(hookList[index], hookSchema);
        if (check !== null) {
          problems.push({ nodeId, index, reason: check.reason, detail: check.detail });
        }
      }
      continue;
    }
    const node: FlowNode | undefined = Object.hasOwn(flow.nodes, nodeId)
      ? flow.nodes[nodeId]
      : undefined;
    if (node === undefined) {
      problems.push({ nodeId, index: null, reason: "unknown_node", detail: "no such node" });
      continue;
    }
    if (node.kind !== "block") {
      problems.push({ nodeId, index: null, reason: "not_a_block", detail: "node is not a block" });
      continue;
    }
    const list = mocks[nodeId];
    if (!Array.isArray(list)) {
      problems.push({
        nodeId,
        index: null,
        reason: "shape",
        detail: "entries must be an array",
      });
      continue;
    }
    const schema = catalogue.block(node.uses)?.output;
    for (let index = 0; index < list.length; index += 1) {
      const check = checkEntry(list[index], schema);
      if (check !== null) {
        problems.push({ nodeId, index, reason: check.reason, detail: check.detail });
      }
    }
  }

  const needed: string[] = [];
  for (const nodeId of reachableNodeIds(flow, catalogue)) {
    const node: FlowNode | undefined = flow.nodes[nodeId];
    if (node !== undefined && node.kind === "block") {
      needed.push(nodeId);
    }
    for (const [key, hookMock] of hookKeys) {
      if (hookMock.nodeId === nodeId) {
        needed.push(key);
      }
    }
  }
  for (const key of needed) {
    const list = Object.hasOwn(mocks, key) ? mocks[key] : undefined;
    if (list === undefined || (Array.isArray(list) && list.length === 0)) {
      problems.push({ nodeId: key, index: null, reason: "missing", detail: "no mock entry" });
    }
  }

  problems.sort(compareProblems);
  const capped = problems.slice(0, MAX_PROBLEMS);
  if (capped.length > 0) {
    return { mocks: null, problems: capped };
  }
  return { mocks: structuredClone(mocks) as TestMocks, problems: [] };
}

function toolFailure(
  reason: "mock_error" | "mock_exhausted" | "mock_missing" | "mocks_unavailable",
  nodeId: string,
  details: Record<string, string | string[]> = {},
): InterpreterError {
  return new InterpreterError("INTERPRETER_TOOL_FAILED", `mock ${reason}`, nodeId, {
    reason,
    ...details,
  });
}

export function createMockInvoker(mocks: TestMocks): ToolInvoker {
  return {
    async invoke(call, ctx) {
      const hookKey =
        call.phase !== undefined && call.hookId !== undefined
          ? `${call.nodeId}:${call.phase}:${call.hookId}`
          : null;
      const key = hookKey ?? call.nodeId;
      const extra: Record<string, string> = hookKey === null ? {} : { hook: hookKey };
      if (!Object.hasOwn(mocks, key)) {
        throw toolFailure("mock_missing", call.nodeId, extra);
      }
      const list = mocks[key] as MockEntry[];
      const entry = list[ctx.attempt - 1];
      if (entry === undefined) {
        throw toolFailure("mock_exhausted", call.nodeId, extra);
      }
      if (Object.hasOwn(entry, "error")) {
        const error = (entry as { error: { code: string; message: string } }).error;
        throw toolFailure("mock_error", call.nodeId, { ...extra, mockCode: error.code });
      }
      return { output: structuredClone((entry as { output: JsonValue }).output) };
    },
  };
}

export function testRunInvokers(store: RunStore): InterpreterDeps["invokerFor"] {
  return async (mode, run) => {
    if (mode !== "mock") {
      throw new InterpreterError(
        "INTERPRETER_NO_INVOKER",
        `no invoker for mode ${mode}`,
        null,
        { mode },
      );
    }
    let loaded: Promise<ToolInvoker> | null = null;
    const load = async (ctx: TenantContext): Promise<ToolInvoker> => {
      if (run.mocksRef === null) {
        throw toolFailure("mocks_unavailable", "");
      }
      const payload = await store.getPayload(ctx, run.mocksRef);
      if (payload === null || !isPlainObject(payload.data)) {
        throw toolFailure("mocks_unavailable", "");
      }
      return createMockInvoker(payload.data as TestMocks);
    };
    return {
      async invoke(call, ctx) {
        loaded ??= load(ctx.tenant);
        const invoker = await loaded;
        return invoker.invoke(call, ctx);
      },
    };
  };
}
