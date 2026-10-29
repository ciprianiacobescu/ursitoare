import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiError } from "./errors.ts";
import { decodeCursor, deriveCursorKey, encodeCursor } from "./cursor.ts";
import type { CursorKey, CursorPosition, CursorScope } from "./cursor.ts";
import { paginate, startAfter } from "./pagination.ts";
import type { CursorBinding } from "./pagination.ts";

assert.equal(typeof paginate, "function");
assert.equal(typeof startAfter, "function");

const ENGINE_TEXT = "k".repeat(64);
const SCOPE = "flows";

interface Row {
  id: string;
}

function keyOf(): CursorKey {
  let key: unknown;
  assert.doesNotThrow(() => {
    key = deriveCursorKey({ reveal: () => ENGINE_TEXT });
  }, "deriveCursorKey over the test engine key");
  return key as CursorKey;
}

function bindingOf(tenantId: string): CursorBinding {
  return { tenantId, scope: SCOPE, key: keyOf() };
}

function paginateOf<T>(
  rows: readonly T[],
  opts: { limit: number; keyOf: (row: T) => CursorPosition; cursor: CursorBinding },
): {
  items: T[];
  next_cursor: string | null;
} {
  let page: unknown;
  assert.doesNotThrow(() => {
    page = paginate(rows, opts);
  }, "paginate over the rows");
  return page as { items: T[]; next_cursor: string | null };
}

function startAfterOf(binding: CursorBinding, cursor: string | null): CursorPosition | null {
  let position: unknown;
  assert.doesNotThrow(() => {
    position = startAfter(binding, cursor);
  }, "startAfter of the cursor");
  return position as CursorPosition | null;
}

test("C-d23cc66e paginate answers items and next_cursor when rows exceed the limit", () => {
  const rows: Row[] = [
    { id: "r1" },
    { id: "r2" },
    { id: "r3" },
    { id: "r4" },
    { id: "r5" },
  ];
  const bindingA = bindingOf("tenant_a");
  const page = paginateOf(rows, { limit: 3, keyOf: (row: Row) => [row.id], cursor: bindingA });
  assert.deepEqual(
    page.items,
    [{ id: "r1" }, { id: "r2" }, { id: "r3" }],
    "paginate answers the first limit rows",
  );
  assert.ok(page.next_cursor !== null, "paginate sets next_cursor while more rows exist");
  const expect: CursorScope = { tenantId: "tenant_a", scope: SCOPE };
  let decoded: unknown;
  assert.doesNotThrow(() => {
    decoded = decodeCursor(bindingA.key, page.next_cursor as string, expect);
  }, "decodeCursor of the next_cursor under the same tenant and scope");
  assert.deepEqual(decoded, ["r3"], "the next_cursor carries the key of the last returned item");

  const after = startAfterOf(bindingA, page.next_cursor);
  assert.deepEqual(after, ["r3"], "startAfter turns the next_cursor into the position to continue from");
});

test("C-8d062a2a a full walk of seven rows, a full page and an empty list", () => {
  const rows: Row[] = [
    { id: "r1" },
    { id: "r2" },
    { id: "r3" },
    { id: "r4" },
    { id: "r5" },
    { id: "r6" },
    { id: "r7" },
  ];
  const binding = bindingOf("tenant_a");
  const keyOfRow = (row: Row) => [row.id];

  let cursor: string | null = null;
  const sizes: number[] = [];
  const cursors: (string | null)[] = [];
  const seen: string[] = [];
  for (let round = 0; round < 5; round += 1) {
    const position = startAfterOf(binding, cursor);
    const start =
      position === null ? 0 : (rows.findIndex((row) => row.id === position[0]) + 1);
    const page = paginateOf(rows.slice(start), { limit: 3, keyOf: keyOfRow, cursor: binding });
    sizes.push(page.items.length);
    cursors.push(page.next_cursor);
    for (const item of page.items) seen.push(item.id);
    if (page.next_cursor === null) break;
    cursor = page.next_cursor;
  }

  assert.deepEqual(sizes, [3, 3, 1], "the walk holds pages of three, three and one item");
  assert.ok(cursors[0] !== null && cursors[1] !== null, "the first two pages set next_cursor");
  assert.ok(cursors[2] === null, "the last page has no next_cursor");
  assert.deepEqual(
    seen,
    ["r1", "r2", "r3", "r4", "r5", "r6", "r7"],
    "the walk answers every row once",
  );

  const full = paginateOf(rows.slice(0, 3), { limit: 3, keyOf: keyOfRow, cursor: binding });
  assert.equal(full.next_cursor, null, "exactly limit rows answer no next_cursor");

  const empty = paginateOf([], { limit: 3, keyOf: keyOfRow, cursor: binding });
  assert.deepEqual(empty, { items: [], next_cursor: null }, "no rows answer an empty page");
});

test("C-65f1b9ae a bad limit and a foreign cursor are refused", () => {
  const bindingA = bindingOf("tenant_a");
  const rows: Row[] = [{ id: "r1" }, { id: "r2" }];

  for (const limit of [0, 201, 1.5]) {
    assert.throws(
      () => {
        paginate(rows, { limit, keyOf: (row: Row) => [row.id], cursor: bindingA });
      },
      (error: unknown) => {
        if (!(error instanceof RangeError)) return false;
        return true;
      },
      `paginate refuses the limit ${String(limit)} with a RangeError`,
    );
  }

  assert.equal(startAfterOf(bindingA, null), null, "a null cursor starts from the beginning");

  assert.throws(
    () => {
      startAfter(bindingA, "junk");
    },
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, 400, "startAfter refuses junk with 400");
      assert.equal(error.code, "CURSOR_INVALID", "startAfter refuses junk with CURSOR_INVALID");
      return true;
    },
    "startAfter refuses a junk cursor",
  );

  const key = keyOf();
  let foreign: unknown;
  assert.doesNotThrow(() => {
    foreign = encodeCursor(key, { tenantId: "tenant_b", scope: SCOPE, position: ["r2"] });
  }, "encoding a cursor for tenant B");
  const bindingForA: CursorBinding = { tenantId: "tenant_a", scope: SCOPE, key };

  assert.throws(
    () => {
      startAfter(bindingForA, foreign as string);
    },
    (error: unknown) => {
      if (!(error instanceof ApiError)) return false;
      assert.equal(error.status, 400, "startAfter refuses the foreign cursor with 400");
      assert.equal(
        error.code,
        "CURSOR_INVALID",
        "startAfter refuses the foreign cursor with CURSOR_INVALID",
      );
      return true;
    },
    "startAfter refuses a cursor made for another tenant",
  );
});
