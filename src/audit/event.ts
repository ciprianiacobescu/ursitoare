// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { AuditOrigin, AuditRecord } from "./hash.ts";

export interface AuditEventInput {
  eventType: string;
  actor: { kind: "user" | "service" | "system"; id: string };
  target?: { kind: string; id: string };
  payload?: Record<string, unknown>;
  origin?: AuditOrigin;
  mk?: { traceId?: string; requestId?: string; jti?: string };
}

export type ValidatedEvent = Omit<AuditRecord, "tenantId" | "seq" | "at">;

export function validateEvent(_input: AuditEventInput): ValidatedEvent {
  throw new Error("not implemented");
}

export function isSecretKeyName(_key: string): boolean {
  throw new Error("not implemented");
}
