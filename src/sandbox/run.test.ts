import assert from "node:assert/strict";
import { test } from "node:test";
import { Worker } from "node:worker_threads";

import { createWorkerSandbox, classifyFault } from "./index.ts";
import type {
  FaultFacts,
  SandboxFaultCode,
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

const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };

const CTX_BODY = "return { amount: ctx.amount, inputType: typeof input };";

const NUL_BODY = "const s = arguments[0].s; return { len: s.length, nul: s.charCodeAt(1), out: s };";

const ECHO = "return { v: arguments[0] };";

const NEVER_SETTLED_MESSAGE =
  "the code body returned a promise that can never settle (deadlock, or an out-of-memory failure swallowed inside a promise job)";

const TIMEOUT_MESSAGE = "execution exceeded timeoutMs";

function deepOf(n: number): SandboxJson {
  let v: SandboxJson = [];
  for (let i = 1; i < n; i += 1) v = [v];
  return v;
}

function readOnceLimits(counter: { n: number }): SandboxLimits {
  return Object.defineProperty({ ...LIM }, "timeoutMs", {
    get: () => {
      counter.n += 1;
      return LIM.timeoutMs;
    },
    enumerable: true,
  }) as unknown as SandboxLimits;
}

function readOnceOptions(counter: { n: number }): SandboxOptions {
  return Object.defineProperty({ ...OPT }, "seed", {
    get: () => {
      counter.n += 1;
      return OPT.seed;
    },
    enumerable: true,
  }) as unknown as SandboxOptions;
}

function runWithDefaults(
  sandbox: WorkerSandbox,
  code: string,
  input: SandboxJson,
  limitsPatch: Partial<SandboxLimits> = {},
  optionsPatch: Partial<SandboxOptions> = {},
): Promise<SandboxResult> {
  return sandbox.run(
    code,
    input,
    { ...LIM, ...limitsPatch } as SandboxLimits,
    { ...OPT, ...optionsPatch } as SandboxOptions,
  );
}

function unreachedResult(): SandboxResult {
  return {
    ok: false,
    fault: { code: "sandbox_crash", message: "" },
    stats: { ms: -1, memBytes: -1 },
  };
}

function asValue(result: SandboxResult, label: string): SandboxJson | null {
  if (!result.ok) {
    assert.fail(`${label}: expected ok, got fault ${result.fault.code}: ${result.fault.message}`);
  }
  return result.value;
}

function expectFault(result: SandboxResult, label: string, code: SandboxFaultCode): string {
  if (result.ok) {
    assert.fail(`${label}: expected fault ${code}, got ok ${JSON.stringify(result.value)}`);
  }
  assert.equal(result.fault.code, code, `${label}: fault code`);
  return result.fault.message;
}

async function closeQuietly(sandbox: WorkerSandbox | undefined): Promise<void> {
  if (sandbox === undefined) return;
  await sandbox.close();
}

