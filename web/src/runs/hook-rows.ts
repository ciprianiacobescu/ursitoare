// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { StepView } from "./types.ts";

export interface HookEntryView {
  label: string;
  kind: "code" | "block";
  fused: boolean;
  attempt: number;
  state: "completed" | "failed";
  action: "continue" | "skip" | "redirect" | "retry" | "fail" | null;
  mutated: "input" | "output" | null;
  to: string | null;
  error: { code: string; message: string } | null;
  tool: string | null;
  idemKey: string | null;
}

export interface StepHooksView {
  inputOriginalRef: string | null;
  entries: HookEntryView[];
}

export interface HookRowView {
  label: string;
  text: string;
  details: readonly { term: string; value: string }[];
}

export function parseStepHooks(_raw: unknown): StepHooksView | null | undefined {
  throw new Error("not implemented");
}

export function hookRows(_step: StepView): HookRowView[] {
  throw new Error("not implemented");
}

export function hookTraceNote(_step: StepView): string | null {
  throw new Error("not implemented");
}
