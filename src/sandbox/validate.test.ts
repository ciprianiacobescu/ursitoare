import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import type { WorkerOptions } from "node:worker_threads";

import { createWorkerSandbox } from "./index.ts";
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

const NORMALIZE =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const INPUT: SandboxJson = { amount: 1234.567, currency: "eur" };

type Attempt<T> = { ok: true; value: T } | { ok: false; error: unknown };

function attempt<T>(call: () => T): Attempt<T> {
  try {
    return { ok: true, value: call() };
  } catch (error) {
    return { ok: false, error };
  }
}

interface FactoryLog {
  url: URL;
  options: WorkerOptions;
}

interface RecordedSandbox {
  created: Attempt<WorkerSandbox>;
  calls: FactoryLog[];
}

function makeSandbox(): RecordedSandbox {
  const calls: FactoryLog[] = [];
  const workerFactory = (url: URL, options: WorkerOptions): Worker => {
    calls.push({ url, options });
    return new Worker(url, options);
  };
  return { created: attempt(() => createWorkerSandbox({ workerFactory })), calls };
}

type RunArgs = readonly [unknown, unknown, unknown, unknown];

type RunOutcome =
  | { ok: true; result: SandboxResult }
  | { ok: false; error: unknown };

async function runSettled(sandbox: WorkerSandbox, args: RunArgs): Promise<RunOutcome> {
  const run = sandbox.run as unknown as (
    code: unknown,
    input: unknown,
    limits: unknown,
    options: unknown,
  ) => Promise<SandboxResult>;
  try {
    return { ok: true, result: await run(...args) };
  } catch (error) {
    return { ok: false, error };
  }
}

function inputInvalidMessage(outcome: RunOutcome, label: string): string {
  if (!outcome.ok) {
    assert.fail(`${label}: run rejected instead of resolving: ${String(outcome.error)}`);
  }
  const result = outcome.result;
  if (result.ok) {
    assert.fail(`${label}: expected an input_invalid fault, got ok`);
  }
  assert.equal(result.fault.code, "input_invalid", `${label}: fault code`);
  assert.equal(result.stats.memBytes, -1, `${label}: stats.memBytes`);
  return result.fault.message;
}

const throwingLimits: SandboxLimits = {
  get timeoutMs(): number {
    throw new Error("boom");
  },
  memoryBytes: LIM.memoryBytes,
  maxStackBytes: LIM.maxStackBytes,
  maxOutputBytes: LIM.maxOutputBytes,
};

const throwingOptions: SandboxOptions = {
  nowIso: OPT.nowIso,
  get seed(): string {
    throw new Error("boom");
  },
  binding: OPT.binding,
  result: OPT.result,
};

const proxyLimits = new Proxy(
  {},
  {
    ownKeys() {
      throw new Error("boom");
    },
  },
);

interface BadArgsRow {
  label: string;
  name: string;
  args: RunArgs;
}