test("C-d45afadb: a normalize body returns its value with stats", async () => {
  const sandbox = createWorkerSandbox();
  try {
    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, NORMALIZE, { amount: 1234.567, currency: "eur" });
    });
    const value = asValue(result, "NORMALIZE");
    assert.deepEqual(value, NORMALIZE_VALUE, "NORMALIZE value");
    if (value !== null && typeof value !== "string") {
      assert.equal(Object.getPrototypeOf(value), Object.prototype, "value prototype");
    }
    assert.ok(Number.isFinite(result.stats.ms), "stats.ms is finite");
    assert.ok(result.stats.ms >= 0, "stats.ms is >= 0");
    assert.ok(Number.isInteger(result.stats.memBytes), "stats.memBytes is an integer");
    assert.ok(result.stats.memBytes >= 0, "stats.memBytes is >= 0");
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: the ctx binding leaves input undefined", async () => {
  const sandbox = createWorkerSandbox();
  try {
    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, CTX_BODY, { amount: 5 }, {}, {
        binding: "ctx",
      });
    });
    assert.deepEqual(asValue(result, "CTX_BODY"), { amount: 5, inputType: "undefined" });
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: object_or_null maps nullish bodies to a null value", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const bodies = ["return undefined;", "return null;", "return;"];
    for (const [index, body] of bodies.entries()) {
      let result = unreachedResult();
      await assert.doesNotReject(async () => {
        result = await runWithDefaults(sandbox, body, {}, {}, {
          result: "object_or_null",
        });
      });
      assert.equal(asValue(result, `object_or_null body ${index + 1}`), null);
    }
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: non object outputs under both result modes are refused", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const primitiveBodies = ["return [1];", "return 5;", 'return "s";'];
    const modes: readonly ("object" | "object_or_null")[] = ["object", "object_or_null"];
    for (const mode of modes) {
      for (const [index, body] of primitiveBodies.entries()) {
        let result = unreachedResult();
        await assert.doesNotReject(async () => {
          result = await runWithDefaults(sandbox, body, {}, {}, { result: mode });
        });
        expectFault(result, `primitive body ${index + 1} under ${mode}`, "output_invalid");
      }
    }
    for (const [index, body] of ["return null;", "return undefined;"].entries()) {
      let result = unreachedResult();
      await assert.doesNotReject(async () => {
        result = await runWithDefaults(sandbox, body, {});
      });
      expectFault(result, `nullish body ${index + 1} under object`, "output_invalid");
    }
    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, "return {};", {});
    });
    assert.deepEqual(asValue(result, "empty object body"), {});
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: an async body awaits its promise inside the sandbox", async () => {
  const sandbox = createWorkerSandbox();
  try {
    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, "return { v: await new Promise((r) => r(7)) };", {});
    });
    assert.deepEqual(asValue(result, "async body"), { v: 7 });
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: a NUL byte in string input travels through the run", async () => {
  const sandbox = createWorkerSandbox();
  try {
    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, NUL_BODY, { s: "a\u0000b" });
    });
    assert.deepEqual(asValue(result, "NUL_BODY"), { len: 3, nul: 0, out: "a\u0000b" });
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: accepted boundaries around inputs and arguments are ok", async () => {
  const sandbox = createWorkerSandbox();
  try {
    let result = unreachedResult();

    await assert.doesNotReject(async () => {
      result = await runWithDefaults(sandbox, "return { n: arguments[0].length };", deepOf(65));
    });
    assert.deepEqual(asValue(result, "deep input of 65 levels"), { n: 1 });

    await assert.doesNotReject(async () => {
      result = await runWithDefaults(
        sandbox,
        "return { n: arguments[0].length };",
        "x".repeat(7999998),
        { memoryBytes: 67108864 },
      );
    });
    assert.deepEqual(asValue(result, "an 8 million character input"), { n: 7999998 });

    for (const seed of ["a", "a".repeat(1024)]) {
      await assert.doesNotReject(async () => {
        result = await runWithDefaults(sandbox, NORMALIZE, { amount: 1234.567, currency: "eur" }, {}, {
          nowIso: "2026-10-24T14:00:00+02:00",
          seed,
        });
      });
      assert.deepEqual(asValue(result, `seed of ${seed.length} characters`), NORMALIZE_VALUE);
    }
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: ECHO returns every accepted input as its value", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const rows: readonly { label: string; input: SandboxJson; expect: SandboxJson }[] = [
      { label: "A1 null prototype object", input: Object.assign(Object.create(null), { a: 1 }), expect: { a: 1 } },
      { label: "A2 plain object proxy", input: new Proxy({ a: 1 }, {}) as unknown as SandboxJson, expect: { a: 1 } },
      { label: "A3 array proxy", input: new Proxy([1, 2], {}) as unknown as SandboxJson, expect: [1, 2] },
      { label: "A4 empty array", input: [], expect: [] },
      { label: "A5 empty object", input: {}, expect: {} },
    ];
    for (const row of rows) {
      let result = unreachedResult();
      await assert.doesNotReject(async () => {
        result = await runWithDefaults(sandbox, ECHO, row.input);
      });
      const value = asValue(result, `ECHO ${row.label}`);
      assert.ok(value !== null && typeof value !== "string", "ECHO value is an object");
      if (value !== null && typeof value !== "string") {
        assert.deepEqual((value as { [key: string]: SandboxJson })["v"], row.expect, `ECHO ${row.label} echoes its input`);
      }
    }
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-d45afadb: limits and options are read once through counting getters", async () => {
  const sandbox = createWorkerSandbox();
  try {
    const limitsReads = { n: 0 };
    const optionsReads = { n: 0 };

    let result = unreachedResult();
    await assert.doesNotReject(async () => {
      result = await sandbox.run(
        NORMALIZE,
        { amount: 1234.567, currency: "eur" },
        readOnceLimits(limitsReads),
        readOnceOptions(optionsReads),
      );
    });
    assert.deepEqual(asValue(result, "NORMALIZE with counting arguments"), NORMALIZE_VALUE);
    assert.equal(limitsReads.n, 1, "the limits getter was read exactly once");
    assert.equal(optionsReads.n, 1, "the options getter was read exactly once");
  } finally {
    await closeQuietly(sandbox);
  }
});

