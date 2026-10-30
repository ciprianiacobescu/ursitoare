// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { FetchPage } from "../kit/data/cursor-list.ts";
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

export function parseAuditEvent(_raw: unknown): AuditEvent | null {
  throw new Error("not implemented");
}

export function auditCells(_e: AuditEvent): AuditCells {
  throw new Error("not implemented");
}

export function parseEventTypeFilter(_text: string): Check<string | null> {
  throw new Error("not implemented");
}

export function auditFetcher(_client: Api<"get">, _eventType: string | null): FetchPage<AuditEvent> {
  throw new Error("not implemented");
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
