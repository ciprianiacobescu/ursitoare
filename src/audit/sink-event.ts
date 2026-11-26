// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditEventInput } from "./event.ts";

export const SINK_ROLE: string = "";

export const SINK_REFUSAL_EVENT: string = "";

export type SinkEmitter = "broker" | "proxy";

export interface SinkEvent {
  event_type: string;
  tenant_id: string;
  actor_id?: string | null;
  actor_type: string;
  target_id?: string | null;
  target_type?: string | null;
  payload?: Record<string, unknown> | null;
}

export type SinkMapping =
  | { ok: true; event: AuditEventInput }
  | { ok: false; reason: "tenant_mismatch" | "event_type" | "payload" };

export function mapMintkeyEvent(
  _body: SinkEvent,
  _emitter: SinkEmitter,
  _mintkeyTenantUuid: string,
): SinkMapping {
  throw new Error("not implemented");
}

export function refusalEvent(
  _emitter: SinkEmitter,
  _reason: string,
  _eventType: unknown,
): AuditEventInput {
  throw new Error("not implemented");
}
