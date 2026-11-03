// Architecture test of the DBOS access rule: only src/durable imports the SDK, only src/durable and src/runs name its schema.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { checkDbosAccess } from "./dbos-access.ts";
import { REPO_ROOT, readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const SDK_MESSAGE = "@dbos-inc/dbos-sdk is imported only in src/durable";
const SCHEMA_MESSAGE = "the dbos schema is named only in src/durable and src/runs";

function dbosViolation(file: string, message: string): Violation {
  return { code: "ARCH_DBOS_ACCESS", file, line: 1, message };
}

const RULE_FIXTURES: Readonly<Record<string, string>> = {
  "src/api/a.ts": 'import { DBOS } from "@dbos-inc/dbos-sdk";\n',
  "src/api/b.ts": 'await import("@dbos-inc/dbos-sdk/dist/src/index.js");\n',
  "src/api/c.ts": 'import type { DLogger } from "@dbos-inc/dbos-sdk";\n',
  "src/api/d.ts": '"SELECT * FROM dbos.workflow_status"\n',
  "src/api/e.ts": 'const q = `SELECT 1 FROM "dbos"."queues"`;\n',
  "src/api/f.ts": 'import { DBOS_SCHEMA } from "../durable/index.ts";\n',
  "src/durable/g.ts": 'import { DBOS } from "@dbos-inc/dbos-sdk";\n',
  "src/runs/h.ts": '"SELECT * FROM dbos.workflow_status"\n',
  "src/api/i.test.ts": 'import { DBOS } from "@dbos-inc/dbos-sdk";\n',
  "src/api/j.ts": "const dbos = {};\ndbos.x = 1;\n// dbos.queues\n",
};

test("C-77ae2063: SDK imports and schema names outside the allowed modules are violations", () => {
  const violations = answer(() => checkDbosAccess(snapshotOf(RULE_FIXTURES)));

  assert.deepEqual(violations, [
    dbosViolation("src/api/a.ts", SDK_MESSAGE),
    dbosViolation("src/api/b.ts", SDK_MESSAGE),
    dbosViolation("src/api/c.ts", SDK_MESSAGE),
    dbosViolation("src/api/d.ts", SCHEMA_MESSAGE),
    dbosViolation("src/api/e.ts", SCHEMA_MESSAGE),
    dbosViolation("src/api/f.ts", SCHEMA_MESSAGE),
  ]);
});

test("C-77ae2063: the allowed forms, the real tree and the pinned SDK version pass", () => {
  assert.deepEqual(answer(() => checkDbosAccess(snapshotOf(RULE_FIXTURES))), [
    dbosViolation("src/api/a.ts", SDK_MESSAGE),
    dbosViolation("src/api/b.ts", SDK_MESSAGE),
    dbosViolation("src/api/c.ts", SDK_MESSAGE),
    dbosViolation("src/api/d.ts", SCHEMA_MESSAGE),
    dbosViolation("src/api/e.ts", SCHEMA_MESSAGE),
    dbosViolation("src/api/f.ts", SCHEMA_MESSAGE),
  ]);
  assert.deepEqual(
    answer(() =>
      checkDbosAccess(
        snapshotOf({
          "src/durable/g.ts": 'import { DBOS } from "@dbos-inc/dbos-sdk";\n',
          "src/runs/h.ts": '"SELECT * FROM dbos.workflow_status"\n',
          "src/api/i.test.ts": 'import { DBOS } from "@dbos-inc/dbos-sdk";\n',
          "src/api/j.ts": "const dbos = {};\ndbos.x = 1;\n// dbos.queues\n",
        }),
      ),
    ),
    [],
  );
  assert.deepEqual(answer(() => checkDbosAccess(readSnapshot())), []);

  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
  };
  assert.equal(manifest.dependencies?.["@dbos-inc/dbos-sdk"], "5.3.0");
});
