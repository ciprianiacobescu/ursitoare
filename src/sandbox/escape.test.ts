import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { createWorkerSandbox } from "./index.ts";
import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxOptions,
  SandboxResult,
  WorkerSandbox,
} from "./index.ts";
import { ESCAPE_CASES, checkEscapeCase } from "../../test/support/sandbox-escape.ts";
import type { EscapeCase } from "../../test/support/sandbox-escape.ts";

const LIM: SandboxLimits = {
  timeoutMs: 1000,
  memoryBytes: 33554432,
  maxStackBytes: 262144,
  maxOutputBytes: 1048576,
};

const ESCAPE_OPTIONS: SandboxOptions = {
  seed: "escape",
  nowIso: "2026-10-24T12:00:00.000Z",
  binding: "input",
  result: "object",
};

const HOOK_OPTIONS: SandboxOptions = {
  ...ESCAPE_OPTIONS,
  binding: "ctx",
  result: "object_or_null",
};

const NORMALIZE =
  "return { amount: Math.round(input.amount * 100) / 100, currency: input.currency.toUpperCase(), is_large: input.amount > 1000 };";

const NORMALIZE_VALUE: SandboxJson = { amount: 1234.57, currency: "EUR", is_large: true };

const ESCAPE_IDS: readonly string[] = [
  "E01",
  "E02",
  "E03",
  "E04",
  "E05",
  "E06",
  "E07",
  "E08",
  "E09",
  "E10",
  "E11",
  "E13",
  "E14",
  "E16",
  "E17",
  "E18",
  "E19",
  "E20",
  "E21",
  "E22",
  "E23",
  "E24",
  "E25",
  "E26",
  "E27",
  "E28",
  "E29",
  "E30",
  "E31",
  "E32",
  "E33",
  "E46",
  "E47",
  "E48",
  "E49",
  "E50",
  "E51",
  "E53",
  "E54",
  "E55",
  "E56",
  "E59",
];

const ESCAPE_CASES_DIGEST = "3c1b49c560e10c65d0cc0d7f26e930ad26dfe4341d79d3bc6e30f44d7fbe9b6f";
const VARIANTS_DIGEST = "1c18ea7cb5e2e9eadac4a296fef9bc6d657f80eeb20aa7cb4a4058ab18ec1db0";

interface VariantExpect {
  fault: SandboxFaultCode | readonly SandboxFaultCode[];
}

interface Variant {
  id: string;
  source: string;
  limits: Partial<SandboxLimits>;
  expect: VariantExpect;
}

const VARIANTS: readonly Variant[] = [
  {
    id: "E13b",
    source: "with ({}) { return {}; }",
    limits: {},
    expect: { fault: "syntax_error" },
  },
  {
    id: "E21b",
    source: "const o = { get x() { for (;;) {} } }; return { v: o.x };",
    limits: { timeoutMs: 400 },
    expect: { fault: "timeout" },
  },
  {
    id: "E23b",
    source:
      "return { m: ('a'.repeat(50) + 'b').replace(/(x+x+)+y/g, '').length + /(a|aa)+$/.test('a'.repeat(60) + 'b') };",
    limits: { timeoutMs: 400 },
    expect: { fault: "timeout" },
  },
  {
    id: "E32b",
    source: "return { s: '€'.repeat(40000) };",
    limits: { maxOutputBytes: 100000 },
    expect: { fault: "output_too_large" },
  },
  {
    id: "E53b",
    source: "Object.prototype.toJSON = () => ({ evil: 1 }); return { a: 1 };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E29b",
    source: "return { v: new Array(2 ** 32 - 1).fill(0).length };",
    limits: { timeoutMs: 3000 },
    expect: { fault: ["memory_limit", "runtime_error"] },
  },
  {
    id: "E29c",
    source: "return { v: String(2n ** 100000000n).length };",
    limits: { timeoutMs: 3000 },
    expect: { fault: ["memory_limit", "runtime_error"] },
  },
  {
    id: "E29d",
    source: "return { v: new Uint8Array(2 ** 31).length };",
    limits: { timeoutMs: 3000 },
    expect: { fault: ["memory_limit", "runtime_error"] },
  },
  {
    id: "E29e",
    source: "return { v: 'x'.repeat(2 ** 30).length };",
    limits: { timeoutMs: 3000 },
    expect: { fault: ["memory_limit", "runtime_error"] },
  },
  {
    id: "E54a",
    source: "return { f() {} };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54b",
    source: "return { u: undefined };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54c",
    source: "return { b: 1n };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54d",
    source: "return { n: NaN };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54e",
    source: "return { n: Infinity };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54f",
    source: "return { d: new Date() };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54g",
    source: "return { m: new Map() };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54h",
    source: "return { s: Symbol('x') };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54i",
    source: "const o = {}; o.o = o; return o;",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54j",
    source: "return { get g() { return 1; } };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54k",
    source: "return { a: [1, , 3] };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54l",
    source: "class A {} return { a: new A() };",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54m",
    source: "return [1, 2];",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54n",
    source: "return 5;",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54o",
    source: "return null;",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54p",
    source: "return 'str';",
    limits: {},
    expect: { fault: "output_invalid" },
  },
  {
    id: "E54q",
    source: "let o = {}; for (let i = 1; i < 101; i++) o = { n: o }; return o;",
    limits: {},
    expect: { fault: "output_invalid" },
  },
];

const FRESH_A =
  "globalThis.secret = 'S3CR3T'; Object.prototype.leak = 1; Array.prototype.leak = 2; String.prototype.leak = 3; Date.prototype.leak = 4; try { Math.random = () => 4; } catch (e) {} return { ok: 1 };";

