// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EntityUid } from "./types.ts";

export const MAX_SLICE_ENTITIES: number = 24;
export const MAX_REQUEST_CHARS: number = 262144;
export const MAX_PERMIT_TTL_SECONDS: number = 3600;

export function formatUid(uid: EntityUid): string {
  if (
    uid === null ||
    typeof uid !== "object" ||
    typeof (uid as { type?: unknown }).type !== "string" ||
    typeof (uid as { id?: unknown }).id !== "string"
  ) {
    return "(invalid)";
  }
  return `${uid.type}::${JSON.stringify(uid.id)}`;
}

export function entityRef(type: string, id: string): { __entity: { type: string; id: string } } {
  return { __entity: { type, id } };
}

export function toDecimal(n: number): { __extn: { fn: "decimal"; arg: string } } {
  if (!Number.isFinite(n)) throw new RangeError(`not finite: ${n}`);
  const arg = n.toFixed(4);
  if (Number(arg) !== n) throw new RangeError(`decimal precision: ${n}`);
  return { __extn: { fn: "decimal", arg } };
}

export function hostOf(url: string): string {
  return new URL(url).hostname.toLowerCase();
}
