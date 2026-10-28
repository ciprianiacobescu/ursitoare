import assert from "node:assert/strict";
import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import { PdpError } from "./errors.ts";
import type { PdpErrorCode } from "./errors.ts";
import { loadPolicyFragments } from "./fragments.ts";

const tempDirs: string[] = [];
const unwritableDirs: string[] = [];

async function makeSrcDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "pdp-src-"));
  tempDirs.push(dir);
  return dir;
}

after(async () => {
  for (const dir of unwritableDirs) {
    await chmod(dir, 0o750);
  }
  for (const dir of tempDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function rejectsWithCode(
  promise: Promise<unknown>,
  code: PdpErrorCode,
): Promise<void> {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof PdpError, "the rejection is a PdpError");
    assert.equal(error.code, code);
    return true;
  });
}

test("C-510115a3 fragments refuse a module whose policy path is a regular file", async () => {
  const srcDir = await makeSrcDir();
  await mkdir(join(srcDir, "alpha"), { recursive: true });
  await writeFile(join(srcDir, "alpha", "policy"), "not a directory", "utf8");
  await rejectsWithCode(loadPolicyFragments(srcDir), "PDP_OPTIONS_INVALID");
});

test("C-510115a3 fragments refuse a policy directory that cannot be read", async () => {
  const srcDir = await makeSrcDir();
  const policy = join(srcDir, "alpha", "policy");
  await mkdir(policy, { recursive: true });
  await chmod(policy, 0o000);
  unwritableDirs.push(policy);
  await rejectsWithCode(loadPolicyFragments(srcDir), "PDP_OPTIONS_INVALID");
});
