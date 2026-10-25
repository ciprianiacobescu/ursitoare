// Owner test of the gate's JUnit reporter (tools/node-test-junit.mjs): the shapes L4 v0.4.30 reads.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const reporter = fileURLToPath(new URL("../../tools/node-test-junit.mjs", import.meta.url));

const FILES: Record<string, string> = {
  "stub.ts": 'export function add(_a: number): number { throw new Error("not implemented"); }\n',
  "a.test.ts": [
    'import { test, describe } from "node:test";',
    'import assert from "node:assert/strict";',
    'import { add } from "./stub.ts";',
    'test("passes", () => { assert.ok(true); });',
    'test("assertion fails", () => { assert.equal(1, 2, "Status: wrong"); });',
    'test("stub fails", () => { assert.equal(add(1), 2); });',
    'test("other error", () => { JSON.parse("{"); });',
    'test.skip("skipped", () => {});',
    'test.todo("todo", () => { assert.fail("later"); });',
    'describe("Outer", () => { describe("Inner", () => { test("nested", () => { assert.deepEqual([1], [2]); }); }); });',
    'describe("Broken suite", () => { throw new TypeError("bad describe"); });',
  ].join("\n"),
  "sub/a.test.ts": 'import { test } from "node:test";\ntest("passes", () => {});\n',
  "broken.test.ts": 'import { test } from "node:test";\nimport { nope } from "./missing.ts";\ntest("never", () => { nope(); });\n',
};

function run(): string {
  const dir = mkdtempSync(path.join(tmpdir(), "junit-reporter-"));
  try {
    mkdirSync(path.join(dir, "sub"));
    for (const [name, text] of Object.entries(FILES)) writeFileSync(path.join(dir, name), text);
    const env = { ...process.env };
    delete env["NODE_TEST_CONTEXT"]; // set by the outer runner; a nested run would report to it instead
    const out = path.join(dir, "out.xml");
    spawnSync(
      process.execPath,
      ["--test", `--test-reporter=${reporter}`, `--test-reporter-destination=${out}`, "a.test.ts", "sub/a.test.ts", "broken.test.ts"],
      { cwd: dir, env, encoding: "utf8", timeout: 60_000 },
    );
    return readFileSync(out, "utf8");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

type Case = { classname: string | undefined; name: string; failureType?: string; message?: string; skipped: boolean; error?: string };

function cases(report: string): Case[] {
  const found: Case[] = [];
  for (const match of report.matchAll(/<testcase ([^>]*)>(.*?)<\/testcase>/gs)) {
    const attrs = match[1] ?? "";
    const body = match[2] ?? "";
    const attr = (text: string, key: string): string | undefined => new RegExp(`(?:^|\\s)${key}="([^"]*)"`).exec(text)?.[1];
    const failure = /<failure ([^>]*)>/.exec(body)?.[1];
    const error = /<error ([^>]*)>/.exec(body)?.[1];
    found.push({
      classname: attr(attrs, "classname"),
      name: attr(attrs, "name") ?? "",
      ...(failure === undefined ? {} : { failureType: attr(failure, "type") ?? "", message: attr(failure, "message") ?? "" }),
      ...(error === undefined ? {} : { error: attr(error, "message") ?? "" }),
      skipped: body.includes("<skipped/>"),
    });
  }
  return found;
}

const report = run();
const all = cases(report);
const one = (classname: string | undefined, name: string): Case => {
  const hit = all.filter((c) => c.classname === classname && c.name === name);
  assert.equal(hit.length, 1, `exactly one testcase ${classname ?? "(no classname)"}::${name} in\n${report}`);
  return hit[0] as Case;
};

test("an assertion failure carries type AssertionError and the name in its message", () => {
  const c = one("a.test.ts", "assertion fails");
  assert.equal(c.failureType, "AssertionError");
  assert.equal(c.message, "AssertionError: Status: wrong");
});

test("a stub that throws not implemented is reported as NotImplementedError", () => {
  const c = one("a.test.ts", "stub fails");
  assert.equal(c.failureType, "NotImplementedError");
  assert.match(c.message ?? "", /^NotImplementedError: not implemented/);
});

test("any other error keeps its own name", () => {
  assert.equal(one("a.test.ts", "other error").failureType, "SyntaxError");
});

test("a passing test has no failure and skip and todo are skipped", () => {
  assert.equal(one("a.test.ts", "passes").failureType, undefined);
  assert.equal(one("a.test.ts", "skipped").skipped, true);
  assert.equal(one("a.test.ts", "todo").skipped, true);
});

test("same-named tests in two files get distinct classnames", () => {
  assert.equal(one("sub.a.test.ts", "passes").failureType, undefined);
  assert.equal(one("a.test.ts", "passes").failureType, undefined);
});

test("nested describes become part of the classname", () => {
  assert.equal(one("a.test.ts.Outer.Inner", "nested").failureType, "AssertionError");
});

test("a describe body that throws is reported as a failure of the suite", () => {
  assert.equal(one("a.test.ts", "Broken suite").failureType, "TypeError");
});

test("a file that does not import is a collection failure without classname", () => {
  const c = one(undefined, "broken.test.ts");
  assert.equal(c.error, "collection failure");
});
