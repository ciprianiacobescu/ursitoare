import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { after, test } from "node:test";

import { PdpError } from "./errors.ts";
import type { PdpErrorCode } from "./errors.ts";
import { defaultSrcDir, loadPolicyFragments } from "./fragments.ts";
import type { PolicySource } from "./types.ts";

const tempDirs: string[] = [];

async function makeSrcDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(dir);
  return dir;
}

async function writeFiles(root: string, entries: Record<string, string>): Promise<void> {
  for (const [name, text] of Object.entries(entries)) {
    const file = join(root, name);
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, text, "utf8");
  }
}

async function writeDirs(root: string, names: string[]): Promise<void> {
  for (const name of names) {
    await mkdir(join(root, name), { recursive: true });
  }
}

after(async () => {
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function rejectsWith(
  promise: Promise<unknown>,
  code: PdpErrorCode,
  details: Readonly<Record<string, string | readonly string[]>>,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof PdpError, "the rejection is a PdpError");
    assert.equal(error.code, code);
    for (const [key, value] of Object.entries(details)) {
      assert.deepEqual(error.details[key], value, `details.${key}`);
    }
    return true;
  });
}

test("C-e624ba01 fragments load sorted by id from module policy directories only", async () => {
  const srcDir = await makeSrcDir();
  await writeFiles(srcDir, {
    "zeta/policy/b.cedar": "TB",
    "alpha/policy/z.cedar": "TZ",
    "alpha/policy/a.cedar": "TA",
    "alpha/policy/notes.txt": "ignored",
    "alpha/other/x.cedar": "ignored",
    "root.cedar": "ignored",
  });
  let result: PolicySource[] = [];
  await assert.doesNotReject(async () => {
    result = await loadPolicyFragments(srcDir);
  });
  assert.deepEqual(result, [
    { id: "alpha/policy/a.cedar", text: "TA", layer: "platform" },
    { id: "alpha/policy/z.cedar", text: "TZ", layer: "platform" },
    { id: "zeta/policy/b.cedar", text: "TB", layer: "platform" },
  ]);
});

test("C-03775862 fragments of a tree without cedar policies load as an empty list", async () => {
  const empty = await makeSrcDir();
  const bare = await makeSrcDir();
  await writeDirs(bare, ["alpha/policy", "beta"]);
  let first: PolicySource[] | undefined;
  let second: PolicySource[] | undefined;
  await assert.doesNotReject(async () => {
    first = await loadPolicyFragments(empty);
  });
  await assert.doesNotReject(async () => {
    second = await loadPolicyFragments(bare);
  });
  assert.deepEqual(first, []);
  assert.deepEqual(second, []);
  const full = await makeSrcDir();
  await writeFiles(full, { "m/policy/a.cedar": "A" });
  let third: PolicySource[] | undefined;
  await assert.doesNotReject(async () => {
    third = await loadPolicyFragments(full);
  });
  assert.deepEqual(third, [{ id: "m/policy/a.cedar", text: "A", layer: "platform" }]);
});

test("C-4986de81 fragments refuse a missing path a file and a non string srcDir", async () => {
  const root = await makeSrcDir();
  const file = join(root, "regular.txt");
  await writeFile(file, "x", "utf8");
  const missing = join(root, "missing");
  await rejectsWith(loadPolicyFragments(missing), "PDP_OPTIONS_INVALID", { reason: "src_dir" });
  await rejectsWith(loadPolicyFragments(file), "PDP_OPTIONS_INVALID", { reason: "src_dir" });
  await rejectsWith(loadPolicyFragments(5 as unknown as string), "PDP_OPTIONS_INVALID", {
    reason: "src_dir",
  });
});

test("C-510115a3 fragments refuse a cedar entry that cannot be a source", async () => {
  const spaced = await makeSrcDir();
  await writeFiles(spaced, { "alpha/policy/has space.cedar": "S" });
  await rejectsWith(loadPolicyFragments(spaced), "PDP_OPTIONS_INVALID", {
    reason: "fragment_name",
    ids: ["alpha/policy/has space.cedar"],
  });
  const directory = await makeSrcDir();
  await writeDirs(directory, ["alpha/policy/dir.cedar"]);
  await rejectsWith(loadPolicyFragments(directory), "PDP_OPTIONS_INVALID", {
    reason: "fragment_name",
    ids: ["alpha/policy/dir.cedar"],
  });
});

test("C-d44171dd the default source directory is src and loads platform sources", async () => {
  let dir = "";
  assert.doesNotThrow(() => {
    dir = defaultSrcDir();
  });
  assert.equal(basename(dir), "src");
  let sources: PolicySource[] | undefined;
  await assert.doesNotReject(async () => {
    sources = await loadPolicyFragments(dir);
  });
  assert.ok(Array.isArray(sources), "the result is an array");
  for (const source of sources) {
    assert.equal(source.layer, "platform");
  }
});
