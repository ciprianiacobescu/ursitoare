import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  FLOW_ERROR_CODES,
  FLOW_RESERVED_CODES,
  FLOW_WARNING_CODES,
} from "../validate/codes.ts";
import { DIAGNOSTICS, diagnosticLink } from "../validate/diagnostics.ts";
import { HOOK_ERROR_CODES, HOOK_WARNING_CODES, HOOKLESS_KINDS } from "./index.ts";

const DOC = "docs/authoring/diagnostics.md";

test("C-d672ebad: hook codes have links and unknown ones none", () => {
  assert.equal(diagnosticLink("H_ROUTE_EFFECT"), `${DOC}#h_route_effect`);
  assert.equal(diagnosticLink("W_NO_MATCH"), `${DOC}#w_no_match`);
  assert.equal(diagnosticLink("H_CYCLE"), `${DOC}#h_cycle`);
  assert.equal(diagnosticLink("H_NOPE"), null);
});

test("C-d672ebad C-8919e1d9: the hook lists are exact and apart from the flow lists", () => {
  assert.deepEqual(
    [...HOOK_ERROR_CODES],
    [
      "H_SCHEMA",
      "H_BLOCK",
      "H_ROUTE_TARGET",
      "H_ROUTE_HUMAN",
      "H_ROUTE_EFFECT",
      "H_RETRY_SCOPE",
      "H_CYCLE",
      "H_DOMINANCE",
    ],
  );
  assert.deepEqual([...HOOK_WARNING_CODES], ["W_NO_MATCH"]);
  assert.deepEqual([...HOOKLESS_KINDS], ["agent", "foreach", "human.form", "subflow"]);
  assert.equal(FLOW_ERROR_CODES.length, 47);
  assert.deepEqual([...FLOW_RESERVED_CODES], ["INTERNAL_ERROR"]);
  for (const code of [...HOOK_ERROR_CODES, ...HOOK_WARNING_CODES]) {
    assert.ok(!FLOW_ERROR_CODES.includes(code), code);
    assert.ok(!FLOW_WARNING_CODES.includes(code), code);
    assert.ok(!FLOW_RESERVED_CODES.includes(code), code);
    assert.notEqual(diagnosticLink(code), null, code);
  }
});

test("C-73b013e5: the nine hook entries have layer H and single-line text", () => {
  const hookCodes = [...HOOK_ERROR_CODES, ...HOOK_WARNING_CODES];
  const entries = DIAGNOSTICS.filter((d) => hookCodes.includes(d.code));
  assert.deepEqual(
    entries.map((d) => d.code),
    hookCodes,
  );
  assert.equal(entries.length, 9);
  for (const d of entries) {
    assert.equal(d.layer, "H", d.code);
    assert.ok(d.summary.length > 0 && !d.summary.includes("\n"), d.code);
    assert.ok(d.fix.length > 0 && !d.fix.includes("\n"), d.code);
  }
});

test("C-73b013e5: the document has a heading for each hook code", () => {
  const headings = readFileSync(DOC, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("### "))
    .map((l) => l.slice(4));
  const hookCodes = [...HOOK_ERROR_CODES, ...HOOK_WARNING_CODES];
  assert.deepEqual(
    headings.filter((h) => hookCodes.includes(h)),
    hookCodes,
  );
});
