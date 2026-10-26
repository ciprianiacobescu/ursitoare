import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, test } from "node:test";

import { discoverParts } from "./discover.ts";
import { E2eStackError } from "./part.ts";

const tempDirs: string[] = [];

function tempDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "e2e-discover-"));
  tempDirs.push(dir);
  return dir;
}

after(() => {
  for (const dir of tempDirs) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function partSource(name: string): string {
  return `export const part = { name: ${JSON.stringify(name)}, start: async () => ({ env: {}, close: async () => {} }) };\n`;
}

function writeFile(dir: string, name: string, source: string): void {
  fs.writeFileSync(path.join(dir, name), source);
}

function writePart(dir: string, name: string, partName = name): void {
  writeFile(dir, name, partSource(partName));
}

async function rejectionOf(run: () => Promise<unknown>): Promise<unknown> {
  try {
    await run();
  } catch (error) {
    return error;
  }
  return "no error was thrown";
}

function fileNameOf(error: unknown): string {
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  return path.basename(String(error.details.file));
}

const markers = globalThis as unknown as Record<string, unknown>;
const TEST_FILE_MARKER = "__e2eDiscoverTestFileImported";

test("C-71b5758c discovery returns parts in file name order and never imports test files", async () => {
  assert.equal(typeof discoverParts, "function");
  Reflect.deleteProperty(markers, TEST_FILE_MARKER);

  const dir = tempDir();
  writePart(dir, "20-b.ts", "b");
  writePart(dir, "10-a.ts", "a");
  writeFile(
    dir,
    "10-a.test.ts",
    `(globalThis as unknown as Record<string, unknown>)[${JSON.stringify(TEST_FILE_MARKER)}] = true;\nexport {};\n`,
  );
  writeFile(dir, "notes.md", "not a part\n");

  await assert.doesNotReject(async () => {
    const parts = await discoverParts(dir);
    assert.deepEqual(
      parts.map((part) => part.name),
      ["a", "b"],
    );
    assert.equal(markers[TEST_FILE_MARKER], undefined, "the *.test.ts file must not be imported");
  });
});

test("C-4c698dd6 discovery rejects invalid part files naming the file", async () => {
  const cases: ReadonlyArray<{ file: string; source: string }> = [
    { file: "10-a.ts", source: "export const notPart = 1;\n" },
    { file: "10-a.ts", source: partSource("b") },
    { file: "database.ts", source: partSource("database") },
    { file: "1-a.ts", source: partSource("a") },
    { file: "10-Bad.ts", source: partSource("Bad") },
    { file: "10-a.ts", source: 'export const part = { name: "a", start: "not a function" };\n' },
  ];

  for (const invalid of cases) {
    const dir = tempDir();
    writeFile(dir, invalid.file, invalid.source);

    const error = await rejectionOf(() => discoverParts(dir));
    assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
    assert.equal(error.code, "STACK_PART_INVALID");
    assert.equal(fileNameOf(error), invalid.file);
  }
});

test("C-4c698dd6 discovery rejects a directory that does not exist naming the directory", async () => {
  const missing = path.join(tempDir(), "missing");

  const error = await rejectionOf(() => discoverParts(missing));
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_INVALID");
  assert.equal(error.details.file, missing);
});

test("C-907d77a5 discovery rejects a repeated prefix naming the later file", async () => {
  const dir = tempDir();
  writePart(dir, "10-a.ts", "a");
  writePart(dir, "10-b.ts", "b");

  const error = await rejectionOf(() => discoverParts(dir));
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_DUPLICATE");
  assert.equal(fileNameOf(error), "10-b.ts");
});

test("C-907d77a5 discovery rejects a repeated name naming the later file", async () => {
  const dir = tempDir();
  writePart(dir, "10-a.ts", "a");
  writePart(dir, "20-a.ts", "a");

  const error = await rejectionOf(() => discoverParts(dir));
  assert.ok(error instanceof E2eStackError, `expected an E2eStackError, got ${String(error)}`);
  assert.equal(error.code, "STACK_PART_DUPLICATE");
  assert.equal(fileNameOf(error), "20-a.ts");
});
