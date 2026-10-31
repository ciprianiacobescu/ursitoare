import { ApiRequestError } from "../api/client.ts";
import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
import { adminErrorMessage } from "./messages.ts";
import { clip } from "./shared.ts";
import type { Api, Check } from "./shared.ts";

export interface AuditEvent {
  seq: string;
  at: string;
  eventType: string;
  actor: { kind: string; id: string };
  target: { kind: string; id: string } | null;
  payload: Record<string, unknown>;
}

export interface AuditCells {
  seq: string;
  time: string;
  type: string;
  actor: string;
  target: string;
  details: string;
}

export interface Verification {
  ok: boolean;
  checked: number;
  firstBadSeq: string | null;
  reason: "hash" | "gap" | "anchor" | null;
  anchorsChecked: boolean;
  anchorsVerified: number;
  checkedAt: string;
}

export type VerificationState =
  | { status: "checking" }
  | { status: "done"; result: Verification }
  | { status: "failed"; error: unknown };

export interface VerificationView {
  tone: "checking" | "ok" | "broken" | "unavailable";
  headline: string;
  detail: string;
}

const SEQ_PATTERN = /^(0|[1-9][0-9]{0,18})$/;
const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
const AT_PATTERN = /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]{1,6})?Z$/;
const ACTOR_KINDS: readonly string[] = ["user", "service", "system"];
const MAX_DETAILS_LENGTH = 240;
const AUDIT_PATH = "/audit";
const FILTER_MESSAGE =
  "Event types are lower-case words separated by dots, for example identity.group_mapped.";
const DASH = "—";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === "string" && value.length >= 1;
}

function parseEndpoint(raw: unknown): { kind: string; id: string } | null {
  if (!isRecord(raw)) return null;
  const kind = raw["kind"];
  const id = raw["id"];
  if (!isText(kind) || !isText(id)) return null;
  return { kind, id };
}

function parsePayload(raw: unknown): Record<string, unknown> | null {
  if (!isRecord(raw)) return null;
  return { ...raw };
}

function timeOf(at: string): string {
  if (!AT_PATTERN.test(at)) return at;
  return `${at.slice(0, 19).replace("T", " ")} UTC`;
}

export function parseAuditEvent(raw: unknown): AuditEvent | null {
  if (!isRecord(raw)) return null;

  const seq = raw["seq"];
  if (typeof seq !== "string" || !SEQ_PATTERN.test(seq)) return null;

  const at = raw["at"];
  if (typeof at !== "string" || !AT_PATTERN.test(at)) return null;

  const eventType = raw["eventType"];
  if (typeof eventType !== "string" || !EVENT_TYPE_PATTERN.test(eventType)) return null;

  const actor = parseEndpoint(raw["actor"]);
  if (actor === null || !ACTOR_KINDS.includes(actor.kind)) return null;

  const rawTarget = raw["target"];
  if (rawTarget !== null && parseEndpoint(rawTarget) === null) return null;
  const target = rawTarget === null ? null : parseEndpoint(rawTarget);

  const payload = parsePayload(raw["payload"]);
  if (payload === null) return null;

  return { seq, at, eventType, actor, target, payload };
}

export function auditCells(e: AuditEvent): AuditCells {
  const details =
    Object.keys(e.payload).length === 0
      ? DASH
      : clip(JSON.stringify(e.payload), MAX_DETAILS_LENGTH);
  return {
    seq: clip(e.seq),
    time: clip(timeOf(e.at)),
    type: clip(e.eventType),
    actor: clip(`${e.actor.kind}: ${e.actor.id}`),
    target: e.target === null ? DASH : clip(`${e.target.kind}: ${e.target.id}`),
    details,
  };
}

export function parseEventTypeFilter(text: string): Check<string | null> {
  const trimmed = text.trim();
  if (trimmed.length === 0) return { ok: true, value: null };
  if (!EVENT_TYPE_PATTERN.test(trimmed)) return { ok: false, message: FILTER_MESSAGE };
  return { ok: true, value: trimmed };
}

