// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PayloadValue, RunError, RunState, StepState, StepView } from "./types.ts";

export interface DetailRow {
  term: string;
  value: string;
  href: string | null;
}

export type PayloadLoad =
  | { phase: "loading" }
  | { phase: "ready"; value: PayloadValue }
  | { phase: "error"; error: unknown };

export function stepStateLabel(
  _state: StepState,
  _runState: RunState,
): { label: string; note: string | null } {
  throw new Error("not implemented");
}

export function timelineItems(
  _steps: readonly StepView[],
  _runState: RunState,
): { seq: number; nodeId: string; text: string }[] {
  throw new Error("not implemented");
}

export function stepDetailRows(_step: StepView, _runState: RunState): DetailRow[] {
  throw new Error("not implemented");
}

export function decisionHref(_decisionId: string): string | null {
  throw new Error("not implemented");
}

export function runErrorText(_error: RunError | null): string | null {
  throw new Error("not implemented");
}

export function payloadShown(_ref: string | null, _load: PayloadLoad | undefined): string {
  throw new Error("not implemented");
}
