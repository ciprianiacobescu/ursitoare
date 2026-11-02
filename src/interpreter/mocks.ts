// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Catalogue, Flow, JsonValue } from "../authoring/index.ts";
import type { RunStore } from "../runs/index.ts";
import type { InterpreterDeps, ToolInvoker } from "./types.ts";

export type MockEntry = { output: JsonValue } | { error: { code: string; message: string } };

export type TestMocks = { [nodeId: string]: MockEntry[] };

export interface MockProblem {
  nodeId: string;
  index: number | null;
  reason: "missing" | "unknown_node" | "not_a_block" | "schema" | "shape";
  detail: string;
}

export function checkMocks(
  _flow: Flow,
  _catalogue: Catalogue,
  _mocks: unknown,
): { mocks: TestMocks | null; problems: MockProblem[] } {
  throw new Error("not implemented");
}

export function createMockInvoker(_mocks: TestMocks): ToolInvoker {
  throw new Error("not implemented");
}

export function testRunInvokers(_store: RunStore): InterpreterDeps["invokerFor"] {
  throw new Error("not implemented");
}
