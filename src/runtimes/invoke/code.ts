// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { WorkerSandbox } from "../../sandbox/index.ts";
import type { CodeRunner } from "./types.ts";

export function createCodeRunner(_sandbox: () => WorkerSandbox | null): CodeRunner {
  throw new Error("not implemented");
}