const BAD_ARGS: readonly BadArgsRow[] = [
  { label: "code is not a string", name: "code", args: [42, INPUT, LIM, OPT] },
  { label: "limits null", name: "limits", args: [NORMALIZE, INPUT, null, OPT] },
  { label: "limits undefined", name: "limits", args: [NORMALIZE, INPUT, undefined, OPT] },
  { label: "limits string", name: "limits", args: [NORMALIZE, INPUT, "x", OPT] },
  { label: "limits throwing getter", name: "limits", args: [NORMALIZE, INPUT, throwingLimits, OPT] },
  { label: "limits throwing proxy", name: "limits", args: [NORMALIZE, INPUT, proxyLimits, OPT] },
  { label: "options null", name: "options", args: [NORMALIZE, INPUT, LIM, null] },
  { label: "options undefined", name: "options", args: [NORMALIZE, INPUT, LIM, undefined] },
  { label: "options number", name: "options", args: [NORMALIZE, INPUT, LIM, 5] },
  { label: "options throwing getter", name: "options", args: [NORMALIZE, INPUT, LIM, throwingOptions] },
  { label: "timeout zero", name: "limits.timeoutMs", args: [NORMALIZE, INPUT, { ...LIM, timeoutMs: 0 }, OPT] },
  { label: "timeout string", name: "limits.timeoutMs", args: [NORMALIZE, INPUT, { ...LIM, timeoutMs: "100" }, OPT] },
  { label: "timeout too large", name: "limits.timeoutMs", args: [NORMALIZE, INPUT, { ...LIM, timeoutMs: 3600001 }, OPT] },
  { label: "memory negative", name: "limits.memoryBytes", args: [NORMALIZE, INPUT, { ...LIM, memoryBytes: -1 }, OPT] },
  { label: "memory too large", name: "limits.memoryBytes", args: [NORMALIZE, INPUT, { ...LIM, memoryBytes: 1073741825 }, OPT] },
  { label: "stack NaN", name: "limits.maxStackBytes", args: [NORMALIZE, INPUT, { ...LIM, maxStackBytes: NaN }, OPT] },
  { label: "output infinite", name: "limits.maxOutputBytes", args: [NORMALIZE, INPUT, { ...LIM, maxOutputBytes: Infinity }, OPT] },
  { label: "output too large", name: "limits.maxOutputBytes", args: [NORMALIZE, INPUT, { ...LIM, maxOutputBytes: 67108865 }, OPT] },
  { label: "seed empty", name: "seed", args: [NORMALIZE, INPUT, LIM, { ...OPT, seed: "" }] },
  { label: "seed too long", name: "seed", args: [NORMALIZE, INPUT, LIM, { ...OPT, seed: "a".repeat(1025) }] },
  { label: "seed number", name: "seed", args: [NORMALIZE, INPUT, LIM, { ...OPT, seed: 1 }] },
  { label: "nowIso word", name: "nowIso", args: [NORMALIZE, INPUT, LIM, { ...OPT, nowIso: "yesterday" }] },
  { label: "nowIso no zone", name: "nowIso", args: [NORMALIZE, INPUT, LIM, { ...OPT, nowIso: "2026-10-24T12:00:00" }] },
  { label: "nowIso impossible day", name: "nowIso", args: [NORMALIZE, INPUT, LIM, { ...OPT, nowIso: "2026-02-30T00:00:00Z" }] },
  { label: "unknown binding", name: "binding", args: [NORMALIZE, INPUT, LIM, { ...OPT, binding: "args" }] },
  { label: "unknown result", name: "result", args: [NORMALIZE, INPUT, LIM, { ...OPT, result: "array" }] },
];

test("C-3999c476: bad arguments are refused before a worker starts", async () => {
  const { created, calls } = makeSandbox();
  if (!created.ok) {
    assert.fail(`createWorkerSandbox threw: ${String(created.error)}`);
  }
  const sandbox = created.value;
  try {
    for (const row of BAD_ARGS) {
      const outcome = await runSettled(sandbox, row.args);
      const message = inputInvalidMessage(outcome, row.label);
      assert.ok(
        message.includes(row.name),
        `${row.label}: message ${JSON.stringify(message)} does not name ${row.name}`,
      );
    }
    assert.equal(calls.length, 0, "no worker may be started for an invalid argument");
  } finally {
    await sandbox.close();
  }
});

function deep(n: number): SandboxJson {
  let value: SandboxJson = [];
  for (let i = 1; i < n; i += 1) {
    value = [value];
  }
  return value;
}

const cyclic: Record<string, unknown> = {};
cyclic.self = cyclic;

const sparse: unknown[] = [];
sparse[0] = 1;
sparse[2] = 3;

class PlainInstance {
  readonly marker = 1;
}

const instance = new PlainInstance();

