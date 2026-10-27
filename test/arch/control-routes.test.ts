// Architecture test of the control-route rule: /reset and /faults belong to the e2e stack, never to src.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkControlRoutes } from "./control-routes.ts";
import { readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function places(result: Violation[] | "THROWN"): "THROWN" | (string | number)[][] {
  if (result === "THROWN") return "THROWN";
  return result.map((v) => [v.code, v.file, v.line]);
}

test("C-6551b89b: control route literals are reported with their file and line, look-alikes and test files are not", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": 'export const a = app.post("/reset", h);\n',
    "src/api/b.ts": "export const b = {\n  url: `/faults`,\n};\n",
    "src/api/c.ts": "export const c = '/faults/x';\n",
    "src/api/d.ts": 'export const d = "/api/v1/reset-password";\n',
    "src/api/e.ts": 'export const e = "/resets";\n',
    "src/api/a.test.ts": 'export const a = app.post("/reset", h);\n',
  });

  assert.deepEqual(answer(() => places(checkControlRoutes(snapshot))), [
    ["ARCH_CONTROL_ROUTE", "src/api/a.ts", 1],
    ["ARCH_CONTROL_ROUTE", "src/api/b.ts", 2],
    ["ARCH_CONTROL_ROUTE", "src/api/c.ts", 1],
  ]);

  assert.deepEqual(answer(() => checkControlRoutes(snapshotOf({}))), []);

  const real = answer(() => readSnapshot());
  if (real === "THROWN") assert.fail("readSnapshot threw");
  assert.ok(
    real.files.some((file) => file.path === "src/main.ts"),
    "the snapshot read src/main.ts",
  );
  assert.deepEqual(answer(() => checkControlRoutes(real)), []);
});
