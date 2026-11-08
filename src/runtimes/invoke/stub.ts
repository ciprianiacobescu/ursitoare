// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DryRunFakes, InterpreterDeps, ToolInvoker } from "../../interpreter/index.ts";
import type { RunStore } from "../../runs/index.ts";
import type { InvokePath } from "./types.ts";

export function stubInvoker(_live: ToolInvoker, _fakes: DryRunFakes): ToolInvoker {
  throw new Error("not implemented");
}

export function dryRunInvokers(
  _path: InvokePath,
  _store: RunStore,
  _fallback: InterpreterDeps["invokerFor"],
): InterpreterDeps["invokerFor"] {
  throw new Error("not implemented");
}
