// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CursorKey, CursorPosition } from "./cursor.ts";
import type { Page } from "./pagination.ts";

export interface PageBinding {
  key: CursorKey | null;
  tenantId: string;
  scope: string;
}

export function pageRows<T>(
  _rows: readonly T[],
  _page: { limit: number; cursor: string | null },
  _binding: PageBinding,
  _keyOf: (row: T) => CursorPosition,
): Page<T> {
  throw new Error("not implemented");
}
