// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type pg from "pg";

export const ROLE_OWNER: string = "";

export const ROLE_APP: string = "";

export function ensureRoles(
  _adminPool: pg.Pool,
  _passwords?: { ownerPassword?: string | { reveal(): string }; appPassword?: string | { reveal(): string } },
): Promise<{ created: string[] }> {
  throw new Error("not implemented");
}
