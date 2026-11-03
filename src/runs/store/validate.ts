import { RunDataError } from "./errors.ts";
import type {
  NewRun,
  PayloadValue,
  RunError,
  RunMode,
  RunPrincipalRecord,
  RunState,
  RunTransition,
} from "./types.ts";

const MAX_DEPTH = 64;

const INVALID_MESSAGE = "invalid run data";

const RUN_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;
const OWNER_TEAM_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;
const NODE_ID_PATTERN = /^[a-z][a-z0-9_]{0,127}$/;
const ERROR_CODE_PATTERN = /^[A-Za-z][A-Za-z0-9_.-]{0,63}$/;

export function invalid(): never {
  throw new RunDataError("RUN_DATA_INVALID", INVALID_MESSAGE);
}

export function assertText(value: string): void {
  if (!value.isWellFormed() || value.includes("\u0000")) {
    invalid();
  }
}

function assertBoundedText(value: unknown, max: number): asserts value is string {
  if (typeof value !== "string" || value.length === 0 || value.length > max) {
    invalid();
  }
  assertText(value);
}

function assertMatching(value: unknown, pattern: RegExp): asserts value is string {
  if (typeof value !== "string" || !pattern.test(value)) {
    invalid();
  }
}

export function assertDate(value: unknown): asserts value is Date {
  if (!(value instanceof Date)) {
    invalid();
  }
  if (Number.isNaN(value.getTime())) {
    invalid();
  }
  const year = value.getUTCFullYear();
  if (year < 1970 || year > 9999) {
    invalid();
  }
}

export function formatTimestamp(value: Date): string {
  assertDate(value);
  return `${value.toISOString().slice(0, -1)}000Z`;
}

export function formatRunDay(value: Date): string {
  assertDate(value);
  return value.toISOString().slice(0, 10);
}

export function assertRunId(value: unknown): asserts value is string {
  assertMatching(value, RUN_ID_PATTERN);
}

export function assertFlowId(value: unknown): asserts value is string {
  assertMatching(value, FLOW_ID_PATTERN);
  if (value.length > 64) {
    invalid();
  }
}

export function assertFlowHash(value: unknown): asserts value is string {
  assertMatching(value, FLOW_HASH_PATTERN);
}

export function assertOwnerTeam(value: unknown): asserts value is string {
  assertMatching(value, OWNER_TEAM_PATTERN);
}

export function assertNodeId(value: unknown): asserts value is string {
  assertMatching(value, NODE_ID_PATTERN);
}

export function assertRunMode(value: unknown): asserts value is RunMode {
  if (value !== "live" && value !== "mock" && value !== "stub") {
    invalid();
  }
}

export function assertRunState(value: unknown): asserts value is RunState {
  if (
    value !== "queued" &&
    value !== "running" &&
    value !== "completed" &&
    value !== "failed" &&
    value !== "cancelled"
  ) {
    invalid();
  }
}

export function assertRunError(value: unknown): asserts value is RunError {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid();
  }
  const error = value as { code?: unknown; message?: unknown; node?: unknown };
  assertMatching(error.code, ERROR_CODE_PATTERN);
  if (typeof error.message !== "string" || error.message.length > 4000) {
    invalid();
  }
  assertText(error.message);
  if (error.node !== null) {
    assertNodeId(error.node);
  }
}

export function assertPrincipal(value: unknown): asserts value is RunPrincipalRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid();
  }
  const principal = value as { userId?: unknown; kind?: unknown };
  assertBoundedText(principal.userId, 128);
  if (principal.kind !== "human" && principal.kind !== "service") {
    invalid();
  }
}

export function assertActorChain(value: unknown): asserts value is readonly string[] {
  if (!Array.isArray(value) || value.length > 32) {
    invalid();
  }
  for (const entry of value) {
    assertBoundedText(entry, 128);
  }
}

export function assertNewRun(run: NewRun): void {
  assertRunId(run.runId);
  assertRunId(run.lineageId);
  if (run.parentRunId !== null) {
    assertRunId(run.parentRunId);
  }
  assertFlowId(run.flowId);
  assertFlowHash(run.flowHash);
  assertOwnerTeam(run.ownerTeam);
  assertRunMode(run.mode);
  if (run.trigger !== "test") {
    invalid();
  }
  assertPrincipal(run.principal);
  assertActorChain(run.actorChain);
  assertPayloadValue(run.input);
  if (run.mocks !== null) {
    assertPayloadValue(run.mocks);
  }
}

export function assertRunTransition(change: RunTransition): void {
  assertRunState(change.state);
  if (!Array.isArray(change.from)) {
    invalid();
  }
  for (const state of change.from) {
    assertRunState(state);
  }
  assertDate(change.at);
  if (change.output !== undefined) {
    assertPayloadValue(change.output);
  }
  if (change.error !== undefined) {
    assertRunError(change.error);
  }
  if (change.terminalNode !== undefined) {
    assertNodeId(change.terminalNode);
  }
}

export function assertPayloadValue(value: unknown, depth = 0): asserts value is PayloadValue {
  if (value === null) {
    return;
  }

  switch (typeof value) {
    case "boolean":
      return;
    case "number":
      if (!Number.isFinite(value)) {
        invalid();
      }
      return;
    case "string":
      assertText(value);
      return;
    case "object":
      break;
    default:
      invalid();
  }

  if (depth >= MAX_DEPTH) {
    invalid();
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      assertPayloadValue(entry, depth + 1);
    }
    return;
  }

  const proto = Object.getPrototypeOf(value) as object | null;
  if (proto !== Object.prototype && proto !== null) {
    invalid();
  }

  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    assertText(key);
    assertPayloadValue(record[key], depth + 1);
  }
}
