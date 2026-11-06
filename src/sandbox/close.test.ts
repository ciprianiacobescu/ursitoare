import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { createWorkerSandbox, SandboxError } from "./index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "./index.ts";

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

const LOOP = "for (;;) {}";

const RACE_MS = 5000;

const CHILD_TIMEOUT_MS = 20000;

type Outcome<T> =
  | { rejected: true; error: unknown }
  | { rejected: false; value: T };

function runWithDefaults(
  sandbox: WorkerSandbox,
  code: string,
  limitsPatch: Partial<SandboxLimits> = {},
): Promise<SandboxResult> {
  return sandbox.run(
    code,
    INPUT,
    { ...LIM, ...limitsPatch } as SandboxLimits,
    { ...OPT } as SandboxOptions,
  );
}

function outcomeOf<T>(promise: Promise<T>): Promise<Outcome<T>> {
  return promise.then(
    (value) => ({ rejected: false as const, value }),
    (error: unknown) => ({ rejected: true as const, error }),
  );
}

async function settledWithin<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`${label} did not settle within ${ms} ms`));
    }, ms);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function assertClosedRejection(outcome: Outcome<SandboxResult>, label: string): void {
  assert.equal(outcome.rejected, true, `${label}: expected a rejection, not a result`);
  if (!outcome.rejected) return;
  assert.ok(outcome.error instanceof SandboxError, `${label}: the rejection is a SandboxError`);
  assert.equal(outcome.error.code, "SANDBOX_CLOSED", `${label}: the rejection code`);
}

interface ChildOutcome {
  status: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function runLifetimeChild(scriptPath: string, body: string): Promise<ChildOutcome> {
  return new Promise<ChildOutcome>((resolve) => {
    const child = spawn(process.execPath, [scriptPath, body], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    const finish = (status: number | null): void => {
      if (settled) return;
      settled = true;
      resolve({ status, stdout, stderr, timedOut });
    };
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk: string) => {
      stderr += chunk;
    });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, CHILD_TIMEOUT_MS);
    child.on("error", (error: unknown) => {
      clearTimeout(timer);
      stderr += String(error);
      finish(null);
    });
    child.on("close", (status: number | null) => {
      clearTimeout(timer);
      finish(status);
    });
  });
}

function lifetimeScript(indexUrl: string): string {
  return `
import { createWorkerSandbox } from ${JSON.stringify(indexUrl)};
const LIM = ${JSON.stringify({ ...LIM, timeoutMs: 200 })};
const OPT = ${JSON.stringify(OPT)};
const INPUT = ${JSON.stringify(INPUT)};
const sandbox = createWorkerSandbox({ size: 1 });
sandbox.run(process.argv[2], INPUT, LIM, OPT).then((result) => {
  process.stdout.write((result.ok ? JSON.stringify(result.value) : result.fault.code) + "\\n");
});
`;
}

test("C-abbea154: close rejects pending and later runs and idle workers do not keep the process alive", async () => {
  const sandbox = createWorkerSandbox({ size: 2 });
  try {
    const warm = await runWithDefaults(sandbox, NORMALIZE);
    assert.equal(warm.ok, true, "the warm-up run settles");

    const runs = [
      runWithDefaults(sandbox, LOOP, { timeoutMs: 5000 }),
      runWithDefaults(sandbox, LOOP, { timeoutMs: 5000 }),
      runWithDefaults(sandbox, NORMALIZE),
    ];
    const closing = sandbox.close();

    const outcomes = await settledWithin(
      Promise.all(runs.map((promise) => outcomeOf(promise))),
      RACE_MS,
      "the three runs",
    );
    await settledWithin(closing, RACE_MS, "close");

    for (const [index, outcome] of outcomes.entries()) {
      assertClosedRejection(outcome, `run ${index + 1}`);
    }
  } finally {
    await sandbox.close();
  }

  const closed = createWorkerSandbox({ size: 1 });
  try {
    const warm = await runWithDefaults(closed, NORMALIZE);
    assert.equal(warm.ok, true, "the second warm-up run settles");

    await settledWithin(
      Promise.all([closed.close(), closed.close()]),
      RACE_MS,
      "two simultaneous close calls",
    );
    await settledWithin(closed.close(), RACE_MS, "a later close call");

    const repeat = await settledWithin(
      outcomeOf(runWithDefaults(closed, NORMALIZE)),
      RACE_MS,
      "a later NORMALIZE run",
    );
    assertClosedRejection(repeat, "a later run");

    const invalid: SandboxLimits = { ...LIM, timeoutMs: 0 };
    const afterInvalid = await settledWithin(
      outcomeOf(closed.run(NORMALIZE, INPUT, invalid, { ...OPT })),
      RACE_MS,
      "a later run with an invalid argument",
    );
    assertClosedRejection(afterInvalid, "a later run with an invalid argument");
  } finally {
    await closed.close();
  }

  const indexUrl = new URL("./index.ts", import.meta.url).href;
  const directory = mkdtempSync(join(tmpdir(), "ursitoare-close-"));
  const scriptPath = join(directory, "child.mjs");
  writeFileSync(scriptPath, lifetimeScript(indexUrl), "utf8");
  try {
    const [normalize, loop] = await Promise.all([
      runLifetimeChild(scriptPath, NORMALIZE),
      runLifetimeChild(scriptPath, LOOP),
    ]);

    assert.equal(
      normalize.timedOut,
      false,
      `the NORMALIZE child exits within ${CHILD_TIMEOUT_MS} ms: ${normalize.stderr}`,
    );
    assert.equal(normalize.status, 0, `the NORMALIZE child exits 0: ${normalize.stderr}`);
    assert.deepEqual(
      JSON.parse(normalize.stdout.trim()) as SandboxJson,
      NORMALIZE_VALUE,
      "the NORMALIZE child prints its value",
    );

    assert.equal(
      loop.timedOut,
      false,
      `the LOOP child exits within ${CHILD_TIMEOUT_MS} ms: ${loop.stderr}`,
    );
    assert.equal(loop.status, 0, `the LOOP child exits 0: ${loop.stderr}`);
    assert.equal(loop.stdout.trim(), "timeout", "the LOOP child prints its timeout fault code");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