export function auditFetcher(
  client: Api<"get">,
  eventType: string | null,
): FetchPage<AuditEvent> {
  return cursorPageFetcher(client, AUDIT_PATH, {
    parseItem: parseAuditEvent,
    ...(eventType === null ? {} : { query: { event_type: eventType } }),
  });
}

export function parseVerification(raw: unknown): Verification | null {
  if (!isRecord(raw)) return null;

  const checkedAt = raw["checkedAt"];
  if (typeof checkedAt !== "string" || !AT_PATTERN.test(checkedAt)) return null;

  const firstBadSeq = raw["firstBadSeq"];
  if (firstBadSeq !== null && (typeof firstBadSeq !== "string" || !SEQ_PATTERN.test(firstBadSeq))) {
    return null;
  }

  const ok = raw["ok"];
  if (typeof ok !== "boolean" || ok !== (firstBadSeq === null)) return null;

  const checked = raw["checked"];
  if (typeof checked !== "number" || !Number.isSafeInteger(checked) || checked < 0) return null;

  const anchorsVerified = raw["anchorsVerified"];
  if (
    typeof anchorsVerified !== "number" ||
    !Number.isSafeInteger(anchorsVerified) ||
    anchorsVerified < 0
  ) {
    return null;
  }

  const anchorsChecked = raw["anchorsChecked"];
  if (typeof anchorsChecked !== "boolean" || anchorsChecked !== (anchorsVerified > 0)) {
    return null;
  }

  const reason = raw["reason"];
  if (reason !== null && reason !== "hash" && reason !== "gap" && reason !== "anchor") {
    return null;
  }

  return { ok, checked, firstBadSeq, reason, anchorsChecked, anchorsVerified, checkedAt };
}

const REASON_TEXTS: Readonly<Record<string, string>> = {
  hash: "its hash does not match its content",
  gap: "an event is missing from the sequence",
  anchor: "a signed anchor does not match the chain",
};

export function verificationView(state: VerificationState): VerificationView {
  if (state.status === "checking") {
    return {
      tone: "checking",
      headline: "Checking the audit chain",
      detail: "This can take a moment for a long log.",
    };
  }
  if (state.status === "failed") {
    return {
      tone: "unavailable",
      headline: "Verification unavailable",
      detail: adminErrorMessage(state.error),
    };
  }
  const result = state.result;
  const time = timeOf(result.checkedAt);
  if (!result.ok) {
    const reasonText =
      result.reason === null ? undefined : REASON_TEXTS[result.reason];
    return {
      tone: "broken",
      headline: "Audit chain broken",
      detail: `The first problem is at event ${result.firstBadSeq}: ${reasonText ?? "the chain could not be read"}. Do not trust events from that number on until an operator has found the cause.`,
    };
  }
  if (result.checked === 0) {
    return {
      tone: "ok",
      headline: "Audit chain verified",
      detail: `No events to check yet. Checked at ${time}.`,
    };
  }
  const events = result.checked === 1 ? "1 event" : `${result.checked} events`;
  if (result.anchorsVerified > 0) {
    const anchors =
      result.anchorsVerified === 1
        ? "1 signed head anchor"
        : `${result.anchorsVerified} signed head anchors`;
    return {
      tone: "ok",
      headline: "Audit chain verified",
      detail: `${events} checked, ${anchors} matched. Checked at ${time}.`,
    };
  }
  return {
    tone: "ok",
    headline: "Audit chain verified",
    detail: `${events} checked. No signed head anchor exists yet, so only the hash chain was checked. Checked at ${time}.`,
  };
}

const VERIFY_PATH = "/audit/verify";

export async function loadVerification(
  client: Api<"get">,
  signal?: AbortSignal,
): Promise<Verification> {
  const answer = await client.get<unknown>(VERIFY_PATH, signal === undefined ? {} : { signal });
  const verification = parseVerification(answer);
  if (verification === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid verification");
  }
  return verification;
}
