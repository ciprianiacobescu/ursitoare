import { cursorPageFetcher } from "../kit/data/page-fetcher.ts";
import type { FetchPage } from "../kit/data/cursor-list.ts";
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

export function parseVerification(_raw: unknown): Verification | null {
  throw new Error("not implemented");
}

export function verificationView(_state: VerificationState): VerificationView {
  throw new Error("not implemented");
}

export async function loadVerification(
  _client: Api<"get">,
  _signal?: AbortSignal,
): Promise<Verification> {
  throw new Error("not implemented");
}
