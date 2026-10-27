// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CursorKey, CursorPosition, CursorScope } from "./cursor.ts";

export const PAGE_QUERY_SCHEMA: Readonly<Record<string, unknown>> = {};

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface CursorBinding extends CursorScope {
  key: CursorKey;
}

export function readPage(_query: unknown): { limit: number; cursor: string | null } {
  throw new Error("not implemented");
}

export function startAfter(_binding: CursorBinding, _cursor: string | null): CursorPosition | null {
  throw new Error("not implemented");
}

export function paginate<T>(
  _rows: readonly T[],
  _opts: { limit: number; keyOf: (row: T) => CursorPosition; cursor: CursorBinding },
): Page<T> {
  throw new Error("not implemented");
}
