import { parseStepHooks } from "./hook-rows.ts";
import type { StepHooksView } from "./hook-rows.ts";

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;
const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FLOW_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/;
const TIMESTAMP_PATTERN =
  /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/;

const RUN_STATES: readonly RunState[] = ["queued", "running", "completed", "failed", "cancelled"];
const STEP_STATES: readonly StepState[] = ["started", "completed", "failed", "skipped"];
const RUN_MODES: readonly RunMode[] = ["live", "mock", "stub"];
const PRINCIPAL_KINDS: readonly string[] = ["human", "service"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

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
  hooks?: StepHooksView | null;
}

export interface PayloadView {
  sha256: string;
  mediaType: string;
  size: number;
  data: PayloadValue;
}

function isRunState(value: unknown): value is RunState {
  return typeof value === "string" && (RUN_STATES as readonly string[]).includes(value);
}

function isStepState(value: unknown): value is StepState {
  return typeof value === "string" && (STEP_STATES as readonly string[]).includes(value);
}

function isRunMode(value: unknown): value is RunMode {
  return typeof value === "string" && (RUN_MODES as readonly string[]).includes(value);
}

function isPrincipalKind(value: unknown): value is "human" | "service" {
  return typeof value === "string" && PRINCIPAL_KINDS.includes(value);
}

function isDigest(value: unknown): value is string {
  return typeof value === "string" && DIGEST_PATTERN.test(value);
}

function isFlowHash(value: unknown): value is string {
  return typeof value === "string" && FLOW_HASH_PATTERN.test(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === "string" && TIMESTAMP_PATTERN.test(value);
}

// null keeps null; a fitting value is kept; anything else is invalid (`undefined`).
// The `parseX` helpers return that last one so a missing or malformed field
// refuses the whole view.
function parseDigestRef(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isDigest(value) ? value : undefined;
}

function parseNullableTimestamp(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isTimestamp(value) ? value : undefined;
}

function parseNullableNonEmptyString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return isNonEmptyString(value) ? value : undefined;
}

function parseRunError(value: unknown): RunError | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;
  const code = value["code"];
  const message = value["message"];
  const node = value["node"];
  if (!isNonEmptyString(code)) return undefined;
  if (!isNonEmptyString(message)) return undefined;
  if (node !== null && !isNonEmptyString(node)) return undefined;
  return { code, message, node };
}

function parsePrincipal(value: unknown): RunView["principal"] | undefined {
  if (!isRecord(value)) return undefined;
  const userId = value["userId"];
  const kind = value["kind"];
  if (!isNonEmptyString(userId)) return undefined;
  if (!isPrincipalKind(kind)) return undefined;
  return { userId, kind };
}

function parseCount(value: unknown, minimum: number): number | undefined {
  if (typeof value !== "number" || !Number.isInteger(value) || value < minimum) {
    return undefined;
  }
  return value;
}

export function parseRunView(raw: unknown): RunView | null {
  if (!isRecord(raw)) return null;
  const id = raw["id"];
  const flowId = raw["flowId"];
  const flowHash = raw["flowHash"];
  const mode = raw["mode"];
  const trigger = raw["trigger"];
  const state = raw["state"];
  const ownerTeam = raw["ownerTeam"];
  const terminalNode = raw["terminalNode"];
  const error = raw["error"];
  const inputRef = raw["inputRef"];
  const outputRef = raw["outputRef"];
  const createdAt = raw["createdAt"];
  const startedAt = raw["startedAt"];
  const endedAt = raw["endedAt"];

  if (!isNonEmptyString(id) || !RUN_ID_PATTERN.test(id)) return null;
  if (
    !isNonEmptyString(flowId) ||
    flowId.length > FLOW_ID_MAX_LENGTH ||
    !FLOW_ID_PATTERN.test(flowId)
  ) {
    return null;
  }
  if (!isFlowHash(flowHash)) return null;
  if (!isRunMode(mode)) return null;
  if (trigger !== "test") return null;
  if (!isRunState(state)) return null;
  if (!isNonEmptyString(ownerTeam)) return null;
  const principal = parsePrincipal(raw["principal"]);
  if (principal === undefined) return null;
  const parsedTerminalNode = parseNullableNonEmptyString(terminalNode);
  if (parsedTerminalNode === undefined) return null;
  const runError = parseRunError(error);
  if (runError === undefined) return null;
  const parsedInputRef = parseDigestRef(inputRef);
  if (parsedInputRef === undefined) return null;
  const parsedOutputRef = parseDigestRef(outputRef);
  if (parsedOutputRef === undefined) return null;
  if (!isTimestamp(createdAt)) return null;
  const parsedStartedAt = parseNullableTimestamp(startedAt);
  if (parsedStartedAt === undefined) return null;
  const parsedEndedAt = parseNullableTimestamp(endedAt);
  if (parsedEndedAt === undefined) return null;

  return {
    id,
    flowId,
    flowHash,
    mode,
    trigger,
    state,
    ownerTeam,
    principal: { userId: principal.userId, kind: principal.kind },
    terminalNode: parsedTerminalNode,
    error: runError === null ? null : { code: runError.code, message: runError.message, node: runError.node },
    inputRef: parsedInputRef,
    outputRef: parsedOutputRef,
    createdAt,
    startedAt: parsedStartedAt,
    endedAt: parsedEndedAt,
  };
}

