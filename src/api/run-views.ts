// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { PayloadValue, RunError, RunMode, RunRecord, RunState, StepRecord, StepState } from "../runs/index.ts";
import type { ResourceRef } from "./route.ts";

export interface RunView {
  id: string;
  flowId: string;
  flowHash: string;
  mode: RunMode;
  trigger: "test";
  state: RunState;
  ownerTeam: string;
  principal: { userId: string; kind: "human" | "service" };
  terminalNode: string | null;
  error: RunError | null;
  inputRef: string | null;
  outputRef: string | null;
  createdAt: string;
  startedAt: string | null;
  endedAt: string | null;
}

export interface StepView {
  seq: number;
  nodeId: string;
  kind: string;
  effectSeq: number;
  attempt: number;
  state: StepState;
  outcome: string | null;
  error: RunError | null;
  inputRef: string | null;
  outputRef: string | null;
  idemKey: string | null;
  policyDecisionId: string | null;
  taint: string[];
  startedAt: string;
  endedAt: string | null;
}

export interface PayloadView {
  sha256: string;
  mediaType: string;
  size: number;
  data: PayloadValue;
}

export const RUN_VIEW_SCHEMA: Readonly<Record<string, unknown>> = {};

export const STEP_VIEW_SCHEMA: Readonly<Record<string, unknown>> = {};

export function toRunView(_run: RunRecord): RunView {
  throw new Error("not implemented");
}

export function toStepView(_step: StepRecord): StepView {
  throw new Error("not implemented");
}

export function runResource(_tenantId: string, _run: RunRecord): ResourceRef {
  throw new Error("not implemented");
}
