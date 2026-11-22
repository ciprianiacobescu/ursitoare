// Architecture test of the cli to sandbox edge: the graph row and the import that uses it.
import assert from "node:assert/strict";
import { test } from "node:test";

import { MODULES } from "./modules.ts";
import { checkGraphIntegrity, checkModuleGraph } from "./rules.ts";
import { collectImports, readSnapshot, snapshotOf } from "./sources.ts";
import type { ImportRef, Violation } from "./sources.ts";

assert.equal(typeof checkModuleGraph, "function");

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function sandboxImportsOfFlowTest(): ImportRef[] {
  const file = readSnapshot().files.find((f) => f.path === "src/cli/flow/test.ts");
  assert.ok(file !== undefined, "src/cli/flow/test.ts is in the snapshot");
  return collectImports(file).filter((ref) => ref.specifier === "../../sandbox/index.ts");
}

test("C-90199ce0 the graph gives cli the sandbox edge and the CLI file uses it", () => {
  assert.deepEqual(answer(() => checkGraphIntegrity()), []);
  const apiAllowed = MODULES.api?.allowed ?? [];
  assert.equal(apiAllowed.length, 26);
  assert.equal(apiAllowed.includes("sandbox"), false);
  const cliAllowed = MODULES.cli?.allowed ?? [];
  assert.equal(cliAllowed.length, 27);
  assert.deepEqual(cliAllowed, [...apiAllowed, "sandbox"]);
  assert.equal(cliAllowed[26], "sandbox");
  assert.deepEqual(MODULES.sandbox?.allowed, ["core", "config"]);

  const refs = sandboxImportsOfFlowTest();
  assert.ok(
    refs.some((ref) => ref.typeOnly === false),
    "src/cli/flow/test.ts imports ../../sandbox/index.ts as a value",
  );
});

test("C-d6eaf34e the CLI may import the sandbox and the API may not", () => {
  const files = {
    "src/cli/flow/test.ts": 'import { createWorkerSandbox } from "../../sandbox/index.ts";\n',
    "src/api/a.ts": '\n\n\nimport type { T } from "../sandbox/index.ts";\n',
    "src/cli/flow/x.ts": '\nimport { r } from "../../runtimes/index.ts";\n',
    "src/cli/flow/y.ts": 'import { p } from "../../sandbox/pool.ts";\n',
  };
  const first = answer((): Violation[] => checkModuleGraph(snapshotOf(files)));
  assert.deepEqual(first, [
    {
      code: "ARCH_MODULE_EDGE",
      file: "src/api/a.ts",
      line: 4,
      message: `api may not import sandbox; allowed: ${MODULES.api?.allowed.join(", ")} (test/arch/modules.ts)`,
    },
    {
      code: "ARCH_MODULE_EDGE",
      file: "src/cli/flow/x.ts",
      line: 2,
      message: `cli may not import runtimes; allowed: ${MODULES.cli?.allowed.join(", ")} (test/arch/modules.ts)`,
    },
    {
      code: "ARCH_DEEP_IMPORT",
      file: "src/cli/flow/y.ts",
      line: 1,
      message: "import sandbox through src/sandbox/index.ts",
    },
  ]);
  const alone = snapshotOf({ "src/cli/flow/test.ts": files["src/cli/flow/test.ts"] });
  assert.deepEqual(answer(() => checkModuleGraph(alone)), []);
  assert.deepEqual(answer(() => checkModuleGraph(readSnapshot())), []);
  assert.ok(
    sandboxImportsOfFlowTest().some((ref) => ref.typeOnly === false),
    "src/cli/flow/test.ts imports ../../sandbox/index.ts as a value",
  );
});
