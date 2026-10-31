import assert from "node:assert/strict";
import { test } from "node:test";

import type { CursorKey, CursorPosition } from "./cursor.ts";
import { deriveCursorKey, encodeCursor } from "./cursor.ts";
import { ApiError } from "./errors.ts";
import type { PageBinding } from "./admin-page.ts";
import { pageRows } from "./admin-page.ts";
import type { Page } from "./pagination.ts";

assert.equal(typeof pageRows, "function");

const ENGINE_TEXT = "k".repeat(64);

function cursorKey(): CursorKey {
  let key: unknown;
  assert.doesNotThrow(() => {
    key = deriveCursorKey({ reveal: () => ENGINE_TEXT });
  }, "deriveCursorKey over the test engine key");
  return key as CursorKey;
}

function bindingOf(
  tenantId = "tenant_a",
  scope = "teams",
  key: CursorKey | null = cursorKey(),
): PageBinding {
  return { key, tenantId, scope };
}

function pageOf<T>(
  rows: readonly T[],
  page: { limit: number; cursor: string | null },
  binding: PageBinding,
  keyOf: (row: T) => CursorPosition,
): Page<T> {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = pageRows(rows, page, binding, keyOf);
  }, "pageRows over the rows");
  return result as Page<T>;
}

function encoded(key: CursorKey, tenantId: string, scope: string, position: CursorPosition): string {
  let cursor: unknown;
  assert.doesNotThrow(() => {
    cursor = encodeCursor(key, { tenantId, scope, position });
  }, "encodeCursor of the test cursor");
  return cursor as string;
}

function assertApiError(call: () => unknown, status: number, code: string): void {
  assert.throws(
    call,
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, status, "the refusal carries the expected status");
      assert.equal(error.code, code, "the refusal carries the expected code");
      return true;
    },
    `the call is refused with ${String(status)} ${code}`,
  );
}

test("C-5995b318 pageRows cuts a whole list into ordered pages under cursors", () => {
  const rows = ["b", "d", "a", "c", "e"];
  const binding = bindingOf("tenant_a", "teams");
  const keyOf = (row: string) => [row];

  const first = pageOf(rows, { limit: 2, cursor: null }, binding, keyOf);
  assert.deepEqual(first.items, ["a", "b"], "the first page holds the two smallest rows");
  assert.ok(first.next_cursor !== null, "the first page sets next_cursor");

  const second = pageOf(rows, { limit: 2, cursor: first.next_cursor }, binding, keyOf);
  assert.deepEqual(second.items, ["c", "d"], "the second page continues after the cursor");
  assert.ok(second.next_cursor !== null, "the second page sets next_cursor");

  const third = pageOf(rows, { limit: 2, cursor: second.next_cursor }, binding, keyOf);
  assert.deepEqual(third.items, ["e"], "the third page holds the remaining row");
  assert.equal(third.next_cursor, null, "the last page has no next_cursor");

  assert.deepEqual(
    pageOf([], { limit: 2, cursor: null }, binding, keyOf),
    { items: [], next_cursor: null },
    "no rows answer an empty page",
  );

  const key = cursorKey();
  const foreignTenant = encoded(key, "tenant_b", "teams", ["a"]);
  assertApiError(
    () => pageRows(rows, { limit: 2, cursor: foreignTenant }, binding, keyOf),
    400,
    "CURSOR_INVALID",
  );

  const foreignScope = encoded(key, "tenant_a", "roles", ["a"]);
  assertApiError(
    () => pageRows(rows, { limit: 2, cursor: foreignScope }, binding, keyOf),
    400,
    "CURSOR_INVALID",
  );
});

test("C-5995b318 pageRows refuses a cursor position of another length", () => {
  const binding = bindingOf("tenant_a", "teams");
  const key = cursorKey();
  const wrongLength = encoded(key, "tenant_a", "teams", ["a", "b"]);

  assertApiError(
    () => pageRows(["a", "b"], { limit: 2, cursor: wrongLength }, binding, (row: string) => [row]),
    400,
    "CURSOR_INVALID",
  );
});

test("C-4c8964eb pageRows without an engine key serves one page and refuses a cursor", () => {
  const binding = bindingOf("tenant_a", "teams", null);
  const keyOf = (row: string) => [row];

  const onePage = pageOf(["a", "b"], { limit: 5, cursor: null }, binding, keyOf);
  assert.deepEqual(onePage, { items: ["a", "b"], next_cursor: null }, "the rows fit one page");

  assertApiError(
    () => pageRows(["a", "b"], { limit: 5, cursor: "x" }, binding, keyOf),
    503,
    "ENGINE_KEY_REQUIRED",
  );

  assertApiError(
    () => pageRows(["a", "b", "c"], { limit: 2, cursor: null }, binding, keyOf),
    503,
    "ENGINE_KEY_REQUIRED",
  );
});
