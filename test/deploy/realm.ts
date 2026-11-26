// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export const REALM_TEMPLATE_PATH: string = "";

export const KC_REALM_ENV: readonly string[] = [];

export const REALM_GROUPS: readonly string[] = [];

export const REALM_CLIENTS: readonly string[] = [];

export const REALM_BROWSER_FLOW: string = "";

export function readRealmTemplate(_path?: string): string {
  throw new Error("not implemented");
}

export function realmPlaceholders(_template: string): string[] {
  throw new Error("not implemented");
}

export function renderRealm(_template: string, _env: Readonly<Record<string, string>>): unknown {
  throw new Error("not implemented");
}

export function realmClaimProblems(_realm: unknown): string[] {
  throw new Error("not implemented");
}
