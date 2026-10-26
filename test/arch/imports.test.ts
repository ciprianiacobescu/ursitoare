// Architecture test of the module-graph rule: allowed edges, forbidden edges and unknown directories.
import assert from "node:assert/strict";
import { test } from "node:test";

import { MODULES } from "./modules.ts";
import { checkModuleGraph } from "./rules.ts";
import { snapshotOf } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

test("C-df527545: allowed imports and nothing to do pass", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": 'import { core } from "../core/index.ts";\nimport fastify from "fastify";\n',
    "src/api/b.ts": 'import { a } from "./a.ts";\n',
    "src/health.ts": "export const health = 1;\n",
    "src/main.ts": 'import { api } from "./api/index.ts";\nimport { health } from "./health.ts";\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), []);
  assert.deepEqual(answer(() => checkModuleGraph({ files: [], srcDirs: [] })), []);
});

test("C-0bc7739e C-df527545: a forbidden edge names both modules", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": '\n\n\nimport type { T } from "../sandbox/index.ts";\n',
    "src/core/a.ts": 'import { x } from "../db/index.ts";\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_MODULE_EDGE",
      file: "src/api/a.ts",
      line: 4,
      message: `api may not import sandbox; allowed: ${MODULES.api?.allowed.join(", ")} (test/arch/modules.ts)`,
    },
    {
      code: "ARCH_MODULE_EDGE",
      file: "src/core/a.ts",
      line: 1,
      message: "core may not import db; allowed: none (test/arch/modules.ts)",
    },
  ]);
});

test("C-4d6f98c2: unknown directories are refused", () => {
  const base = snapshotOf({
    "src/api/a.ts": 'import { x } from "../rogue/index.ts";\n',
    "src/rogue/a.ts": "export const a = 1;\n",
  });
  const snapshot = { files: base.files, srcDirs: [...base.srcDirs, "empty"].sort() };

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_UNKNOWN_MODULE",
      file: "src/api/a.ts",
      line: 1,
      message: "rogue is not in test/arch/modules.ts; add its row in a red step",
    },
    {
      code: "ARCH_UNKNOWN_MODULE",
      file: "src/empty",
      line: 1,
      message: "empty is not in test/arch/modules.ts; add its row in a red step",
    },
    {
      code: "ARCH_UNKNOWN_MODULE",
      file: "src/rogue",
      line: 1,
      message: "rogue is not in test/arch/modules.ts; add its row in a red step",
    },
  ]);
});
