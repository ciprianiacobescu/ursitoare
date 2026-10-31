import { ApiError } from "./errors.ts";

import type { CursorKey, CursorPosition } from "./cursor.ts";
import { paginate, startAfter } from "./pagination.ts";
import type { Page } from "./pagination.ts";

export interface PageBinding {
  key: CursorKey | null;
  tenantId: string;
  scope: string;
}

const CURSOR_INVALID_STATUS = 400;
const CURSOR_INVALID_CODE = "CURSOR_INVALID";
const CURSOR_INVALID_MESSAGE = "Cursor is invalid";
const ENGINE_KEY_REQUIRED_STATUS = 503;
const ENGINE_KEY_REQUIRED_CODE = "ENGINE_KEY_REQUIRED";
const ENGINE_KEY_REQUIRED_MESSAGE = "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)";

interface KeyedRow<T> {
  row: T;
  position: CursorPosition;
}

function cursorInvalid(): ApiError {
  return new ApiError(CURSOR_INVALID_STATUS, CURSOR_INVALID_CODE, CURSOR_INVALID_MESSAGE);
}

function engineKeyRequired(): ApiError {
  return new ApiError(
    ENGINE_KEY_REQUIRED_STATUS,
    ENGINE_KEY_REQUIRED_CODE,
    ENGINE_KEY_REQUIRED_MESSAGE,
  );
}

function compareEntries(left: string | number, right: string | number): number {
  if (typeof left === "number" && typeof right === "number") {
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  }
  const leftText = typeof left === "string" ? left : String(left);
  const rightText = typeof right === "string" ? right : String(right);
  if (leftText < rightText) return -1;
  if (leftText > rightText) return 1;
  return 0;
}

function comparePositions(left: CursorPosition, right: CursorPosition): number {
  const shared = Math.min(left.length, right.length);
  for (let index = 0; index < shared; index += 1) {
    const compared = compareEntries(left[index] as string | number, right[index] as string | number);
    if (compared !== 0) return compared;
  }
  return left.length - right.length;
}

function sortedRows<T>(rows: readonly T[], keyOf: (row: T) => CursorPosition): T[] {
  const keyed: KeyedRow<T>[] = rows.map((row) => ({ row, position: keyOf(row) }));
  keyed.sort((left, right) => comparePositions(left.position, right.position));
  return keyed.map((entry) => entry.row);
}

export function pageRows<T>(
  rows: readonly T[],
  page: { limit: number; cursor: string | null },
  binding: PageBinding,
  keyOf: (row: T) => CursorPosition,
): Page<T> {
  if (binding.key === null) {
    if (page.cursor !== null) throw engineKeyRequired();
    if (rows.length > page.limit) throw engineKeyRequired();
    return { items: sortedRows(rows, keyOf), next_cursor: null };
  }

  const cursor = { key: binding.key, tenantId: binding.tenantId, scope: binding.scope };
  const position = startAfter(cursor, page.cursor);
  const keyed: KeyedRow<T>[] = rows.map((row) => ({ row, position: keyOf(row) }));

  if (position !== null && keyed.length > 0) {
    const expected = (keyed[0] as KeyedRow<T>).position.length;
    if (position.length !== expected) throw cursorInvalid();
  }

  keyed.sort((left, right) => comparePositions(left.position, right.position));

  let start = 0;
  if (position !== null) {
    const found = keyed.findIndex((entry) => comparePositions(entry.position, position) > 0);
    start = found === -1 ? keyed.length : found;
  }

  const rest = keyed.slice(start).map((entry) => entry.row);
  return paginate(rest, { limit: page.limit, keyOf, cursor });
}
