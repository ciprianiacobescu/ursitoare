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

test("C-f3249f34: deep imports are refused", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": '\nimport { p } from "../pdp/policy.ts";\n',
    "src/api/b.ts": 'import("../pdp/policy.ts");\n',
    "src/main.ts": 'import { q } from "./pdp/internal/q.ts";\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_DEEP_IMPORT",
      file: "src/api/a.ts",
      line: 2,
      message: "import pdp through src/pdp/index.ts",
    },
    {
      code: "ARCH_DEEP_IMPORT",
      file: "src/api/b.ts",
      line: 1,
      message: "import pdp through src/pdp/index.ts",
    },
    {
      code: "ARCH_DEEP_IMPORT",
      file: "src/main.ts",
      line: 1,
      message: "import pdp through src/pdp/index.ts",
    },
  ]);

  const throughIndex = snapshotOf({
    "src/api/a.ts": 'import { p } from "../pdp/index.ts";\n',
  });
  assert.deepEqual(answer(() => checkModuleGraph(throughIndex)), []);
});

test("C-cc435a91: root files follow the leaf rule", () => {
  const snapshot = snapshotOf({
    "src/health.ts": 'import { core } from "./core/index.ts";\n',
    "src/api/a.ts": 'import { main } from "../main.ts";\n',
    "src/api/b.ts": 'import { health } from "../health.ts";\n',
  });

  const violations = answer(() => checkModuleGraph(snapshot));
  assert.deepEqual(
    answer(() =>
      violations === "THROWN"
        ? "THROWN"
        : violations.map((v) => [v.code, v.file, v.line]),
    ),
    [
      ["ARCH_ROOT_FILE", "src/api/a.ts", 1],
      ["ARCH_ROOT_FILE", "src/health.ts", 1],
    ],
  );
});

test("C-36562121: unseeable imports are refused and test files are exempt", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": '\n\nawait import(name);\n',
    "src/api/c.ts": 'await import("../core/index.ts");\n',
    "src/core/a.test.ts": 'import { x } from "../db/internal.ts";\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/a.ts",
      line: 3,
      message: "use a literal specifier",
    },
  ]);
});

test("C-82116acd: a non-literal require is unseeable", () => {
  const snapshot = snapshotOf({
    "src/api/g.js": '\n\nconst m = require(name);\n',
    "src/api/h.test.ts": "require(name);\n",
    "src/api/i.ts": 'const c = require("../core/index.ts");\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/g.js",
      line: 3,
      message: "use a literal specifier",
    },
  ]);
});

test("C-b49548b8: createRequire is refused", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts":
      'import { createRequire } from "node:module";\nconst load = createRequire(import.meta.url);\nconst https = load("node:https");\n',
    "src/db/b.ts":
      'import module from "node:module";\nconst load = module.createRequire(import.meta.url);\n',
    "src/core/c.ts": 'import { createRequire as cr } from "module";\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/a.ts",
      line: 1,
      message: "createRequire hides the module; use a static import",
    },
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/a.ts",
      line: 2,
      message: "createRequire hides the module; use a static import",
    },
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/core/c.ts",
      line: 1,
      message: "createRequire hides the module; use a static import",
    },
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/db/b.ts",
      line: 2,
      message: "createRequire hides the module; use a static import",
    },
  ]);
});

test("C-6b1f49c4: getBuiltinModule is refused", () => {
  const snapshot = snapshotOf({
    "src/api/b.ts":
      'const https = process.getBuiltinModule("node:https");\nconst e = globalThis.process["getBuiltinModule"]("node:process").env;\nconst h = getBuiltinModule("node:http");\n',
  });

  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), [
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/b.ts",
      line: 1,
      message: "getBuiltinModule hides the module; use a static import",
    },
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/b.ts",
      line: 2,
      message: "getBuiltinModule hides the module; use a static import",
    },
    {
      code: "ARCH_DYNAMIC_IMPORT",
      file: "src/api/b.ts",
      line: 3,
      message: "getBuiltinModule hides the module; use a static import",
    },
  ]);
});