test("C-096cfc59: faults of the body keep their rows and the workers answer every run once", async () => {
  let postCount = 0;
  class CountingWorker extends Worker {
    override postMessage(...args: Parameters<Worker["postMessage"]>): ReturnType<Worker["postMessage"]> {
      postCount += 1;
      return super.postMessage(...args);
    }
  }
  const sandbox = createWorkerSandbox({
    workerFactory: (url, options) => new CountingWorker(url, options),
  });
  try {
    const rows: readonly {
      label: string;
      body: string;
      code: SandboxFaultCode;
      message?: string;
      starts?: string;
      regex?: RegExp;
    }[] = [
      { label: "syntax body", body: "return {", code: "syntax_error", starts: "SyntaxError: " },
      { label: "type error body", body: "null.x;", code: "runtime_error", starts: "TypeError: " },
      {
        label: "reference error body",
        body: "undefinedName;",
        code: "runtime_error",
        regex: /^ReferenceError: '?undefinedName'? is not defined$/,
      },
      { label: "thrown error", body: "throw new Error('boom');", code: "runtime_error", message: "Error: boom" },
      { label: "thrown string", body: "throw 'just a string';", code: "runtime_error", message: "Error: just a string" },
      {
        label: "thrown object",
        body: "throw { code: 42 };",
        code: "runtime_error",
        message: "Error: <thrown object without a message>",
      },
      { label: "thrown null", body: "throw null;", code: "runtime_error", message: "null was thrown" },
      { label: "thrown range error", body: "throw new RangeError('x');", code: "runtime_error", message: "RangeError: x" },
      {
        label: "thrown internal error",
        body: "throw new InternalError('x');",
        code: "runtime_error",
        message: "InternalError: x",
      },
      {
        label: "rejected promise",
        body: "return Promise.reject(new Error('x'));",
        code: "runtime_error",
        message: "Error: x",
      },
      { label: "never settling body", body: "await new Promise(() => {}); return {};", code: "never_settled", message: NEVER_SETTLED_MESSAGE },
      {
        label: "throwing accessor in the output",
        body: "return { get g() { throw new Error('boom'); } };",
        code: "output_invalid",
        message: "output is not JSON-serializable at $.g: accessor property",
      },
      {
        label: "throwing proxy trap in the output",
        body: "return new Proxy({}, { ownKeys() { throw new Error('trap'); } });",
        code: "runtime_error",
        message: "Error: trap",
      },
    ];

    for (const row of rows) {
      let result = unreachedResult();
      await assert.doesNotReject(async () => {
        result = await runWithDefaults(sandbox, row.body, {});
      });
      const message = expectFault(result, `fault body ${row.label}`, row.code);
      if (row.message !== undefined) {
        assert.equal(message, row.message, `fault message of ${row.label}`);
      }
      if (row.starts !== undefined) {
        assert.ok(
          message.startsWith(row.starts),
          `fault message of ${row.label} starts with ${row.starts}: ${message}`,
        );
      }
      if (row.regex !== undefined) {
        assert.match(message, row.regex, `fault message of ${row.label} matches its pattern`);
      }
      assert.ok(!message.includes("/Users"), `${row.label} message hides paths`);
      assert.ok(!message.includes("node_modules"), `${row.label} message hides paths`);
      assert.ok(!message.includes("file://"), `${row.label} message hides paths`);
      assert.ok(message.length <= 2202, `fault message of ${row.label} stays within 2202 characters`);
    }

    assert.equal(postCount, rows.length, "each run posted exactly one job, with no retry");
  } finally {
    await closeQuietly(sandbox);
  }
});

interface ClassificationVector {
  id: string;
  facts: FaultFacts;
  code: SandboxFaultCode;
  message: string;
}

