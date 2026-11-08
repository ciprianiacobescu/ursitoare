import assert from "node:assert/strict";
import { test } from "node:test";

import type { HookPlacement } from "../../authoring/index.ts";
import { DEFAULT_SANDBOX_LIMITS, createWorkerSandbox } from "../../sandbox/index.ts";
import type {
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "../../sandbox/index.ts";
import { ESCAPE_CASES, checkEscapeCase } from "../../../test/support/sandbox-escape.ts";
import type { StepContext } from "../types.ts";
import { HOOK_LIMITS, runCodeHook } from "./code-runner.ts";
import type { HookContext } from "./types.ts";

const LIM: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};

const PLACEMENT = {
  phase: "pre",
  hook: { kind: "code", source: "return null;" },
  ruleId: null,
  label: "esc",
} as unknown as HookPlacement;

const HCTX = {
  phase: "pre",
  node: {},
  from: null,
  next: null,
  next_candidates: [],
  input: {},
  output: null,
  outcome: null,
  attempt: 1,
  feedback: null,
  args: {},
} as unknown as HookContext;

const STEP = {
  runId: "r_1",
  nodeId: "esc",
  attempt: 1,
  now: new Date("2026-11-02T10:00:00.000Z"),
} as unknown as StepContext;

interface Call {
  code: string;
  input: SandboxJson;
  limits: SandboxLimits;
  options: SandboxOptions;
}

function recording(calls: Call[]): WorkerSandbox {
  return {
    size: 1,
    respawns: 0,
    async run(
      code: string,
      input: SandboxJson,
      limits: SandboxLimits,
      options: SandboxOptions,
    ): Promise<SandboxResult> {
      calls.push({ code, input, limits, options });
      return { ok: true, value: null } as SandboxResult;
    },
    async close() {},
  } as WorkerSandbox;
}

test("C-916f559f: runCodeHook passes the hook limits, seed, clock and binding to the sandbox", async () => {
  const calls: Call[] = [];
  await assert.doesNotReject(async () => {
    await runCodeHook(recording(calls), PLACEMENT, HCTX, STEP);
  });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0]?.limits, { ...DEFAULT_SANDBOX_LIMITS });
  assert.deepEqual(calls[0]?.options, {
    seed: "r_1:esc:pre:esc:1",
    nowIso: "2026-11-02T10:00:00.000Z",
    binding: "ctx",
    result: "object_or_null",
  });
  assert.equal(calls[0]?.code, "return null;");
});

test("C-916f559f: HOOK_LIMITS equals the default sandbox limits and is frozen", () => {
  assert.deepEqual({ ...HOOK_LIMITS }, { ...DEFAULT_SANDBOX_LIMITS });
  assert.ok(Object.isFrozen(HOOK_LIMITS));
});

test("C-916f559f: every escape case passes through runCodeHook on a real pool", async () => {
  const pool = createWorkerSandbox({ size: 2 });
  try {
    let current = ESCAPE_CASES[0];
    const wrapped = {
      size: 1,
      respawns: 0,
      run(
        _code: string,
        _input: SandboxJson,
        _limits: SandboxLimits,
        options: SandboxOptions,
      ): Promise<SandboxResult> {
        assert.ok(current !== undefined);
        return pool.run(
          current.source,
          current.input,
          { ...LIM, ...(current.limits ?? {}) },
          options,
        );
      },
      async close() {},
    } as WorkerSandbox;
    const verdicts: Array<string | null> = [];
    for (const entry of ESCAPE_CASES) {
      current = entry;
      let result: SandboxResult | undefined;
      await assert.doesNotReject(async () => {
        result = await runCodeHook(wrapped, PLACEMENT, HCTX, STEP);
      });
      assert.ok(result !== undefined, `${entry.id} produced a result`);
      verdicts.push(checkEscapeCase(entry, result, "hook"));
    }
    assert.equal(verdicts.length, 42);
    assert.deepEqual(
      verdicts,
      verdicts.map(() => null),
    );
  } finally {
    await pool.close();
  }
});