export function parseStepView(raw: unknown): StepView | null {
  if (!isRecord(raw)) return null;
  const seq = raw["seq"];
  const nodeId = raw["nodeId"];
  const kind = raw["kind"];
  const effectSeq = raw["effectSeq"];
  const attempt = raw["attempt"];
  const state = raw["state"];
  const outcome = raw["outcome"];
  const error = raw["error"];
  const inputRef = raw["inputRef"];
  const outputRef = raw["outputRef"];
  const idemKey = raw["idemKey"];
  const policyDecisionId = raw["policyDecisionId"];
  const taint = raw["taint"];
  const startedAt = raw["startedAt"];
  const endedAt = raw["endedAt"];

  const parsedSeq = parseCount(seq, 0);
  if (parsedSeq === undefined) return null;
  if (!isNonEmptyString(nodeId)) return null;
  if (!isNonEmptyString(kind)) return null;
  const parsedEffectSeq = parseCount(effectSeq, 0);
  if (parsedEffectSeq === undefined) return null;
  const parsedAttempt = parseCount(attempt, 1);
  if (parsedAttempt === undefined) return null;
  if (!isStepState(state)) return null;
  const parsedOutcome = parseNullableNonEmptyString(outcome);
  if (parsedOutcome === undefined) return null;
  const runError = parseRunError(error);
  if (runError === undefined) return null;
  const parsedInputRef = parseDigestRef(inputRef);
  if (parsedInputRef === undefined) return null;
  const parsedOutputRef = parseDigestRef(outputRef);
  if (parsedOutputRef === undefined) return null;
  const parsedIdemKey = parseNullableNonEmptyString(idemKey);
  if (parsedIdemKey === undefined) return null;
  const parsedDecisionId = parseNullableNonEmptyString(policyDecisionId);
  if (parsedDecisionId === undefined) return null;
  if (!Array.isArray(taint) || !taint.every((entry) => typeof entry === "string" && entry.length > 0)) {
    return null;
  }
  if (!isTimestamp(startedAt)) return null;
  const parsedEndedAt = parseNullableTimestamp(endedAt);
  if (parsedEndedAt === undefined) return null;

  const view: StepView = {
    seq: parsedSeq,
    nodeId,
    kind,
    effectSeq: parsedEffectSeq,
    attempt: parsedAttempt,
    state,
    outcome: parsedOutcome,
    error: runError === null ? null : { code: runError.code, message: runError.message, node: runError.node },
    inputRef: parsedInputRef,
    outputRef: parsedOutputRef,
    idemKey: parsedIdemKey,
    policyDecisionId: parsedDecisionId,
    taint: [...taint],
    startedAt,
    endedAt: parsedEndedAt,
  };
  const hooks = parseStepHooks(raw["hooks"]);
  if (hooks !== undefined) view.hooks = hooks;
  return view;
}

export function parsePayloadView(raw: unknown): PayloadView | null {
  if (!isRecord(raw)) return null;
  const sha256 = raw["sha256"];
  const mediaType = raw["mediaType"];
  const size = raw["size"];

  if (!isDigest(sha256) && sha256 !== null) return null;
  if (!isNonEmptyString(mediaType)) return null;
  const parsedSize = parseCount(size, 0);
  if (parsedSize === undefined) return null;
  if (!Object.hasOwn(raw, "data")) return null;

  return { sha256: sha256 as string, mediaType, size: parsedSize, data: raw["data"] as PayloadValue };
}
