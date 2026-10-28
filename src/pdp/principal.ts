import { TENANT_ID_PATTERN } from "../tenancy/index.ts";
import { entityRef } from "./values.ts";
import type { Entity, EntityUid } from "./types.ts";

export interface PrincipalEntity {
  readonly tenantId: string;
  readonly userId: string;
  readonly kind: "human" | "service";
  readonly roles: readonly string[];
  readonly teams: readonly string[];
}

export const MAX_ROLES: number = 64;
export const MAX_TEAMS: number = 64;
export const MAX_NAME_LENGTH: number = 128;

const KINDS: readonly string[] = ["human", "service"];

function isName(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= MAX_NAME_LENGTH &&
    !value.includes("\u0000")
  );
}

function readNames(value: unknown): readonly string[] | undefined {
  try {
    if (typeof value === "string" || !Array.isArray(value)) return undefined;
    if (value.length > MAX_ROLES) return undefined;
    const names: string[] = [];
    for (const item of value) {
      if (!isName(item)) return undefined;
      names.push(item);
    }
    return names;
  } catch {
    return undefined;
  }
}

function uniqueSorted(names: readonly string[]): string[] {
  return [...new Set(names)].sort();
}

function uidOf(type: string, id: string): EntityUid {
  return { type, id };
}

export function isPrincipalEntity(value: unknown): value is PrincipalEntity {
  if (value === null || typeof value !== "object") return false;
  const p = value as PrincipalEntity;
  try {
    if (typeof p.tenantId !== "string" || !TENANT_ID_PATTERN.test(p.tenantId)) return false;
    if (!isName(p.userId)) return false;
    if (!KINDS.includes(p.kind)) return false;
    if (readNames(p.roles) === undefined) return false;
    if (readNames(p.teams) === undefined) return false;
    return true;
  } catch {
    return false;
  }
}

export function scopedId(tenantId: string, localId: string): string {
  return `${tenantId}/${localId}`;
}

export function userEntity(p: PrincipalEntity): Entity {
  const roles = uniqueSorted(p.roles);
  const teams = uniqueSorted(p.teams);
  const attrs = {
    tenant: p.tenantId,
    kind: p.kind,
    roles: roles.map((r) => entityRef("Role", r)),
    teams: teams.map((t) => entityRef("Team", scopedId(p.tenantId, t))),
  };
  const parents: EntityUid[] = [
    ...roles.map((r) => uidOf("Role", r)),
    ...teams.map((t) => uidOf("Team", scopedId(p.tenantId, t))),
  ];
  return {
    uid: { type: "User", id: scopedId(p.tenantId, p.userId) },
    attrs,
    parents,
  };
}

export function tenantEntity(tenantId: string): Entity {
  return {
    uid: { type: "Tenant", id: tenantId },
    attrs: { tenant: tenantId },
    parents: [],
  };
}
