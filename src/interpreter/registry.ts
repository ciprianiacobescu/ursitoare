import { NODE_KINDS } from "../authoring/index.ts";
import type { NodeKind } from "../authoring/index.ts";
import { InterpreterError } from "./errors.ts";
import type { NodeRuntime } from "./types.ts";

export const SUPPORTED_KINDS: readonly NodeKind[] = ["block", "code", "end", "switch", "wait"];

const runtimes = new Map<NodeKind, NodeRuntime>();

export function registerNodeRuntime(kind: NodeKind, runtime: NodeRuntime): void {
  if (!NODE_KINDS.includes(kind) || typeof runtime?.execute !== "function") {
    throw new InterpreterError(
      "NODE_RUNTIME_INVALID",
      `invalid node runtime for kind "${String(kind)}"`,
      null,
      { kind: String(kind) },
    );
  }
  if (runtimes.has(kind)) {
    throw new InterpreterError(
      "NODE_RUNTIME_DUPLICATE",
      `a runtime for kind "${kind}" is already registered`,
      null,
      { kind },
    );
  }
  runtimes.set(kind, runtime);
}

export function nodeRuntimeFor(kind: NodeKind): NodeRuntime | undefined {
  return runtimes.get(kind);
}
