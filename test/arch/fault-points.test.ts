// Architecture test of the fault-point rule: production code never creates or enables a fault point.
import assert from "node:assert/strict";
import { test } from "node:test";

import { loadConfig } from "../../src/config/index.ts";
import { checkFaultPoints } from "./fault-points.ts";
import { readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const NAMED_MESSAGE = "createFaultPoints is named only in src/config/faults.ts and src/config/index.ts";
const IMPORT_MESSAGE = "only src/config/index.ts imports src/config/faults.ts";
const PROCESS_MESSAGE = "src/config/faults.ts does not touch process";

function faultViolation(file: string, line: number, message: string): Violation {
  return { code: "ARCH_FAULT_POINTS", file, line, message };
}

const RULE_FIXTURES: Readonly<Record<string, string>> = {
  "src/api/a.ts":
    'import { createFaultPoints } from "../config/index.ts";\ncreateFaultPoints({ armed: [], markerDir: "/tmp/m", kill: () => {} });\n',
  "src/runs/b.ts": 'const f = "createFaultPoints";\n',
  "src/config/config.ts": 'import { NO_FAULT_POINTS } from "./faults.ts";\nexport const points = NO_FAULT_POINTS;\n',
  "src/config/faults.ts":
    'export function createFaultPoints(): void {}\nconst e = process.env.X;\n',
  "src/config/index.ts": 'export { createFaultPoints, NO_FAULT_POINTS } from "./faults.ts";\n',
  "src/api/c.test.ts": 'createFaultPoints({ armed: [], markerDir: "/tmp/m", kill: () => {} });\n',
  "src/api/d.ts": '// createFaultPoints\nconst s = "createFaultPoints2";\n',
  "src/tools/e.ts":
    'import type { FaultPoints } from "../config/index.ts";\nexport function hit(p: FaultPoints): void { p.hit("before:x"); }\n',
};

test("C-72672e22: fault points are refused in production fixtures and the config carries none", () => {
  const expected = [
    faultViolation("src/api/a.ts", 1, NAMED_MESSAGE),
    faultViolation("src/config/config.ts", 1, IMPORT_MESSAGE),
    faultViolation("src/config/faults.ts", 2, PROCESS_MESSAGE),
    faultViolation("src/runs/b.ts", 1, NAMED_MESSAGE),
  ];

  assert.deepEqual(answer(() => checkFaultPoints(snapshotOf(RULE_FIXTURES))), expected);
  assert.deepEqual(answer(() => checkFaultPoints(readSnapshot())), []);

  const base = { URSITOARE_DATABASE_URL: "postgres://ursitoare_app@127.0.0.1:5432/x" };
  const plain = loadConfig(base);
  const withFaultVariables = loadConfig({
    ...base,
    URSITOARE_FAULT_POINTS: "after:pay",
    URSITOARE_FAULT_MARKER_DIR: "/tmp/m",
    URSITOARE_CRASH_POINTS: "after:pay",
  });

  assert.deepEqual(withFaultVariables, plain);
  for (const text of [Object.keys(withFaultVariables).join(" "), JSON.stringify(withFaultVariables)]) {
    assert.equal(/fault/i.test(text), false);
  }
});
