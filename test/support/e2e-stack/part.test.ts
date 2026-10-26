import assert from "node:assert/strict";
import { test } from "node:test";

import type { E2eStackPart, PartHandle } from "./part.ts";
import { E2eStackError, createPartRegistry } from "./part.ts";

function part(name: string, overrides: Partial<E2eStackPart> = {}): E2eStackPart {
  return {
    name,
    start: async (): Promise<PartHandle> => ({ env: {}, close: async () => undefined }),
    ...overrides,
  };
}

function thrown(call: () => unknown): unknown {
  try {
    call();
  } catch (error) {
    return error;
  }
  return "no error was thrown";
}

test("C-89fc2527 registry lists parts in registration order and returns a copy", () => {
  assert.equal(typeof createPartRegistry, "function");
  assert.doesNotThrow(() => {
    const registry = createPartRegistry();
    const a = part("a");
    const b = part("b");

    registry.register(a);
    registry.register(b);

    const first = registry.list();
    assert.deepEqual(first, [a, b]);

    const second = registry.list();
    assert.notEqual(second, first, "list returns a distinct array each call");

    first.length = 0;
    assert.deepEqual(registry.list(), [a, b], "mutating the returned list leaves the registry unchanged");
  });
});

test("C-89fc2527 registry rejects a bad name, the engine name and a string start as invalid", () => {
  assert.doesNotThrow(() => {
    const registry = createPartRegistry();
    const a = part("a");
    const b = part("b");
    registry.register(a);
    registry.register(b);

    const stringStart = { name: "start", start: "not a function" } as unknown as E2eStackPart;
    for (const invalid of [part("Bad Name"), part("engine"), stringStart]) {
      const error = thrown(() => registry.register(invalid));
      assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
      assert.equal(error.code, "STACK_PART_INVALID");
      assert.deepEqual(registry.list(), [a, b], "an invalid registration leaves the list unchanged");
    }
  });
});

test("C-89fc2527 registry rejects a duplicate name and keeps its list", () => {
  assert.doesNotThrow(() => {
    const registry = createPartRegistry();
    const a = part("a");
    const b = part("b");
    registry.register(a);
    registry.register(b);

    const error = thrown(() => registry.register(part("a")));
    assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
    assert.equal(error.code, "STACK_PART_DUPLICATE");
    assert.deepEqual(registry.list(), [a, b], "the duplicate is not added");
  });
});

test("C-89fc2527 E2eStackError carries its code, details and cause", () => {
  assert.doesNotThrow(() => {
    const cause = new Error("registry failure");
    const error = new E2eStackError("STACK_PART_INVALID", "invalid part", { file: "10-a.ts" }, { cause });

    assert.ok(error instanceof Error);
    assert.ok(error instanceof E2eStackError);
    assert.equal(error.code, "STACK_PART_INVALID");
    assert.equal(error.message, "invalid part");
    assert.deepEqual(error.details, { file: "10-a.ts" });
    assert.equal(error.cause, cause);
  });
});
