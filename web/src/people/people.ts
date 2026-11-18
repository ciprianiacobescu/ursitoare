// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

const USER_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;
const TEAM_ID_PATTERN = /^[a-z][a-z0-9_-]{0,63}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

export interface PersonName {
  userId: string;
  displayName: string;
  kind: "human" | "service";
}

export function parsePeople(raw: unknown): PersonName[] | null {
  if (!isRecord(raw)) return null;
  const items = raw["items"];
  if (!Array.isArray(items)) return null;
  const people: PersonName[] = [];
  for (const item of items) {
    if (!isRecord(item)) return null;
    const userId = item["userId"];
    const displayName = item["displayName"];
    const kind = item["kind"];
    if (typeof userId !== "string" || !USER_ID_PATTERN.test(userId)) return null;
    if (typeof displayName !== "string" || displayName.length === 0) return null;
    if (kind !== "human" && kind !== "service") return null;
    people.push({ userId, displayName, kind });
  }
  return people;
}

export function parseMyTeams(raw: unknown): string[] | null {
  if (!isRecord(raw)) return null;
  const items = raw["items"];
  if (!Array.isArray(items)) return null;
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!isRecord(item)) return null;
    const id = item["id"];
    if (typeof id !== "string" || !TEAM_ID_PATTERN.test(id)) return null;
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

export function personLabel(names: ReadonlyMap<string, string>, userId: string): string {
  const name = names.get(userId);
  if (name === undefined) return userId;
  const trimmed = name.trim();
  return trimmed === "" ? userId : trimmed;
}

export interface NameCache {
  resolve(userIds: readonly string[], signal?: AbortSignal): Promise<ReadonlyMap<string, string>>;
  peek(userId: string): string | undefined;
}

export function createNameCache(_api: Api<"get">, _maxBatch?: number): NameCache {
  throw new Error("not implemented");
}

export const nameCache: NameCache = {
  resolve(_userIds: readonly string[], _signal?: AbortSignal): Promise<ReadonlyMap<string, string>> {
    throw new Error("not implemented");
  },
  peek(_userId: string): string | undefined {
    throw new Error("not implemented");
  },
};

export async function loadMyTeams(api: Api<"get">, signal?: AbortSignal): Promise<string[]> {
  try {
    const raw = await api.get<unknown>("/me/teams", signal === undefined ? undefined : { signal });
    return parseMyTeams(raw) ?? [];
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}
