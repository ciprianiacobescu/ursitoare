import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import {
  formatViolation,
  readSnapshot,
  resolveSpecifier,
  sortViolations,
  type Violation,
} from "./sources.ts";

// Runs a call and returns its answer, or a marker when it throws, so a missing behaviour fails on the comparison.
function answer<T>(call: () => T): T | "THROWN" {
  try {
    return call();
  } catch {
    return "THROWN";
  }
}

function violation(file: string, line: number, code: string): Violation {
  return { code, file, line, message: "message" };
}

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "arch-sources-"));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("C-ec6975cf formatViolation names file, line, code and message for any code", () => {
  const base = { file: "src/a.ts", line: 3, message: "console is not allowed" };
  assert.equal(
    answer(() => formatViolation({ ...base, code: "ARCH_CONSOLE" })),
    "src/a.ts:3: ARCH_CONSOLE console is not allowed",
  );
  assert.equal(
    answer(() => formatViolation({ ...base, code: "ARCH_CONTROL_ROUTE" })),
    "src/a.ts:3: ARCH_CONTROL_ROUTE console is not allowed",
  );
});

test("C-ec6975cf sortViolations orders by file, then line, then code", () => {
  const sorted = answer(() =>
    sortViolations([
      violation("src/b.ts", 1, "ARCH_CONSOLE"),
      violation("src/a.ts", 9, "ARCH_CONSOLE"),
      violation("src/a.ts", 2, "ARCH_CONSOLE"),
    ]),
  );
  assert.deepEqual(
    answer(() => (sorted === "THROWN" ? "THROWN" : sorted.map((v) => `${v.file}:${v.line}`))),
    ["src/a.ts:2", "src/a.ts:9", "src/b.ts:1"],
  );
  const samePlace = answer(() =>
    sortViolations([
      violation("src/a.ts", 2, "ARCH_PROCESS_ENV"),
      violation("src/a.ts", 2, "ARCH_CONSOLE"),
    ]),
  );
  assert.deepEqual(
    answer(() => (samePlace === "THROWN" ? "THROWN" : samePlace.map((v) => v.code))),
    ["ARCH_CONSOLE", "ARCH_PROCESS_ENV"],
  );
});

test("C-18aa910d resolveSpecifier resolves relative imports against the importing file", () => {
  const from = "src/api/server.ts";
  assert.equal(answer(() => resolveSpecifier(from, "../core/index.ts")), "src/core/index.ts");
  assert.equal(answer(() => resolveSpecifier(from, "./routes/x.ts")), "src/api/routes/x.ts");
  assert.equal(answer(() => resolveSpecifier(from, "fastify")), null);
  assert.equal(answer(() => resolveSpecifier(from, "../../../outside.ts")), null);
});

test("C-f0665065 readSnapshot reads the source files of a real directory without symlinks", () => {
  const dir = tempDir();
  fs.mkdirSync(path.join(dir, "src", "a"), { recursive: true });
  fs.mkdirSync(path.join(dir, "src", "b"), { recursive: true });
  fs.writeFileSync(path.join(dir, "src", "a", "x.ts"), "export const x = 1;\n");
  fs.writeFileSync(path.join(dir, "src", "a", "x.test.ts"), "export const t = 1;\n");
  fs.writeFileSync(path.join(dir, "src", "b", "data.sql"), "select 1;\n");
  fs.writeFileSync(path.join(dir, "src", "main.ts"), "export const main = 1;\n");
  fs.symlinkSync(path.join(dir, "src", "main.ts"), path.join(dir, "src", "c.ts"));

  const snapshot = answer(() => readSnapshot(dir));
  assert.deepEqual(
    answer(() => (snapshot === "THROWN" ? "THROWN" : snapshot.files.map((f) => f.path))),
    ["src/a/x.test.ts", "src/a/x.ts", "src/main.ts"],
  );
  assert.equal(
    answer(() => (snapshot === "THROWN" ? "THROWN" : snapshot.files.find((f) => f.path === "src/a/x.ts")?.text)),
    "export const x = 1;\n",
  );
  assert.deepEqual(
    answer(() => (snapshot === "THROWN" ? "THROWN" : snapshot.srcDirs)),
    ["a", "b"],
  );

  const empty = tempDir();
  assert.deepEqual(answer(() => readSnapshot(empty)), { files: [], srcDirs: [] });
});
