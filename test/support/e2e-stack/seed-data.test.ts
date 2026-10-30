import assert from "node:assert/strict";
import { test } from "node:test";

import { E2eStackError } from "./part.ts";
import type { PartHandle } from "./part.ts";
import { collectSeedData } from "./seed-data.ts";

function handle(api?: unknown): PartHandle {
  const base: PartHandle = { env: {}, close: async (): Promise<void> => undefined };
  return api === undefined ? base : { ...base, api };
}

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  assert.fail("expected the call to throw");
}

function stackErrorOf(call: () => unknown): E2eStackError {
  const error = thrown(call);
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  return error;
}

test("C-c79d9365 seed data merges only the parts that offer seedData into a new object", () => {
  assert.equal(typeof collectSeedData, "function");
  assert.doesNotThrow(() => {
    const seeded = { users: {} };
    const handles = new Map<string, PartHandle>([
      ["one", handle({ seedData: () => seeded })],
      ["two", handle({})],
      ["three", handle()],
    ]);

    const result = collectSeedData(handles);

    assert.deepEqual(result, { users: {} });
    assert.notEqual(result, seeded, "the result is a new object");
  });
});

test("C-c79d9365 seed data rejects a top-level key offered twice", () => {
  assert.doesNotThrow(() => {
    const handles = new Map<string, PartHandle>([
      ["one", handle({ seedData: () => ({ users: {} }) })],
      ["two", handle({ seedData: () => ({ users: {} }) })],
    ]);

    const error = stackErrorOf(() => collectSeedData(handles));

    assert.equal(error.code, "STACK_PART_INVALID");
    assert.equal(error.details.key, "users");
  });
});

test("C-c79d9365 seed data rejects a seedData result that is not a plain object", () => {
  assert.doesNotThrow(() => {
    const handles = new Map<string, PartHandle>([
      ["bad", handle({ seedData: () => [] })],
    ]);

    const error = stackErrorOf(() => collectSeedData(handles));

    assert.equal(error.code, "STACK_PART_INVALID");
    assert.equal(error.details.part, "bad");
  });
});

test("C-c79d9365 seed data wraps a throwing seedData in a part failure", () => {
  assert.doesNotThrow(() => {
    const cause = new Error("seed failed");
    const handles = new Map<string, PartHandle>([
      ["boom", handle({ seedData: () => {
        throw cause;
      } })],
    ]);

    const error = stackErrorOf(() => collectSeedData(handles));

    assert.equal(error.code, "STACK_PART_FAILED");
    assert.equal(error.details.part, "boom");
    assert.equal(error.cause, cause);
  });
});