const invalidInputs: readonly { label: string; input: unknown }[] = [
  { label: "X01 undefined", input: undefined },
  { label: "X02 undefined member", input: { u: undefined } },
  { label: "X03 function member", input: { f: () => 1 } },
  { label: "X04 symbol member", input: { s: Symbol("x") } },
  { label: "X05 bigint member", input: { b: 1n } },
  { label: "X06 NaN member", input: { n: NaN } },
  { label: "X07 boxed number member", input: { n: Object(1) } },
  { label: "X08 date member", input: { d: new Date(0) } },
  { label: "X09 map member", input: { m: new Map() } },
  { label: "X10 set member", input: { s: new Set() } },
  { label: "X11 class instance", input: instance },
  { label: "X12 typed array member", input: { t: new Uint8Array(2) } },
  { label: "X13 sparse array", input: sparse },
  { label: "X14 getter member", input: { get g() { return 1; } } },
  { label: "X15 non enumerable member", input: Object.defineProperty({}, "h", { value: 1 }) },
  { label: "X16 symbol key", input: { [Symbol("k")]: 1 } },
  { label: "X17 cycle", input: cyclic },
  { label: "X18 non enumerable index", input: Object.defineProperty([], "0", { value: 1 }) },
  { label: "X19 array extra key", input: Object.assign([1], { x: 2 }) },
  { label: "X20 array null prototype", input: Object.setPrototypeOf([], null) },
  { label: "X21 inherited prototype", input: Object.create({ a: 1 }) },
  { label: "X22 throwing proxy", input: new Proxy({}, { ownKeys() { throw new Error("x"); } }) },
  { label: "X23 proxy over date", input: new Proxy(new Date(0), {}) },
  { label: "X24 nested bigint", input: { a: [{ b: 1n }] } },
  { label: "X25 nesting over 65", input: deep(66) },
  { label: "X26 input over 8 million characters", input: "x".repeat(7999999) },
];

test("C-3999c476: invalid inputs X01 to X26 are refused before a worker starts", async () => {
  const { created, calls } = makeSandbox();
  if (!created.ok) {
    assert.fail(`createWorkerSandbox threw: ${String(created.error)}`);
  }
  const sandbox = created.value;
  try {
    for (const row of invalidInputs) {
      const outcome = await runSettled(sandbox, [NORMALIZE, row.input, LIM, OPT]);
      const message = inputInvalidMessage(outcome, row.label);
      assert.ok(
        message.includes("input"),
        `${row.label}: message ${JSON.stringify(message)} does not name input`,
      );
    }
    assert.equal(calls.length, 0, "no worker may be started for an invalid input");
  } finally {
    await sandbox.close();
  }
});

interface MultiBadRow {
  label: string;
  name: string;
  others: readonly string[];
  args: RunArgs;
}

const MULTI_BAD: readonly MultiBadRow[] = [
  {
    label: "M1 code before limits",
    name: "code",
    others: ["limits"],
    args: [42, INPUT, null, OPT],
  },
  {
    label: "M2 limits before options",
    name: "limits",
    others: ["options"],
    args: [NORMALIZE, INPUT, null, 5],
  },
  {
    label: "M3 seed before nowIso and binding",
    name: "seed",
    others: ["nowIso", "binding"],
    args: [NORMALIZE, INPUT, LIM, { ...OPT, seed: "", nowIso: "yesterday", binding: "args" }],
  },
  {
    label: "M4 binding before result",
    name: "binding",
    others: ["result"],
    args: [NORMALIZE, INPUT, LIM, { ...OPT, binding: "args", result: "array" }],
  },
  {
    label: "M5 result before input",
    name: "result",
    others: ["input"],
    args: [NORMALIZE, undefined, LIM, { ...OPT, result: "array" }],
  },
];

test("C-3999c476: multiple bad arguments report the first in the fixed order", async () => {
  const { created, calls } = makeSandbox();
  if (!created.ok) {
    assert.fail(`createWorkerSandbox threw: ${String(created.error)}`);
  }
  const sandbox = created.value;
  try {
    for (const row of MULTI_BAD) {
      const outcome = await runSettled(sandbox, row.args);
      const message = inputInvalidMessage(outcome, row.label);
      assert.ok(
        message.startsWith(row.name),
        `${row.label}: message ${JSON.stringify(message)} does not start with ${row.name}`,
      );
      for (const other of row.others) {
        assert.equal(
          message.includes(other),
          false,
          `${row.label}: message ${JSON.stringify(message)} must not name ${other}`,
        );
      }
    }
    assert.equal(calls.length, 0, "no worker may be started for invalid arguments");
  } finally {
    await sandbox.close();
  }
});
