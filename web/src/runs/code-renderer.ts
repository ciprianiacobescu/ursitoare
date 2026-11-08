import { registerStepRenderer, stepRendererFor } from "./step-renderers.ts";
import type { StepRenderer } from "./step-renderers.ts";
import type { StepView } from "./types.ts";

function codeLabel(step: StepView): string {
  return step.outcome === null ? step.kind : `${step.kind}: ${step.outcome}`;
}

export const CODE_STEP_RENDERER: StepRenderer = {
  kind: "code",
  label: codeLabel,
  details: (step) => [
    { term: "Attempt", value: String(step.attempt) },
    { term: "Taint", value: step.taint.length > 0 ? step.taint.join(", ") : "none" },
  ],
};

export function registerCodeRenderer(): void {
  if (stepRendererFor("code").kind === "code") return;
  registerStepRenderer(CODE_STEP_RENDERER);
}
