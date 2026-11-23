import assert from "node:assert/strict";
import { test } from "node:test";

import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { validateFlowText } from "./validate.ts";
import { codeSourceProblems } from "./code-source.ts";

type Problem = { code: string; message: string };

function flowText(source: string): string {
  return JSON.stringify({
    ursitoare: "0.1",
    flow: "probe",
    version: "1.0.0",
    inputs: { type: "object" },
    start: "c",
    nodes: {
      c: { kind: "code", language: "js", input: {}, source, output_schema: { type: "object" }, next: "d" },
      d: { kind: "end", status: "completed" },
    },
  });
}

function l1Problems(source: string): Problem[] {
  let r: { errors: Problem[] } | undefined;
  assert.doesNotThrow(() => {
    r = validateFlowText(flowText(source), "json", loadTestCatalogue()) as { errors: Problem[] };
  });
  assert.ok(r);
  const result = r as { errors: Problem[] };
  return result.errors
    .filter((e) => e.code.startsWith("L1_CODE"))
    .map((e) => ({ code: e.code, message: e.message }));
}

test("C-d12dba13 codeSourceProblems matches L1 on P1 to P10", () => {
  assert.equal(typeof codeSourceProblems, "function");

  const rows: { source: string; code: string | null }[] = [
    { source: "return { words: 3 };", code: null },
    { source: "return { a: typeof fetch };", code: null },
    { source: "return {", code: "L1_CODE_SYNTAX" },
    { source: "const x = ;\nreturn { a: 1 };", code: "L1_CODE_SYNTAX" },
    { source: "const x = 1;", code: "L1_CODE_NO_RETURN" },
    { source: "function f() { return 1; }\nf();", code: "L1_CODE_NO_RETURN" },
    { source: "", code: "L1_CODE_NO_RETURN" },
    { source: "const f = () => { return 1; };", code: "L1_CODE_NO_RETURN" },
    { source: "await 1; return {};", code: "L1_CODE_SYNTAX" },
    { source: "return 5 5;", code: "L1_CODE_SYNTAX" },
  ];

  for (const row of rows) {
    let got: Problem[] | undefined;
    assert.doesNotThrow(() => {
      got = codeSourceProblems(row.source);
    });
    const arr = (got ?? []) as Problem[];
    assert.ok(Array.isArray(arr));
    const expected = l1Problems(row.source);
    assert.deepEqual(arr, expected, row.source);
    if (row.code === null) {
      assert.equal(arr.length, 0, row.source);
    } else {
      assert.equal(arr.length, 1, row.source);
      const first = arr[0] as Problem;
      assert.equal(first.code, row.code, row.source);
    }
  }
});

test("C-d12dba13 codeSourceProblems sanitizes P11 and P12", () => {
  assert.equal(typeof codeSourceProblems, "function");

  const expectedMessage = "code source does not parse (line 1): Unexpected character '\ufffd'";

  const p11 = "return { a: 1 } \ud800 ;";
  let got11: Problem[] | undefined;
  assert.doesNotThrow(() => {
    got11 = codeSourceProblems(p11);
  });
  const arr11 = (got11 ?? []) as Problem[];
  assert.ok(Array.isArray(arr11));
  assert.equal(arr11.length, 1);
  const first11 = arr11[0] as Problem;
  assert.equal(first11.code, "L1_CODE_SYNTAX");
  assert.equal(first11.message, expectedMessage);
  assert.equal(first11.message.isWellFormed(), true);
  assert.equal(first11.message.includes("\ud800"), false);
  assert.equal(first11.message.includes("\u0000"), false);

  const p12 = "return " + "\u0000" + ";";
  let got12: Problem[] | undefined;
  assert.doesNotThrow(() => {
    got12 = codeSourceProblems(p12);
  });
  const arr12 = (got12 ?? []) as Problem[];
  assert.ok(Array.isArray(arr12));
  assert.equal(arr12.length, 1);
  const first12 = arr12[0] as Problem;
  assert.equal(first12.code, "L1_CODE_SYNTAX");
  assert.equal(first12.message, expectedMessage);
  assert.equal(first12.message.isWellFormed(), true);
  assert.equal(first12.message.includes("\u0000"), false);
});
