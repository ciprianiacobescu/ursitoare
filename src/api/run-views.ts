// Run and step views over the stored run rows.

import { entityRef } from "../pdp/index.ts";
import type {
  PayloadValue,
  RunError,
  RunMode,
  RunRecord,
  RunState,
  StepRecord,
  StepState,
} from "../runs/index.ts";

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

const RUN_ERROR_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["code", "message", "node"],
  properties: {
    code: { type: "string" },
    message: { type: "string" },
    node: { type: ["string", "null"] },
    details: { type: "object", additionalProperties: true },
  },
};

const NULLABLE_RUN_ERROR_SCHEMA = {
  anyOf: [{ type: "null" }, RUN_ERROR_SCHEMA],
};

const RUN_VIEW_PROPERTIES = {
  id: { type: "string" },
  flowId: { type: "string" },
  flowHash: { type: "string" },
  mode: { type: "string", enum: ["live", "mock", "stub"] },
  trigger: { type: "string", enum: ["test"] },
  state: { type: "string", enum: ["queued", "running", "completed", "failed", "cancelled"] },
  ownerTeam: { type: "string" },
  principal: {
    type: "object",
    additionalProperties: false,
    required: ["userId", "kind"],
    properties: {
      userId: { type: "string" },
      kind: { type: "string", enum: ["human", "service"] },
    },
  },
  terminalNode: { type: ["string", "null"] },
  error: NULLABLE_RUN_ERROR_SCHEMA,
  inputRef: { type: ["string", "null"] },
  outputRef: { type: ["string", "null"] },
  createdAt: { type: "string" },
  startedAt: { type: ["string", "null"] },
  endedAt: { type: ["string", "null"] },
};

const STEP_VIEW_PROPERTIES = {
  seq: { type: "integer" },
  nodeId: { type: "string" },
  kind: { type: "string" },
  effectSeq: { type: "integer" },
  attempt: { type: "integer" },
  state: { type: "string", enum: ["started", "completed", "failed", "skipped"] },
  outcome: { type: ["string", "null"] },
  error: NULLABLE_RUN_ERROR_SCHEMA,
  inputRef: { type: ["string", "null"] },
  outputRef: { type: ["string", "null"] },
  idemKey: { type: ["string", "null"] },
  policyDecisionId: { type: ["string", "null"] },
  taint: { type: "array", items: { type: "string" } },
  startedAt: { type: "string" },
  endedAt: { type: ["string", "null"] },
};

export const RUN_VIEW_SCHEMA: Readonly<Record<string, unknown>> = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(RUN_VIEW_PROPERTIES),
  properties: RUN_VIEW_PROPERTIES,
};

export const STEP_VIEW_SCHEMA: Readonly<Record<string, unknown>> = {
  type: "object",
  additionalProperties: false,
  required: Object.keys(STEP_VIEW_PROPERTIES),
  properties: STEP_VIEW_PROPERTIES,
};

function copyError(error: RunError | null): RunError | null {
  return error === null ? null : { ...error };
}

export function toRunView(run: RunRecord): RunView {
  return {
    id: run.runId,
    flowId: run.flowId,
    flowHash: run.flowHash,
    mode: run.mode,
    trigger: run.trigger,
    state: run.state,
    ownerTeam: run.ownerTeam,
    principal: { userId: run.principal.userId, kind: run.principal.kind },
    terminalNode: run.terminalNode,
    error: copyError(run.error),
    inputRef: run.inputRef,
    outputRef: run.outputRef,
    createdAt: run.createdAt,
    startedAt: run.startedAt,
    endedAt: run.endedAt,
  };
}

export function toStepView(step: StepRecord): StepView {
  return {
    seq: step.seq,
    nodeId: step.nodeId,
    kind: step.kind,
    effectSeq: step.effectSeq,
    attempt: step.attempt,
    state: step.state,
    outcome: step.outcome,
    error: copyError(step.error),
    inputRef: step.inputRef,
    outputRef: step.outputRef,
    idemKey: step.idemKey,
    policyDecisionId: step.policyDecisionId,
    taint: [...step.taint],
    startedAt: step.startedAt,
    endedAt: step.endedAt,
  };
}

export function runResource(tenantId: string, run: RunRecord): ResourceRef {
  return {
    type: "Run",
    id: run.runId,
    tenantId,
    attrs: {
      owner_team: entityRef("Team", `${tenantId}/${run.ownerTeam}`),
      initiator: entityRef("User", `${tenantId}/${run.principal.userId}`),
    },
  };
}
