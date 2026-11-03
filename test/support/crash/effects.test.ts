import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { E2eStackError } from "../e2e-stack/part.ts";
import { appendEffect, countEffects } from "./effects.ts";

type Outcome<T> = { value: T } | { error: unknown };

function tempDir(): string {
  return mkdtempSync(join(tmpdir(), "crash-effects-"));
}

// Runs a call and returns its answer or its throw, so a stub fails on the comparison instead of escaping.
function attempt<T>(call: () => T): Outcome<T> {
  try {
    return { value: call() };
  } catch (error) {
    return { error };
  }
}

function valueOf<T>(outcome: Outcome<T>): T {
  assert.ok(
    "value" in outcome,
    `expected a value, got ${String((outcome as { error?: unknown }).error)}`,
  );
  return outcome.value;
}

function errorOf(outcome: Outcome<unknown>): E2eStackError {
  assert.ok("error" in outcome, "expected the call to throw");
  assert.ok(
    outcome.error instanceof E2eStackError,
    `expected an E2eStackError, got ${String(outcome.error)}`,
  );
  return outcome.error;
}

test("C-b965721e: effects are counted per tool by idempotency key and duplicates are calls minus effects", () => {
  const root = tempDir();
  const file = join(root, "absent", "effects.log");
  const entries: { tool: string; idemKey: string | null; nodeId: string }[] = [
    { tool: "pay", idemKey: "k1", nodeId: "n1" },
    { tool: "pay", idemKey: "k1", nodeId: "n1" },
    { tool: "pay", idemKey: "k2", nodeId: "n2" },
    { tool: "mail", idemKey: null, nodeId: "n3" },
    { tool: "mail", idemKey: null, nodeId: "n3" },
    { tool: "mail", idemKey: "k1", nodeId: "n3" },
    { tool: "__proto__", idemKey: "x", nodeId: "n4" },
  ];

  valueOf(
    attempt(() => {
      for (const entry of entries) appendEffect(file, entry);
    }),
  );

  const lines = readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.length > 0);
  assert.equal(lines.length, 7);
  assert.deepEqual(JSON.parse(lines[0] ?? ""), entries[0]);

  const expectedByTool = Object.fromEntries([
    ["pay", { calls: 3, effects: 2, duplicates: 1 }],
    ["mail", { calls: 3, effects: 3, duplicates: 0 }],
    ["__proto__", { calls: 1, effects: 1, duplicates: 0 }],
  ]);
  const counted = valueOf(attempt(() => countEffects(file)));
  assert.deepEqual(counted, { calls: 7, effects: 6, duplicates: 1, byTool: expectedByTool });
  assert.ok(Object.hasOwn(counted.byTool, "__proto__"));

  const absent = valueOf(attempt(() => countEffects(join(root, "missing.log"))));
  assert.deepEqual(absent, { calls: 0, effects: 0, duplicates: 0, byTool: {} });
});

test("C-b965721e: a malformed effect log line is refused with its line number", () => {
  const root = tempDir();
  const cases: { name: string; content: string; line: number }[] = [
    {
      name: "not-json",
      content: '{"tool":"pay","idemKey":null,"nodeId":"n"}\nnot json\n',
      line: 2,
    },
    { name: "empty-object", content: "{}\n", line: 1 },
    { name: "numeric-tool", content: '{"tool":5,"idemKey":null,"nodeId":"n"}\n', line: 1 },
  ];

  for (const { name, content, line } of cases) {
    const file = join(root, `${name}.log`);
    writeFileSync(file, content);
    const error = errorOf(attempt(() => countEffects(file)));
    assert.equal(error.code, "CRASH_EFFECT_LOG_INVALID");
    assert.equal(error.details.line, line);
  }
});

test("C-b965721e: a bad effect entry is refused before its file is created", () => {
  const root = tempDir();
  const cases: {
    field: string;
    entry: { tool: string; idemKey: string | null; nodeId: string };
  }[] = [
    { field: "tool", entry: { tool: "", idemKey: null, nodeId: "n" } },
    { field: "idemKey", entry: { tool: "pay", idemKey: "", nodeId: "n" } },
    { field: "nodeId", entry: { tool: "pay", idemKey: null, nodeId: "" } },
  ];

  for (const [index, { field, entry }] of cases.entries()) {
    const file = join(root, `absent-${index}`, "effects.log");
    const error = errorOf(attempt(() => appendEffect(file, entry)));
    assert.equal(error.code, "CRASH_OPTIONS_INVALID");
    assert.equal(error.details.field, field);
    assert.equal(existsSync(file), false);
  }
});
