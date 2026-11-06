// Architecture test of the sandbox I/O rule: the sandbox imports no host I/O and names no process.
import assert from "node:assert/strict";
import { test } from "node:test";

import { checkSandboxIo } from "./sandbox-io.ts";
import { readSnapshot, snapshotOf, type Violation } from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

const MESSAGE = "is not allowed in src/sandbox; the sandbox uses no host I/O";

function importViolation(file: string, line: number, specifier: string): Violation {
  return { code: "ARCH_SANDBOX_IO", file, line, message: `${specifier} ${MESSAGE}` };
}

function processViolation(file: string, line: number): Violation {
  return { code: "ARCH_SANDBOX_IO", file, line, message: "process is not allowed in src/sandbox" };
}

const ARCH_FILES: Readonly<Record<string, string>> = {
  "src/sandbox/ok.ts": [
    'import { Worker } from "node:worker_threads";',
    'import type { WorkerOptions } from "worker_threads";',
    'import { getQuickJS } from "quickjs-emscripten-core";',
    'import { variant } from "@jitl/quickjs-wasmfile-release-sync";',
    'import { MIN_STACK_BYTES } from "./limits.ts";',
    'import { seedOf } from "../sandbox/limits.ts";',
    'import { core } from "../core/index.ts";',
    'import { config } from "../config/index.ts";',
    "",
  ].join("\n"),
  "src/sandbox/b.ts": [
    'import fs from "node:fs";',
    'import { q } from "../db/index.ts";',
    'import type { T } from "quickjs-emscripten-core/dist/x";',
    'const m = await import("node:path");',
    "const n = await import(name);",
    "",
  ].join("\n"),
  "src/sandbox/c.ts": [
    "const a = process.env.X;",
    "const b = globalThis.process;",
    'const c = "process";',
    "",
  ].join("\n"),
  "src/sandbox/g.ts": [
    'import { z } from "../sandboxish/x.ts";',
    'import { i } from "../core/ids.ts";',
    "",
  ].join("\n"),
  "src/sandbox/d.test.ts": "const a = process.env.X;\n",
  "src/api/e.ts": 'import fs from "node:fs";\n',
};

test("C-0656ec39: sandbox host imports and process identifiers are refused in order", () => {
  const violations = answer(() => checkSandboxIo(snapshotOf(ARCH_FILES)));

  assert.deepEqual(violations, [
    importViolation("src/sandbox/b.ts", 1, "node:fs"),
    importViolation("src/sandbox/b.ts", 2, "../db/index.ts"),
    importViolation("src/sandbox/b.ts", 3, "quickjs-emscripten-core/dist/x"),
    importViolation("src/sandbox/b.ts", 4, "node:path"),
    importViolation("src/sandbox/b.ts", 5, "a computed import specifier"),
    processViolation("src/sandbox/c.ts", 1),
    processViolation("src/sandbox/c.ts", 2),
    importViolation("src/sandbox/g.ts", 1, "../sandboxish/x.ts"),
    importViolation("src/sandbox/g.ts", 2, "../core/ids.ts"),
  ]);
});

test("C-0656ec39: allowed, ignored and real files have no sandbox I/O violation", () => {
  assert.deepEqual(answer(() => checkSandboxIo(snapshotOf({}))), []);
  assert.deepEqual(answer(() => checkSandboxIo(readSnapshot())), []);
});
