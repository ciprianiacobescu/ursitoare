// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FaultPoints } from "../../../src/config/faults.ts";
import type { StepObserver } from "../../../src/durable/index.ts";

export function faultObserver(_points: FaultPoints): StepObserver {
  throw new Error("not implemented");
}
