import assert from "node:assert/strict";
import { test } from "node:test";

import { ESCAPE_CASES, checkEscapeCase } from "./sandbox-escape.ts";
import type { EscapeCase, EscapeExpect } from "./sandbox-escape.ts";
import type {
  SandboxFaultCode,
  SandboxJson,
  SandboxLimits,
  SandboxResult,
} from "../../src/sandbox/index.ts";

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

function deep(n: number): SandboxJson {
  let value: SandboxJson = [];
  for (let i = 1; i < n; i += 1) value = [value];
  return value;
}

function caseOf(id: string): EscapeCase {
  const found = ESCAPE_CASES.find((entry) => entry.id === id);
  assert.ok(found !== undefined, `${id} is part of ESCAPE_CASES`);
  return found;
}

interface NamedCase {
  source: string;
  input: SandboxJson;
  limits: Partial<SandboxLimits>;
  expect: EscapeExpect;
}

const NAMED_CASES: Readonly<Record<string, NamedCase>> = {
  E02: {
    source: "try{return{home:process.env.HOME}}catch(e){return{threw:e.name}}",
    input: {},
    limits: {},
    expect: { ok: true, value: { threw: "ReferenceError" } },
  },
  E17: {
    source: "return {};",
    input: deep(66),
    limits: {},
    expect: { fault: "input_invalid" },
  },
  E18: {
    source: "for(;;){}",
    input: {},
    limits: { timeoutMs: 400 },
    expect: { fault: "timeout" },
  },
  E20: {
    source: "const f=()=>Promise.resolve().then(f); f(); await new Promise(()=>{}); return {};",
    input: {},
    limits: { memoryBytes: 16777216, timeoutMs: 400 },
    expect: { fault: ["timeout", "memory_limit", "never_settled", "runtime_error"] },
  },
  E27: {
    source: "function f(n){return f(n+1)+1} return{v:f(0)};",
    input: {},
    limits: { maxStackBytes: 536870912 },
    expect: { fault: "stack_overflow" },
  },
  E54: {
    source: "return undefined;",
    input: {},
    limits: {},
    expect: { fault: "output_invalid" },
  },
  E59: {
    source:
      "const a = []; for (let i = 0; i < 30; i++) a.push(new Array(200000).fill(i)); return { n: a.length };",
    input: {},
    limits: { memoryBytes: 16777216, timeoutMs: 3000 },
    expect: { fault: "memory_limit" },
  },
};

function okValue(value: SandboxJson): SandboxResult {
  return { ok: true, value: value as { [key: string]: SandboxJson }, stats: { ms: 1, memBytes: 0 } };
}

function okNull(): SandboxResult {
  return { ok: true, value: null, stats: { ms: 1, memBytes: 0 } };
}

function faultOf(code: SandboxFaultCode): SandboxResult {
  return { ok: false, fault: { code, message: "boom" }, stats: { ms: 1, memBytes: 0 } };
}

interface Verdict {
  label: string;
  escape: EscapeCase;
  result: SandboxResult;
  mode: "node" | "hook";
  expected: string | null;
}

function attempt<T>(call: () => T): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: call() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}

test("C-4c8287af: escape case data carries the ids titles and named fields", () => {
  assert.equal(ESCAPE_CASES.length, ESCAPE_IDS.length, "the suite has one case per escape id");
  assert.deepEqual(
    ESCAPE_CASES.map((entry) => entry.id),
    ESCAPE_IDS,
    "the case ids are ESCAPE_IDS in order",
  );

  for (const entry of ESCAPE_CASES) {
    assert.ok(entry.title.length > 0, `${entry.id} has a title`);
  }

  for (const [id, expected] of Object.entries(NAMED_CASES)) {
    const entry = caseOf(id);
    assert.equal(entry.source, expected.source, `${id} source`);
    assert.deepEqual(entry.input, expected.input, `${id} input`);
    assert.deepEqual(entry.limits, expected.limits, `${id} limits`);
    assert.deepEqual(entry.expect, expected.expect, `${id} expect`);
  }

  for (const entry of ESCAPE_CASES) {
    assert.equal(
      entry.hookExpect !== undefined,
      entry.id === "E54",
      `${entry.id} hookExpect presence`,
    );
  }
  assert.deepEqual(caseOf("E54").hookExpect, { ok: true, value: null }, "E54 hookExpect");
});

test("C-4c8287af: checkEscapeCase returns the verdict text of each listed call", () => {
  const synthetic: EscapeCase = {
    id: "X1",
    title: "synthetic ok case",
    source: "return { a: 1 };",
    input: {},
    limits: {},
    expect: { ok: true },
  };

  const verdicts: readonly Verdict[] = [
    {
      label: "E02 expected ReferenceError",
      escape: caseOf("E02"),
      result: okValue({ threw: "ReferenceError" }),
      mode: "node",
      expected: null,
    },
    {
      label: "E02 got TypeError",
      escape: caseOf("E02"),
      result: okValue({ threw: "TypeError" }),
      mode: "node",
      expected:
        'E02: expected ok {"threw":"ReferenceError"}, got ok {"threw":"TypeError"}',
    },
    {
      label: "E18 timeout",
      escape: caseOf("E18"),
      result: faultOf("timeout"),
      mode: "node",
      expected: null,
    },
    {
      label: "E18 got memory_limit",
      escape: caseOf("E18"),
      result: faultOf("memory_limit"),
      mode: "node",
      expected: "E18: expected fault timeout, got fault memory_limit",
    },
    {
      label: "E20 runtime_error is in the set",
      escape: caseOf("E20"),
      result: faultOf("runtime_error"),
      mode: "node",
      expected: null,
    },
    {
      label: "E20 got input_invalid",
      escape: caseOf("E20"),
      result: faultOf("input_invalid"),
      mode: "node",
      expected:
        "E20: expected fault timeout|memory_limit|never_settled|runtime_error, got fault input_invalid",
    },
    {
      label: "E54 node ok null",
      escape: caseOf("E54"),
      result: okNull(),
      mode: "node",
      expected: "E54: expected fault output_invalid, got ok null",
    },
    {
      label: "E54 node output_invalid",
      escape: caseOf("E54"),
      result: faultOf("output_invalid"),
      mode: "node",
      expected: null,
    },
    {
      label: "E54 hook ok null",
      escape: caseOf("E54"),
      result: okNull(),
      mode: "hook",
      expected: null,
    },
    {
      label: "E54 hook got output_invalid",
      escape: caseOf("E54"),
      result: faultOf("output_invalid"),
      mode: "hook",
      expected: "E54: expected ok null, got fault output_invalid",
    },
    {
      label: "X1 expected ok",
      escape: synthetic,
      result: okValue({ a: 1 }),
      mode: "node",
      expected: null,
    },
    {
      label: "X1 got timeout",
      escape: synthetic,
      result: faultOf("timeout"),
      mode: "node",
      expected: "X1: expected ok, got fault timeout",
    },
  ];

  for (const verdict of verdicts) {
    const outcome = attempt(() =>
      checkEscapeCase(verdict.escape, verdict.result, verdict.mode),
    );
    const actual = outcome.ok ? outcome.value : `THREW ${outcome.error}`;
    assert.equal(actual, verdict.expected, verdict.label);
  }
});
