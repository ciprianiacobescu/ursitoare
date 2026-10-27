// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EntityUid } from "./types.ts";

export const MAX_SLICE_ENTITIES: number = 0;
export const MAX_REQUEST_CHARS: number = 0;
export const MAX_PERMIT_TTL_SECONDS: number = 0;

export function formatUid(_uid: EntityUid): string {
  throw new Error("not implemented");
}

export function entityRef(_type: string, _id: string): { __entity: { type: string; id: string } } {
  throw new Error("not implemented");
}

export function toDecimal(_n: number): { __extn: { fn: "decimal"; arg: string } } {
  throw new Error("not implemented");
}

export function hostOf(_url: string): string {
  throw new Error("not implemented");
}
