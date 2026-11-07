import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
  WorkerSandboxOptions,
} from "./index.ts";

const REPO_ROOT = fileURLToPath(new URL("../../", import.meta.url));

const BUILD_CACHE = join(REPO_ROOT, "node_modules", ".cache");

const TSC = join(REPO_ROOT, "node_modules", "typescript", "bin", "tsc");

const BUILD_TIMEOUT_MS = 60000;

const LIM: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};

const OPT: SandboxOptions = {
  seed: "r_1:normalize:1",
  nowIso: "2026-10-24T12:00:00.000Z",
  binding: "input",
  result: "object",
};

const INPUT: SandboxJson = { amount: 1234.567, currency: "eur" };

const NORMALIZE =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };

interface BuiltModule {
  createWorkerSandbox(opts?: WorkerSandboxOptions): WorkerSandbox;
  workerEntryUrl(moduleUrl: string): URL;
}

interface BuildOutcome {
  code: number | null;
  stdout: string;
  stderr: string;
}

function runBuild(outDir: string): Promise<BuildOutcome> {
  return new Promise<BuildOutcome>((resolve) => {
    execFile(
      process.execPath,
      [TSC, "-p", "tsconfig.build.json", "--outDir", outDir],
      { cwd: REPO_ROOT, timeout: BUILD_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error === null) {
          resolve({ code: 0, stdout, stderr });
          return;
        }
        resolve({
          code: typeof error.code === "number" ? error.code : null,
          stdout,
          stderr: `${stderr}${String(error)}`,
        });
      },
    );
  });
}

test("C-ed57e3cd: the built worker answers a run without a factory", async () => {
  await mkdir(BUILD_CACHE, { recursive: true });
  const outDir = await mkdtemp(join(BUILD_CACHE, "ursitoare-sandbox-build-"));
  let sandbox: WorkerSandbox | undefined;
  try {
    await writeFile(join(outDir, "package.json"), JSON.stringify({ type: "module" }), "utf8");

    const build = await runBuild(outDir);
    assert.equal(build.code, 0, `tsc exits 0: ${build.stdout}${build.stderr}`);

    const poolPath = join(outDir, "sandbox", "pool.js");
    const workerEntryPath = join(outDir, "sandbox", "worker-entry.js");
    const indexUrl = pathToFileURL(join(outDir, "sandbox", "index.js")).href;

    const built = (await import(indexUrl)) as BuiltModule;

    const entryUrl = built.workerEntryUrl(pathToFileURL(poolPath).href);
    assert.equal(entryUrl.protocol, "file:", "the built worker entry is a file URL");
    assert.equal(
      entryUrl.href,
      pathToFileURL(workerEntryPath).href,
      "the built pool resolves its own worker-entry.js beside it",
    );
    assert.equal(existsSync(workerEntryPath), true, "the built worker-entry.js exists");

    sandbox = built.createWorkerSandbox({ size: 1 });
    assert.equal(sandbox.size, 1, "the built pool reports the requested size");

    const result: SandboxResult = await sandbox.run(NORMALIZE, INPUT, LIM, OPT);
    assert.equal(
      result.ok,
      true,
      result.ok ? "the built run succeeds" : `the built run faulted: ${result.fault.code}: ${result.fault.message}`,
    );
    if (result.ok) {
      assert.deepEqual(result.value, NORMALIZE_VALUE, "the built worker answered the normalize body");
    }
  } finally {
    if (sandbox !== undefined) {
      await sandbox.close();
    }
    await rm(outDir, { recursive: true, force: true });
  }
});
