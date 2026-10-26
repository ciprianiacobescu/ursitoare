// Architecture test of the whole tree: every rule over the merged sources and the repository.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  checkAll,
  checkConsole,
  checkForbiddenImports,
  checkGraphIntegrity,
  checkModuleGraph,
  checkNetwork,
  checkProcessEnv,
} from "./rules.ts";
import { scanRepository } from "./secrets.ts";
import { readSnapshot, snapshotOf } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const NETWORK_MESSAGE =
  "node:https is allowed only in observability, identity and gateway; call through src/gateway";

function networkViolation(file: string, line: number, _name: string) {
  return { code: "ARCH_NETWORK_IMPORT", file, line, message: NETWORK_MESSAGE };
}

test("C-c0da3179 C-9ded7e99 C-069f346e: the merged tree is clean", () => {
  const snapshot = readSnapshot();

  assert.deepEqual(answer(() => checkGraphIntegrity()), []);
  assert.deepEqual(answer(() => checkModuleGraph(snapshot)), []);
  assert.deepEqual(answer(() => checkNetwork(snapshot)), []);
  assert.deepEqual(answer(() => checkForbiddenImports(snapshot)), []);
  assert.deepEqual(answer(() => checkConsole(snapshot)), []);
  assert.deepEqual(answer(() => checkProcessEnv(snapshot)), []);
  assert.deepEqual(answer(() => scanRepository()), []);

  assert.ok(
    snapshot.files.some((file) => file.path === "src/main.ts"),
    "the snapshot read src/main.ts",
  );
  assert.ok(
    snapshot.files.some((file) => file.path === "src/core/index.ts"),
    "the snapshot read src/core/index.ts",
  );
  for (const dir of ["core", "config", "observability", "api"]) {
    assert.ok(snapshot.srcDirs.includes(dir), `the snapshot read src/${dir}`);
  }

  assert.deepEqual(
    answer(() =>
      checkAll(snapshotOf({ "src/api/x.ts": 'import { request } from "node:https";\n' })),
    ),
    [networkViolation("src/api/x.ts", 1, "node:https")],
  );

  assert.deepEqual(answer(() => checkAll(readSnapshot())), []);
});

test("C-6bb73a15: violations are all listed in one run", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": 'import { p } from "../pdp/policy.ts";\n',
    "src/tools/b.ts": 'import net from "net";\n',
    "src/core/c.ts": 'import { x } from "../../seed/x.ts";\n',
    "src/db/d.ts": "console.log(1);\n",
    "src/tenancy/e.ts": "process.env.X;\n",
  });

  const violations = answer(() => checkAll(snapshot));

  assert.deepEqual(
    answer(() =>
      violations === "THROWN"
        ? "THROWN"
        : violations.map((v) => [v.code, v.file, v.line]),
    ),
    [
      ["ARCH_DEEP_IMPORT", "src/api/a.ts", 1],
      ["ARCH_FORBIDDEN_IMPORT", "src/core/c.ts", 1],
      ["ARCH_CONSOLE", "src/db/d.ts", 1],
      ["ARCH_PROCESS_ENV", "src/tenancy/e.ts", 1],
      ["ARCH_NETWORK_IMPORT", "src/tools/b.ts", 1],
    ],
  );

  if (Array.isArray(violations)) {
    for (const violation of violations) {
      assert.match(violation.code, /^ARCH_[A-Z_]+$/);
    }
  }
});

test("C-eae7dab7: a require call is a value import of its specifier", () => {
  const snapshot = snapshotOf({
    "src/api/a.cjs": 'const https = require("node:https");\n',
    "src/core/b.js": '\nconst db = require("../db/index.ts");\n',
    "src/api/c.mjs": '\n\nconst p = require("../pdp/policy.ts");\n',
    "src/api/d.ts": '\n\n\nconst s = require("../../seed/x.ts");\n',
  });

  const violations = answer(() => checkAll(snapshot));

  assert.deepEqual(
    answer(() =>
      violations === "THROWN"
        ? "THROWN"
        : violations.map((v) => [v.code, v.file, v.line]),
    ),
    [
      ["ARCH_NETWORK_IMPORT", "src/api/a.cjs", 1],
      ["ARCH_DEEP_IMPORT", "src/api/c.mjs", 3],
      ["ARCH_FORBIDDEN_IMPORT", "src/api/d.ts", 4],
      ["ARCH_MODULE_EDGE", "src/core/b.js", 2],
    ],
  );

  if (Array.isArray(violations)) {
    assert.equal(violations[0]?.message, NETWORK_MESSAGE);
    assert.equal(violations[1]?.message, "import pdp through src/pdp/index.ts");
    assert.equal(
      violations[3]?.message,
      "core may not import db; allowed: none (test/arch/modules.ts)",
    );
  }
});

test("C-dd8c8f9a: require look-alikes and test files pass", () => {
  const snapshot = snapshotOf({
    "src/api/a.ts": [
      'x.require("node:https");',
      'require.resolve("node:https");',
      'requireX("node:https");',
      'const t = "require(name)";',
      'const c = require("../core/index.ts");',
    ].join("\n"),
    "src/api/b.ts": 'const a = require("node:process").argv;\n',
    "src/config/c.ts": 'const e = require("node:process").env;\n',
    "src/gateway/g.ts": 'const h = require("node:https");\n',
    "src/api/a.test.ts": [
      'require("node:https");',
      "require(name);",
      "createRequire(import.meta.url);",
      'process.getBuiltinModule("node:https");',
    ].join("\n"),
  });

  assert.deepEqual(answer(() => checkAll(snapshot)), []);

  assert.deepEqual(
    answer(() =>
      checkAll(snapshotOf({ "src/api/z.ts": 'const h = require("node:https");\n' })),
    ),
    [networkViolation("src/api/z.ts", 1, "node:https")],
  );
});
