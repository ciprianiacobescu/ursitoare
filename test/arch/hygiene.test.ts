// Architecture test of the forbidden-import and console rules: seed, test, alias, self-package and console uses.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkConsole, checkForbiddenImports } from "./rules.ts";
import { snapshotOf, type Violation } from "./sources.ts";

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

function consoleViolation(file: string, line: number): Violation {
  return { code: "ARCH_CONSOLE", file, line, message: "use the logger from src/observability" };
}

test("C-9455d3fd: seed, test and alias imports are refused", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": 'import { x } from "../../seed/policy/x.ts";\n',
    "src/pdp/b.ts": '\nimport type { Pg } from "../../test/support/pg.ts";\n',
    "src/db/c.test.ts": 'import "../../seed/y.ts";\n',
    "src/main.ts": 'await import("../seed/z.ts");\n',
    "src/api/e.ts": '\n\nimport { x } from "#support/pg.ts";\n',
    "src/api/f.ts": 'import "ursitoare/test/x.ts";\n',
    "src/api/g.ts": 'await import("ursitoare");\n',
  });

  assert.deepEqual(answer(() => places(checkForbiddenImports(snapshot))), [
    ["ARCH_FORBIDDEN_IMPORT", "src/api/a.ts", 1],
    ["ARCH_FORBIDDEN_IMPORT", "src/api/e.ts", 3],
    ["ARCH_FORBIDDEN_IMPORT", "src/api/f.ts", 1],
    ["ARCH_FORBIDDEN_IMPORT", "src/api/g.ts", 1],
    ["ARCH_FORBIDDEN_IMPORT", "src/db/c.test.ts", 1],
    ["ARCH_FORBIDDEN_IMPORT", "src/main.ts", 1],
    ["ARCH_FORBIDDEN_IMPORT", "src/pdp/b.ts", 2],
  ]);
});

test("C-6ae206c9 C-9455d3fd: look-alike and test-file imports pass", () => {
  const snapshot = snapshotOf({
    "src/db/c.test.ts": 'import "../../test/support/pg.ts";\nimport "#x";\n',
    "src/api/a.ts":
      'import { seed } from "seed/x";\nimport { u } from "ursitoare-utils";\nimport { core } from "../core/index.ts";\n',
  });

  assert.deepEqual(answer(() => places(checkForbiddenImports(snapshot))), []);
  assert.deepEqual(
    answer(() =>
      places(
        checkForbiddenImports(snapshotOf({ "src/api/z.ts": 'import "../../seed/x.ts";\n' })),
      ),
    ),
    [["ARCH_FORBIDDEN_IMPORT", "src/api/z.ts", 1]],
  );
});

test("C-5fe3458c: console uses are refused", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": '\n\n\n\nconsole.log("x");\n',
    "src/core/b.ts": 'globalThis.console.error(e);\nconsole["warn"](1);\n',
    "src/db/c.ts": 'import { log } from "node:console";\n',
  });

  assert.deepEqual(answer(() => checkConsole(snapshot)), [
    consoleViolation("src/api/a.ts", 5),
    consoleViolation("src/core/b.ts", 1),
    consoleViolation("src/core/b.ts", 2),
    consoleViolation("src/db/c.ts", 1),
  ]);
});

test("C-78fc80d1: console look-alikes and test files pass", () => {
  const snapshot = snapshotOf({
    "src/api/a.test.ts": "console.log(1);\n",
    "src/api/b.ts":
      'const o = { console: 1 };\nconst c = x.console;\nconst t = "console.log";\n',
  });

  assert.deepEqual(answer(() => checkConsole(snapshot)), []);
  assert.deepEqual(
    answer(() => checkConsole(snapshotOf({ "src/api/c.ts": "console.log(1);\n" }))),
    [consoleViolation("src/api/c.ts", 1)],
  );
});
