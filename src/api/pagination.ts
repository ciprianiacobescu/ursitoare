import { ApiError } from "./errors.ts";

import type { CursorKey, CursorPosition, CursorScope } from "./cursor.ts";
import { decodeCursor, encodeCursor } from "./cursor.ts";

const LIMIT_DEFAULT = 50;
const LIMIT_MIN = 1;
const LIMIT_MAX = 200;
const LIMIT_STRING_PATTERN = /^[0-9]{1,3}$/;
const LIMIT_MESSAGE = "must be an integer from 1 to 200";
const CURSOR_MAX_LENGTH = 1024;
const CURSOR_MESSAGE = "must be a string of 1 to 1024 characters";
const VALIDATION_STATUS = 400;
const VALIDATION_CODE = "VALIDATION_FAILED";
const VALIDATION_MESSAGE = "Request validation failed";

export const PAGE_QUERY_SCHEMA: Readonly<Record<string, unknown>> = {
  type: "object",
  properties: {
    limit: { type: "integer", minimum: LIMIT_MIN, maximum: LIMIT_MAX, default: LIMIT_DEFAULT },
    cursor: { type: "string", minLength: 1, maxLength: CURSOR_MAX_LENGTH },
  },
};

export interface Page<T> {
  items: T[];
  next_cursor: string | null;
}

export interface CursorBinding extends CursorScope {
  key: CursorKey;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : undefined;
}

function validationFailure(field: string, message: string): ApiError {
  return new ApiError(VALIDATION_STATUS, VALIDATION_CODE, VALIDATION_MESSAGE, {
    fields: [{ field, message }],
  });
}

function limitRangeError(): ApiError {
  return validationFailure("querystring/limit", LIMIT_MESSAGE);
}

function cursorRangeError(): ApiError {
  return validationFailure("querystring/cursor", CURSOR_MESSAGE);
}

export function readPage(query: unknown): { limit: number; cursor: string | null } {
  const record = asRecord(query);
  const rawLimit = record?.limit;
  let limit = LIMIT_DEFAULT;
  if (rawLimit !== undefined) {
    if (typeof rawLimit === "number") {
      if (!Number.isInteger(rawLimit) || rawLimit < LIMIT_MIN || rawLimit > LIMIT_MAX) throw limitRangeError();
      limit = rawLimit;
    } else if (typeof rawLimit === "string") {
      if (!LIMIT_STRING_PATTERN.test(rawLimit)) throw limitRangeError();
      const parsed = Number(rawLimit);
      if (!Number.isInteger(parsed) || parsed < LIMIT_MIN || parsed > LIMIT_MAX) throw limitRangeError();
      limit = parsed;
    } else {
      throw limitRangeError();
    }
  }

  const rawCursor = record?.cursor;
  let cursor: string | null = null;
  if (rawCursor !== undefined) {
    if (typeof rawCursor !== "string" || rawCursor.length < 1 || rawCursor.length > CURSOR_MAX_LENGTH) {
      throw cursorRangeError();
    }
    cursor = rawCursor;
  }

  return { limit, cursor };
}

export function startAfter(binding: CursorBinding, cursor: string | null): CursorPosition | null {
  if (cursor === null) return null;
  return decodeCursor(binding.key, cursor, { tenantId: binding.tenantId, scope: binding.scope });
}

function limitArgumentRangeError(): RangeError {
  return new RangeError("paginate limit must be an integer from 1 to 200");
}

export function paginate<T>(
  rows: readonly T[],
  opts: { limit: number; keyOf: (row: T) => CursorPosition; cursor: CursorBinding },
): Page<T> {
  if (!Number.isInteger(opts.limit) || opts.limit < LIMIT_MIN || opts.limit > LIMIT_MAX) {
    throw limitArgumentRangeError();
  }
  const items: T[] = rows.slice(0, opts.limit);
  if (rows.length > opts.limit) {
    const last = items[items.length - 1] as T;
    const next_cursor = encodeCursor(opts.cursor.key, {
      tenantId: opts.cursor.tenantId,
      scope: opts.cursor.scope,
      position: opts.keyOf(last),
    });
    return { items, next_cursor };
  }
  return { items, next_cursor: null };
}
