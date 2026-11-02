// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type PayloadValue =
  | null
  | boolean
  | number
  | string
  | PayloadValue[]
  | { [key: string]: PayloadValue };

export type RunState = "queued" | "running" | "completed" | "failed" | "cancelled";

export type StepState = "started" | "completed" | "failed" | "skipped";

export type RunMode = "live" | "mock" | "stub";

export interface RunError {
  code: string;
  message: string;
  node: string | null;
}

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

export function parseRunView(_raw: unknown): RunView | null {
  throw new Error("not implemented");
}

export function parseStepView(_raw: unknown): StepView | null {
  throw new Error("not implemented");
}

export function parsePayloadView(_raw: unknown): PayloadView | null {
  throw new Error("not implemented");
}