const FRESH_B =
  "return { secret: typeof globalThis.secret, o: ({}).leak ?? null, ar: [].leak ?? null, s: 'x'.leak ?? null, d: new Date().leak ?? null, rnd: Math.random() };";

const FRESH_R = "return { rnd: Math.random() };";

function canon(value: unknown): string {
  return JSON.stringify(value, (_key, inner) =>
    inner && typeof inner === "object" && !Array.isArray(inner)
      ? Object.fromEntries(
          Object.entries(inner).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
        )
      : inner,
  );
}

function digestOf(value: unknown): string {
  return createHash("sha256").update(canon(value)).digest("hex");
}

function caseOf(id: string): EscapeCase {
  const found = ESCAPE_CASES.find((entry) => entry.id === id);
  assert.ok(found !== undefined, `${id} is part of ESCAPE_CASES`);
  return found;
}

function passed(entry: EscapeCase, result: SandboxResult, mode: "node" | "hook"): string | null {
  try {
    return checkEscapeCase(entry, result, mode);
  } catch (error) {
    return `THREW ${error instanceof Error ? error.message : String(error)}`;
  }
}

function objectValue(result: SandboxResult, label: string): { [key: string]: SandboxJson } {
  if (!result.ok) {
    assert.fail(`${label}: expected ok, got fault ${result.fault.code}: ${result.fault.message}`);
  }
  if (result.value === null) {
    assert.fail(`${label}: expected an object value, got null`);
  }
  return result.value;
}

function runWith(
  sandbox: WorkerSandbox,
  code: string,
  input: SandboxJson,
  limits: SandboxLimits,
  options: SandboxOptions,
): Promise<SandboxResult> {
  return sandbox.run(code, input, limits, options);
}

test("C-7d1dc855: the escape case and variant data hash to the published digests", () => {
  const caseEntries = ESCAPE_CASES.map((entry) => {
    const projected: Record<string, unknown> = {
      id: entry.id,
      source: entry.source,
      input: entry.input,
      limits: entry.limits ?? {},
      expect: entry.expect,
    };
    if (entry.hookExpect !== undefined) projected["hookExpect"] = entry.hookExpect;
    return projected;
  });
  assert.equal(digestOf(caseEntries), ESCAPE_CASES_DIGEST, "ESCAPE_CASES digest");

  const variantEntries = VARIANTS.map((variant) => ({
    id: variant.id,
    source: variant.source,
    input: {},
    limits: variant.limits,
    expect: variant.expect,
  }));
  assert.equal(digestOf(variantEntries), VARIANTS_DIGEST, "VARIANTS digest");
});

test("C-7d1dc855: every escape case passes on a real pool in both modes and leaves the host unchanged", async () => {
  const prototypeBefore = Object.getOwnPropertyNames(Object.prototype);
  const e16Before = JSON.stringify(caseOf("E16").input);

  const sandbox = createWorkerSandbox({ size: 2 });
  try {
    for (const mode of ["node", "hook"] as const) {
      const options = mode === "node" ? ESCAPE_OPTIONS : HOOK_OPTIONS;
      const seen: string[] = [];
      for (const entry of ESCAPE_CASES) {
        const result = await runWith(
          sandbox,
          entry.source,
          entry.input,
          { ...LIM, ...(entry.limits ?? {}) },
          options,
        );
        seen.push(entry.id);
        assert.equal(passed(entry, result, mode), null, `${mode} ${entry.id}`);
      }
      assert.deepEqual(seen, ESCAPE_IDS, `${mode} sweep visits the ids in order`);
    }

    for (const variant of VARIANTS) {
      const result = await runWith(
        sandbox,
        variant.source,
        {},
        { ...LIM, ...variant.limits },
        ESCAPE_OPTIONS,
      );
      if (result.ok) {
        assert.fail(`${variant.id}: expected a fault, got ok ${JSON.stringify(result.value)}`);
      }
      const set: readonly SandboxFaultCode[] =
        typeof variant.expect.fault === "string" ? [variant.expect.fault] : variant.expect.fault;
      assert.ok(set.includes(result.fault.code), `${variant.id}: got ${result.fault.code}`);
    }

    const normalize = await runWith(
      sandbox,
      NORMALIZE,
      { amount: 1234.567, currency: "eur" },
      LIM,
      ESCAPE_OPTIONS,
    );
    assert.deepEqual(objectValue(normalize, "NORMALIZE"), NORMALIZE_VALUE, "NORMALIZE value");
  } finally {
    await sandbox.close();
  }

  const fresh = createWorkerSandbox({ size: 1 });
  try {
    const a = await runWith(fresh, FRESH_A, {}, LIM, ESCAPE_OPTIONS);
    assert.deepEqual(objectValue(a, "FRESH A"), { ok: 1 }, "FRESH run A");
    const b = await runWith(fresh, FRESH_B, {}, LIM, ESCAPE_OPTIONS);
    const r = await runWith(fresh, FRESH_R, {}, LIM, ESCAPE_OPTIONS);
    const rValue = objectValue(r, "FRESH R");
    assert.deepEqual(
      objectValue(b, "FRESH B"),
      {
        secret: "undefined",
        o: null,
        ar: null,
        s: null,
        d: null,
        rnd: rValue["rnd"],
      },
      "FRESH run B sees none of run A's state",
    );
  } finally {
    await fresh.close();
  }

  assert.equal(JSON.stringify(caseOf("E16").input), e16Before, "the caller's E16 input is unchanged");
  assert.deepEqual(
    Object.getOwnPropertyNames(Object.prototype),
    prototypeBefore,
    "Object.prototype is unchanged",
  );
  assert.equal(
    ({} as Record<string, unknown>)["polluted"],
    undefined,
    "no pollution reached the host",
  );
});
