// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Entity } from "./types.ts";

export interface PrincipalEntity {
  readonly tenantId: string;
  readonly userId: string;
  readonly kind: "human" | "service";
  readonly roles: readonly string[];
  readonly teams: readonly string[];
}

export function isPrincipalEntity(_value: unknown): _value is PrincipalEntity {
  throw new Error("not implemented");
}

export function scopedId(_tenantId: string, _localId: string): string {
  throw new Error("not implemented");
}

export function userEntity(_p: PrincipalEntity): Entity {
  throw new Error("not implemented");
}

export function tenantEntity(_tenantId: string): Entity {
  throw new Error("not implemented");
}
