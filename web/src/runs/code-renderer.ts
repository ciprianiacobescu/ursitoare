// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { StepRenderer } from "./step-renderers.ts";

export const CODE_STEP_RENDERER: StepRenderer = {
  kind: "",
  label(_step) {
    throw new Error("not implemented");
  },
  details(_step) {
    throw new Error("not implemented");
  },
};

export function registerCodeRenderer(): void {
  throw new Error("not implemented");
}
