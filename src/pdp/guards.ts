import { isDeepStrictEqual } from "node:util";

import { validateEgress } from "./permit.ts";
import type { Egress, Entity, EntityUid, PolicyRequest } from "./types.ts";
import { MAX_REQUEST_CHARS, MAX_SLICE_ENTITIES } from "./values.ts";

const MAX_SNAPSHOT_DEPTH = 64;

interface RequestSnapshot {
  readonly principal: unknown;
  readonly action: unknown;
  readonly resource: unknown;
  readonly context: unknown;
  readonly entities: unknown;
  readonly egress: unknown;
  readonly hasEgress: boolean;
}

export type GuardResult =
  | { readonly ok: true; readonly request: PolicyRequest }
  | { readonly ok: false; readonly code: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!isRecord(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isUid(value: unknown): value is EntityUid {
  return (
    isRecord(value) &&
    typeof value["type"] === "string" &&
    typeof value["id"] === "string"
  );
}

function isUidArray(value: unknown): value is EntityUid[] {
  return Array.isArray(value) && value.every(isUid);
}

function isEntity(value: unknown): value is Entity {
  return (
    isRecord(value) &&
    isUid(value["uid"]) &&
    isPlainObject(value["attrs"]) &&
    isUidArray(value["parents"])
  );
}

function sameUid(left: EntityUid, right: EntityUid): boolean {
  return left.type === right.type && left.id === right.id;
}

function uidKey(uid: EntityUid): string {
  return `${uid.type}\u0000${uid.id}`;
}

function snapshotValue(value: unknown, depth: number, ancestors: Set<object>): unknown {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (depth > MAX_SNAPSHOT_DEPTH || ancestors.has(value)) {
    throw new TypeError("request value cannot be snapshotted");
  }
  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((entry) => snapshotValue(entry, depth + 1, ancestors));
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError("request value is not a plain object");
    }
    const record = value as Record<string, unknown>;
    const copy: Record<string, unknown> = {};
    for (const key of Object.keys(record)) {
      copy[key] = snapshotValue(record[key], depth + 1, ancestors);
    }
    return copy;
  } finally {
    ancestors.delete(value);
  }
}

function snapshotField(value: unknown): unknown {
  return snapshotValue(value, 1, new Set());
}

function snapshotRequest(req: unknown): RequestSnapshot | undefined {
  if (!isRecord(req)) {
    return undefined;
  }
  const egress = req["egress"];
  return {
    principal: snapshotField(req["principal"]),
    action: snapshotField(req["action"]),
    resource: snapshotField(req["resource"]),
    context: snapshotField(req["context"]),
    entities: snapshotField(req["entities"]),
    egress: snapshotField(egress),
    hasEgress: egress !== undefined,
  };
}

export function guardRequest(req: unknown, actions: readonly string[]): GuardResult {
  let first: RequestSnapshot | undefined;
  let second: RequestSnapshot | undefined;
  try {
    first = snapshotRequest(req);
    second = snapshotRequest(req);
  } catch {
    return { ok: false, code: "PDP_REQUEST_INVALID" };
  }

  if (first === undefined || second === undefined || !isDeepStrictEqual(first, second)) {
    return { ok: false, code: "PDP_REQUEST_INVALID" };
  }

  const { principal, action, resource, context, entities } = first;
  if (
    !isUid(principal) ||
    typeof action !== "string" ||
    !isUid(resource) ||
    !isPlainObject(context) ||
    !Array.isArray(entities) ||
    !entities.every(isEntity)
  ) {
    return { ok: false, code: "PDP_REQUEST_INVALID" };
  }

  if (entities.length > MAX_SLICE_ENTITIES) {
    return { ok: false, code: "PDP_SLICE_TOO_LARGE" };
  }

  let serialised: string | undefined;
  try {
    serialised = JSON.stringify({ context, entities });
  } catch {
    return { ok: false, code: "PDP_REQUEST_INVALID" };
  }
  if (serialised !== undefined && serialised.length > MAX_REQUEST_CHARS) {
    return { ok: false, code: "PDP_REQUEST_TOO_LARGE" };
  }

  if (!actions.includes(action)) {
    return { ok: false, code: "PDP_UNKNOWN_ACTION" };
  }

  const slice = entities as Entity[];
  if (!slice.some((entity) => sameUid(entity.uid, principal))) {
    return { ok: false, code: "PDP_ENTITY_MISSING" };
  }
  if (!slice.some((entity) => sameUid(entity.uid, resource))) {
    return { ok: false, code: "PDP_ENTITY_MISSING" };
  }

  const seen = new Set<string>();
  for (const entity of slice) {
    const key = uidKey(entity.uid);
    if (seen.has(key)) {
      return { ok: false, code: "PDP_REQUEST_INVALID" };
    }
    seen.add(key);
  }

  let egress: Egress | undefined;
  if (first.hasEgress) {
    if (!validateEgress(first.egress)) {
      return { ok: false, code: "PDP_REQUEST_INVALID" };
    }
    egress = first.egress;
  }

  return {
    ok: true,
    request: {
      principal,
      action,
      resource,
      context,
      entities: slice,
      ...(egress === undefined ? {} : { egress }),
    },
  };
}
