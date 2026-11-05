import type { StepView } from "./types.ts";

export interface StepRenderer {
  kind: string;
  label(step: StepView): string;
  details(step: StepView): readonly { term: string; value: string }[];
}

export class StepRendererError extends Error {
  readonly code: "STEP_RENDERER_INVALID" | "STEP_RENDERER_DUPLICATE";

  constructor(code: StepRendererError["code"], message: string) {
    super(message);
    this.name = "StepRendererError";
    this.code = code;
  }
}

const KIND_PATTERN = /^[a-z][a-z0-9_.]{0,39}$/;

function withOutcome(step: StepView): string {
  return step.outcome === null ? step.kind : `${step.kind}: ${step.outcome}`;
}

const BUILT_INS: readonly StepRenderer[] = [
  {
    kind: "block",
    label: withOutcome,
    details: (step) => [
      { term: "Effect sequence", value: String(step.effectSeq) },
      { term: "Attempt", value: String(step.attempt) },
      { term: "Idempotency key", value: step.idemKey ?? "none" },
      { term: "Taint", value: step.taint.length > 0 ? step.taint.join(", ") : "none" },
    ],
  },
  {
    kind: "switch",
    label: withOutcome,
    details: (step) => [{ term: "Branch", value: step.outcome ?? "none" }],
  },
  {
    kind: "wait",
    label: withOutcome,
    details: (step) => [{ term: "Wait", value: step.outcome === "skipped" ? "skipped" : "waited" }],
  },
  { kind: "end", label: withOutcome, details: () => [] },
];

const DEFAULT_RENDERER: StepRenderer = {
  kind: "*",
  label: (step) => `${withOutcome({ ...step, kind: step.kind.slice(0, 40) })} (unknown kind)`,
  details: () => [],
};

const renderers = new Map<string, StepRenderer>(BUILT_INS.map((r) => [r.kind, r]));

export function registerStepRenderer(renderer: StepRenderer): void {
  const candidate = renderer as unknown;
  if (
    typeof candidate !== "object" ||
    candidate === null ||
    typeof (candidate as StepRenderer).kind !== "string" ||
    !KIND_PATTERN.test((candidate as StepRenderer).kind) ||
    typeof (candidate as StepRenderer).label !== "function" ||
    typeof (candidate as StepRenderer).details !== "function"
  ) {
    throw new StepRendererError("STEP_RENDERER_INVALID", "A step renderer needs a valid kind, a label and details.");
  }
  if (renderers.has(renderer.kind)) {
    throw new StepRendererError("STEP_RENDERER_DUPLICATE", "A step renderer is already registered for this kind.");
  }
  renderers.set(renderer.kind, renderer);
}

export function stepRendererFor(kind: string): StepRenderer {
  return renderers.get(kind) ?? DEFAULT_RENDERER;
}

export const stepRenderers: { list(): readonly StepRenderer[] } = {
  list(): readonly StepRenderer[] {
    return [...renderers.values()];
  },
};
