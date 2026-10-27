import { canonicalize } from "./canonical.ts";
import { AuditError } from "./errors.ts";
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

const EVENT_TYPE_PATTERN = /^[a-z][a-z0-9_.]{0,63}$/;
const MK_FIELD_PATTERN = /^[\x21-\x7e]{1,200}$/;
const MAX_PAYLOAD_BYTES = 32_768;
const SECRET_MESSAGE = "payload key is named like a secret";
const INVALID_MESSAGE = "audit event is invalid";

const INPUT_KEYS = new Set(["eventType", "actor", "target", "payload", "origin", "mk"]);
const ACTOR_KINDS = new Set(["user", "service", "system"]);
const MK_KEYS = new Set(["traceId", "requestId", "jti"]);
const SECRET_PARTS = ["password", "secret", "token", "apikey", "credential"];

function invalid(reason: string): AuditError {
  return new AuditError("AUDIT_EVENT_INVALID", INVALID_MESSAGE, { reason });
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const proto = Object.getPrototypeOf(value) as object | null;
  return proto === Object.prototype || proto === null;
}

function hasControlCharacter(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code <= 0x1f || code === 0x7f) {
      return true;
    }
  }
  return false;
}

function isIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 200 &&
    value.isWellFormed() &&
    !hasControlCharacter(value)
  );
}

function secretDepth(value: unknown, depth: number): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = secretDepth(item, depth + 1);
      if (found !== null) {
        return found;
      }
    }
    return null;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) {
      if (isSecretKeyName(key)) {
        return depth;
      }
      const found = secretDepth(item, depth + 1);
      if (found !== null) {
        return found;
      }
    }
  }
  return null;
}

export function validateEvent(input: AuditEventInput): ValidatedEvent {
  if (!isPlainObject(input)) {
    throw invalid("bad_event_type");
  }
  const record = input as unknown as Record<string, unknown>;

  for (const key of Object.keys(record)) {
    if (!INPUT_KEYS.has(key)) {
      throw invalid("unknown_property");
    }
  }

  const eventType = record.eventType;
  if (typeof eventType !== "string" || !EVENT_TYPE_PATTERN.test(eventType)) {
    throw invalid("bad_event_type");
  }

  const actorValue = record.actor;
  if (!isPlainObject(actorValue)) {
    throw invalid("bad_actor");
  }
  const actor = actorValue;
  if (Object.keys(actor).length !== 2 || !("kind" in actor) || !("id" in actor)) {
    throw invalid("bad_actor");
  }
  const actorKind = actor.kind;
  if (typeof actorKind !== "string" || !ACTOR_KINDS.has(actorKind)) {
    throw invalid("bad_actor");
  }
  if (!isIdentifier(actor.id)) {
    throw invalid("bad_actor");
  }

  const targetValue = record.target;
  let target: { kind: string; id: string } | null = null;
  if (targetValue !== undefined) {
    if (!isPlainObject(targetValue)) {
      throw invalid("bad_target");
    }
    if (Object.keys(targetValue).length !== 2 || !("kind" in targetValue) || !("id" in targetValue)) {
      throw invalid("bad_target");
    }
    const targetKind = targetValue.kind;
    if (typeof targetKind !== "string" || !EVENT_TYPE_PATTERN.test(targetKind)) {
      throw invalid("bad_target");
    }
    if (!isIdentifier(targetValue.id)) {
      throw invalid("bad_target");
    }
    target = { kind: targetKind, id: targetValue.id };
  }

  const payloadValue = record.payload;
  if (payloadValue !== undefined && !isPlainObject(payloadValue)) {
    throw invalid("bad_payload");
  }
  const payload = payloadValue === undefined ? {} : payloadValue;

  const originValue = record.origin;
  let origin: AuditOrigin = "ursitoare";
  if (originValue !== undefined) {
    if (originValue !== "ursitoare" && originValue !== "mintkey") {
      throw invalid("bad_origin");
    }
    origin = originValue;
  }

  let mkTraceId: string | null = null;
  let mkRequestId: string | null = null;
  let mkJti: string | null = null;
  const mkValue = record.mk;
  if (mkValue !== undefined) {
    if (origin !== "mintkey") {
      throw invalid("mk_without_mintkey");
    }
    if (!isPlainObject(mkValue)) {
      throw invalid("bad_mk");
    }
    for (const key of Object.keys(mkValue)) {
      if (!MK_KEYS.has(key)) {
        throw invalid("bad_mk");
      }
    }
    for (const key of ["traceId", "requestId", "jti"] as const) {
      const value = mkValue[key];
      if (value !== undefined && (typeof value !== "string" || !MK_FIELD_PATTERN.test(value))) {
        throw invalid("bad_mk");
      }
    }
    mkTraceId = typeof mkValue.traceId === "string" ? mkValue.traceId : null;
    mkRequestId = typeof mkValue.requestId === "string" ? mkValue.requestId : null;
    mkJti = typeof mkValue.jti === "string" ? mkValue.jti : null;
  }

  const canonicalPayload = canonicalize(payload);
  if (Buffer.byteLength(canonicalPayload, "utf8") > MAX_PAYLOAD_BYTES) {
    throw invalid("payload_too_large");
  }
  const parsedPayload = JSON.parse(canonicalPayload) as unknown;
  const depth = secretDepth(parsedPayload, 1);
  if (depth !== null) {
    throw new AuditError("AUDIT_PAYLOAD_SECRET", SECRET_MESSAGE, { depth });
  }

  return {
    eventType,
    actor: { kind: actorKind, id: actor.id },
    target,
    payload: parsedPayload,
    origin,
    mkTraceId,
    mkRequestId,
    mkJti,
  };
}

export function isSecretKeyName(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SECRET_PARTS.some((part) => normalized.includes(part));
}
