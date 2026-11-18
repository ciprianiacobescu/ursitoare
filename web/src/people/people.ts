// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Api } from "../admin/shared.ts";

export interface PersonName {
  userId: string;
  displayName: string;
  kind: "human" | "service";
}

export function parsePeople(_raw: unknown): PersonName[] | null {
  throw new Error("not implemented");
}

export function parseMyTeams(_raw: unknown): string[] | null {
  throw new Error("not implemented");
}

export function personLabel(_names: ReadonlyMap<string, string>, _userId: string): string {
  throw new Error("not implemented");
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

export function loadMyTeams(_api: Api<"get">, _signal?: AbortSignal): Promise<string[]> {
  throw new Error("not implemented");
}
