import type { Entity, EntityUid } from "./types.ts";
import { MAX_REQUEST_CHARS, MAX_SLICE_ENTITIES } from "./values.ts";

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

export function guardRequest(req: unknown, actions: readonly string[]): string | undefined {
  let principal: unknown;
  let action: unknown;
  let resource: unknown;
  let context: unknown;
  let entities: unknown;

  try {
    if (!isRecord(req)) {
      return "PDP_REQUEST_INVALID";
    }
    principal = req["principal"];
    action = req["action"];
    resource = req["resource"];
    context = req["context"];
    entities = req["entities"];
  } catch {
    return "PDP_REQUEST_INVALID";
  }

  if (
    !isUid(principal) ||
    typeof action !== "string" ||
    !isUid(resource) ||
    !isPlainObject(context) ||
    !Array.isArray(entities) ||
    !entities.every(isEntity)
  ) {
    return "PDP_REQUEST_INVALID";
  }

  if (entities.length > MAX_SLICE_ENTITIES) {
    return "PDP_SLICE_TOO_LARGE";
  }

  let serialised: string | undefined;
  try {
    serialised = JSON.stringify({ context, entities });
  } catch {
    return "PDP_REQUEST_INVALID";
  }
  if (serialised !== undefined && serialised.length > MAX_REQUEST_CHARS) {
    return "PDP_REQUEST_TOO_LARGE";
  }

  if (!actions.includes(action)) {
    return "PDP_UNKNOWN_ACTION";
  }

  const slice = entities as Entity[];
  if (!slice.some((entity) => sameUid(entity.uid, principal as EntityUid))) {
    return "PDP_ENTITY_MISSING";
  }
  if (!slice.some((entity) => sameUid(entity.uid, resource as EntityUid))) {
    return "PDP_ENTITY_MISSING";
  }

  const seen = new Set<string>();
  for (const entity of slice) {
    const key = uidKey(entity.uid);
    if (seen.has(key)) {
      return "PDP_REQUEST_INVALID";
    }
    seen.add(key);
  }

  return undefined;
}
