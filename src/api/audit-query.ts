import { isUtcTime, type AuditEventFilter } from "../audit/index.ts";
import type { PolicyDecisionFilter } from "../pdp/index.ts";

import { ApiError } from "./errors.ts";
import { readPage } from "./pagination.ts";

export interface ListQuery<F> {
  page: { limit: number; cursor: string | null };
  order: "asc" | "desc";
  filter: F;
}

const VALIDATION_STATUS = 400;
const VALIDATION_CODE = "VALIDATION_FAILED";
const VALIDATION_MESSAGE = "Request validation failed";
const UTC_MESSAGE = "must be a UTC time such as 2026-10-25T09:00:00Z";
const INVALID_MESSAGE = "is invalid";
const NOT_ALLOWED_MESSAGE = "is not allowed";
const AFTER_FROM_MESSAGE = "must be after from";

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
const DECIMAL_PATTERN = /^(0|[1-9][0-9]{0,18})$/;
const FROM_SEQ_PATTERN = /^[1-9][0-9]{0,18}$/;
const MAX_BIGINT = 9223372036854775807n;

const AUDIT_KEYS = new Set([
  "limit",
  "cursor",
  "order",
  "event_type",
  "actor_id",
  "target_kind",
  "target_id",
  "after_seq",
  "from",
  "to",
]);

const DECISION_KEYS = new Set([
  "limit",
  "cursor",
  "order",
  "decision",
  "action",
  "principal",
  "run_id",
  "decision_id",
  "from",
  "to",
]);

const VERIFY_KEYS = new Set(["from_seq"]);

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function validationFailure(field: string, message: string): ApiError {
  return new ApiError(VALIDATION_STATUS, VALIDATION_CODE, VALIDATION_MESSAGE, {
    fields: [{ field, message }],
  });
}

function checkUnknown(query: Record<string, unknown>, allowed: Set<string>): void {
  for (const name of Object.keys(query)) {
    if (!allowed.has(name)) {
      throw validationFailure(`querystring/${name}`, NOT_ALLOWED_MESSAGE);
    }
  }
}

function parseOrder(value: unknown): "asc" | "desc" {
  if (value === undefined) return "desc";
  if (value === "asc" || value === "desc") return value;
  throw validationFailure("querystring/order", INVALID_MESSAGE);
}

function isBoundedInt(text: string): boolean {
  return DECIMAL_PATTERN.test(text) && BigInt(text) <= MAX_BIGINT;
}

function isLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

function padFraction(text: string): string {
  const dot = text.indexOf(".");
  if (dot === -1) {
    return `${text.slice(0, -1)}.000000Z`;
  }
  const fraction = text.slice(dot + 1, dot + 7);
  return `${text.slice(0, dot)}.${fraction.padEnd(6, "0")}Z`;
}

function parseTime(name: string, value: unknown): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !isUtcTime(value)) {
    throw validationFailure(`querystring/${name}`, UTC_MESSAGE);
  }
  return value;
}

function checkTimeRange(from: string | undefined, to: string | undefined): void {
  if (from !== undefined && to !== undefined && padFraction(to) <= padFraction(from)) {
    throw validationFailure("querystring/to", AFTER_FROM_MESSAGE);
  }
}

function parseText(
  name: string,
  value: unknown,
  isValid: (text: string) => boolean,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string" || !isValid(value)) {
    throw validationFailure(`querystring/${name}`, INVALID_MESSAGE);
  }
  return value;
}

export function parseAuditQuery(query: unknown): ListQuery<AuditEventFilter> {
  const record = asRecord(query) ?? {};
  checkUnknown(record, AUDIT_KEYS);
  const page = readPage(record);
  const order = parseOrder(record.order);

  const eventType = parseText("event_type", record.event_type, (text) =>
    EVENT_TYPE_PATTERN.test(text),
  );
  const actorId = parseText("actor_id", record.actor_id, (text) => isLength(text, 1, 200));
  const targetKind = parseText("target_kind", record.target_kind, (text) =>
    EVENT_TYPE_PATTERN.test(text),
  );
  const targetId = parseText("target_id", record.target_id, (text) => isLength(text, 1, 200));
  const afterSeq = parseText("after_seq", record.after_seq, isBoundedInt);
  const from = parseTime("from", record.from);
  const to = parseTime("to", record.to);
  checkTimeRange(from, to);

  const filter: AuditEventFilter = {};
  if (eventType !== undefined) filter.eventType = eventType;
  if (actorId !== undefined) filter.actorId = actorId;
  if (targetKind !== undefined) filter.targetKind = targetKind;
  if (targetId !== undefined) filter.targetId = targetId;
  if (afterSeq !== undefined) filter.afterSeq = afterSeq;
  if (from !== undefined) filter.from = from;
  if (to !== undefined) filter.to = to;

  return { page, order, filter };
}

export function parseDecisionQuery(query: unknown): ListQuery<PolicyDecisionFilter> {
  const record = asRecord(query) ?? {};
  checkUnknown(record, DECISION_KEYS);
  const page = readPage(record);
  const order = parseOrder(record.order);

  const decision = parseText("decision", record.decision, (text) =>
    text === "allow" || text === "deny",
  );
  const action = parseText("action", record.action, (text) => isLength(text, 1, 128));
  const principal = parseText("principal", record.principal, (text) => isLength(text, 1, 512));
  const runId = parseText("run_id", record.run_id, (text) => isLength(text, 1, 128));
  const decisionId = parseText("decision_id", record.decision_id, (text) =>
    isLength(text, 1, 128),
  );
  const from = parseTime("from", record.from);
  const to = parseTime("to", record.to);
  checkTimeRange(from, to);

  const filter: PolicyDecisionFilter = {};
  if (decision !== undefined) filter.decision = decision as "allow" | "deny";
  if (action !== undefined) filter.action = action;
  if (principal !== undefined) filter.principal = principal;
  if (runId !== undefined) filter.runId = runId;
  if (decisionId !== undefined) filter.decisionId = decisionId;
  if (from !== undefined) filter.from = from;
  if (to !== undefined) filter.to = to;

  return { page, order, filter };
}

export function parseVerifyQuery(query: unknown): { fromSeq: bigint } {
  const record = asRecord(query) ?? {};
  checkUnknown(record, VERIFY_KEYS);
  const raw = record.from_seq;
  if (raw === undefined) return { fromSeq: 1n };
  if (typeof raw !== "string" || !FROM_SEQ_PATTERN.test(raw) || BigInt(raw) > MAX_BIGINT) {
    throw validationFailure("querystring/from_seq", INVALID_MESSAGE);
  }
  return { fromSeq: BigInt(raw) };
}
