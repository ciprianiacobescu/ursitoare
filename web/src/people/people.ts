// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";
import { createApiClient } from "../api/client.ts";

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

interface Batch {
  readonly ids: readonly string[];
  promise: Promise<void>;
}

type Unit = { readonly kind: "known"; readonly id: string } | { readonly kind: "batch"; readonly batch: Batch };

function abortError(): Error {
  return new DOMException("aborted", "AbortError");
}

export function createNameCache(api: Api<"get">, maxBatch = 50): NameCache {
  const names = new Map<string, string>();
  const misses = new Set<string>();
  const inFlight = new Map<string, Batch>();

  function isKnown(id: string): boolean {
    return names.has(id) || misses.has(id);
  }

  function removeBatch(batch: Batch): void {
    for (const id of batch.ids) {
      if (inFlight.get(id) === batch) inFlight.delete(id);
    }
  }

  function startBatch(ids: readonly string[], signal?: AbortSignal): Batch {
    const batch: Batch = { ids, promise: Promise.resolve() };
    for (const id of ids) inFlight.set(id, batch);
    batch.promise = (async () => {
      try {
        const query = { ids: ids.join(",") };
        const opts = signal === undefined ? { query } : { query, signal };
        const raw = await api.get<unknown>("/people", opts);
        const parsed = parsePeople(raw);
        if (parsed === null) throw new Error("malformed people response");
        if (signal?.aborted === true) throw abortError();
        const wanted = new Set(ids);
        const answered = new Set<string>();
        for (const person of parsed) {
          if (!wanted.has(person.userId)) continue;
          names.set(person.userId, person.displayName);
          answered.add(person.userId);
        }
        for (const id of ids) {
          if (!answered.has(id)) misses.add(id);
        }
      } catch (error) {
        removeBatch(batch);
        if (isAbortError(error)) throw error;
        return;
      }
      removeBatch(batch);
    })();
    return batch;
  }

  async function resolve(
    userIds: readonly string[],
    signal?: AbortSignal,
  ): Promise<ReadonlyMap<string, string>> {
    if (signal?.aborted === true) throw abortError();

    const requested: string[] = [];
    const requestedSet = new Set<string>();
    for (const id of userIds) {
      if (!USER_ID_PATTERN.test(id)) continue;
      if (requestedSet.has(id)) continue;
      requestedSet.add(id);
      requested.push(id);
    }

    const units: Unit[] = [];
    const attached = new Set<Batch>();
    let pending: string[] = [];

    const flush = (): void => {
      if (pending.length === 0) return;
      const ids = pending;
      pending = [];
      const batch = startBatch(ids, signal);
      attached.add(batch);
      units.push({ kind: "batch", batch });
    };

    for (const id of requested) {
      if (isKnown(id)) {
        units.push({ kind: "known", id });
        continue;
      }
      const existing = inFlight.get(id);
      if (existing !== undefined) {
        if (!attached.has(existing)) {
          flush();
          attached.add(existing);
          units.push({ kind: "batch", batch: existing });
        }
        continue;
      }
      pending.push(id);
      if (pending.length >= maxBatch) flush();
    }
    flush();

    const batches = units
      .filter((unit): unit is { readonly kind: "batch"; readonly batch: Batch } => unit.kind === "batch")
      .map((unit) => unit.batch);
    await Promise.all(batches.map((batch) => batch.promise));

    const result = new Map<string, string>();
    for (const unit of units) {
      if (unit.kind === "known") {
        const name = names.get(unit.id);
        if (name !== undefined) result.set(unit.id, name);
        continue;
      }
      for (const id of unit.batch.ids) {
        if (!requestedSet.has(id)) continue;
        const name = names.get(id);
        if (name !== undefined) result.set(id, name);
      }
    }
    return result;
  }

  return {
    resolve,
    peek(userId: string): string | undefined {
      return names.get(userId);
    },
  };
}

export const nameCache: NameCache = createNameCache(createApiClient());

export async function loadMyTeams(api: Api<"get">, signal?: AbortSignal): Promise<string[]> {
  try {
    const raw = await api.get<unknown>("/me/teams", signal === undefined ? undefined : { signal });
    return parseMyTeams(raw) ?? [];
  } catch (error) {
    if (isAbortError(error)) throw error;
    return [];
  }
}
