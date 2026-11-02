// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { StepView } from "./types.ts";

export interface StepRenderer {
  kind: string;
  label(step: StepView): string;
  details(step: StepView): readonly { term: string; value: string }[];
}

export class StepRendererError extends Error {
  readonly code: "STEP_RENDERER_INVALID" | "STEP_RENDERER_DUPLICATE";

  constructor(_code: StepRendererError["code"], message: string) {
    super(message);
    throw new Error("not implemented");
  }
}

export function registerStepRenderer(_renderer: StepRenderer): void {
  throw new Error("not implemented");
}

export function stepRendererFor(_kind: string): StepRenderer {
  throw new Error("not implemented");
}

export const stepRenderers: { list(): readonly StepRenderer[] } = {
  list(): readonly StepRenderer[] {
    throw new Error("not implemented");
  },
};