function classificationVectors(): readonly ClassificationVector[] {
  const m400 = "m".repeat(400);
  return [
    { id: "R1", facts: { stage: "args", error: { name: "code", message: "code must be a string" } }, code: "input_invalid", message: "code must be a string" },
    { id: "R2", facts: { stage: "compile", error: { name: "InternalError", message: "interrupted" }, interrupted: true }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "R3", facts: { stage: "compile", error: { name: "SyntaxError", message: "expecting ';'" } }, code: "syntax_error", message: "SyntaxError: expecting ';'" },
    { id: "R4", facts: { stage: "compile", error: { name: "InternalError", message: "out of memory" } }, code: "runtime_error", message: "InternalError: out of memory" },
    { id: "R5", facts: { stage: "jobs", error: null }, code: "memory_limit", message: "guest heap exceeded memoryBytes (job queue)" },
    { id: "R6a", facts: { stage: "jobs", error: null, interrupted: true }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "R6b", facts: { stage: "jobs", error: { name: "InternalError", message: "stack overflow" } }, code: "stack_overflow", message: "stack overflow" },
    { id: "R7a", facts: { stage: "output", interrupted: true, bytes: 10, maxBytes: 100 }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "R7b", facts: { stage: "pending", interrupted: true }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "R8", facts: { stage: "run", error: { name: "Error", message: "boom" } }, code: "runtime_error", message: "Error: boom" },
    { id: "R9", facts: { stage: "output", bytes: 98, maxBytes: 97 }, code: "output_too_large", message: "output is 98 bytes, limit 97" },
    { id: "R10", facts: { stage: "pending" }, code: "never_settled", message: NEVER_SETTLED_MESSAGE },
    { id: "R11", facts: { stage: "host", error: { name: "RangeError", message: m400 } }, code: "sandbox_crash", message: `RangeError: ${"m".repeat(300)}` },
    { id: "R12a", facts: { stage: "watchdog", ms: 300.6, timeoutMs: 50, graceMs: 250 }, code: "timeout", message: "worker watchdog killed the sandbox after 301 ms (limit 50 + grace 250)" },
    { id: "R12b", facts: { stage: "exit" }, code: "sandbox_crash", message: "worker thread exited unexpectedly" },
    { id: "R12c", facts: { stage: "spawn" }, code: "sandbox_crash", message: "worker thread could not be started" },
    { id: "V1a", facts: { stage: "run", error: { name: "NullThrown", message: "" }, nearCeiling: true }, code: "memory_limit", message: "allocation failed at the Wasm memory ceiling (no exception object could be built)" },
    { id: "V1b", facts: { stage: "run", error: null, interrupted: true, nearCeiling: true }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "V1c", facts: { stage: "run", error: { name: "NullThrown", message: "" } }, code: "runtime_error", message: "null was thrown" },
    { id: "V2", facts: { stage: "run", error: { name: "InternalError", message: "out of memory" }, interrupted: true }, code: "timeout", message: TIMEOUT_MESSAGE },
    { id: "V3", facts: { stage: "run", error: { name: "InternalError", message: "out of memory" } }, code: "memory_limit", message: "guest heap exceeded memoryBytes" },
    { id: "V4a", facts: { stage: "run", error: { name: "InternalError", message: "stack overflow" } }, code: "stack_overflow", message: "stack overflow" },
    { id: "V4b", facts: { stage: "run", error: { name: "RangeError", message: "Maximum call stack size exceeded" } }, code: "stack_overflow", message: "Maximum call stack size exceeded" },
    { id: "V5", facts: { stage: "run", error: { name: "OutputTooLargeError", message: "output exceeds size limit" } }, code: "output_too_large", message: "output exceeds size limit" },
    { id: "V6", facts: { stage: "run", error: { name: "OutputError", message: "output is not JSON-serializable at $: toJSON present" } }, code: "output_invalid", message: "output is not JSON-serializable at $: toJSON present" },
    { id: "V7", facts: { stage: "run", error: { name: "InternalError", message: "x" } }, code: "runtime_error", message: "InternalError: x" },
  ];
}

function deepFreezeInto(value: unknown): void {
  if (value !== null && typeof value === "object") {
    for (const key of Object.getOwnPropertyNames(value)) {
      deepFreezeInto((value as unknown as Record<string, unknown>)[key]);
    }
    Object.freeze(value);
  }
}

test("C-9712a346: classifyFault agrees with itself twice on each frozen classification vector", () => {
  const vectors = classificationVectors();
  for (const vector of vectors) {
    const facts = structuredClone(vector.facts) as FaultFacts;
    deepFreezeInto(facts);
    let first: { code: SandboxFaultCode; message: string } | undefined;
    let second: { code: SandboxFaultCode; message: string } | undefined;
    assert.doesNotThrow(() => {
      first = classifyFault(facts);
      second = classifyFault(facts);
    }, `classifyFault threw on vector ${vector.id}`);
    assert.deepEqual(first, { code: vector.code, message: vector.message }, `vector ${vector.id}`);
    assert.deepEqual(second, first, `vector ${vector.id} classifies the same twice`);
  }
});
