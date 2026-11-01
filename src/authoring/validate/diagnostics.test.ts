import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { FLOW_ERROR_CODES, FLOW_RESERVED_CODES, FLOW_WARNING_CODES } from "./codes.ts";
import {
  DIAGNOSTICS,
  diagnosticAnchor,
  diagnosticLink,
  renderDiagnosticsDoc,
} from "./diagnostics.ts";

const DOC = "docs/authoring/diagnostics.md";

function allCodes(): string[] {
  return [...FLOW_ERROR_CODES, ...FLOW_WARNING_CODES, ...FLOW_RESERVED_CODES];
}

test("C-73b013e5: the committed document equals renderDiagnosticsDoc and ends with one newline", () => {
  assert.ok(existsSync(DOC), "docs/authoring/diagnostics.md exists");
  let rendered = "";
  assert.doesNotThrow(() => {
    rendered = renderDiagnosticsDoc();
  });
  assert.ok(rendered.length > 0);
  assert.equal(readFileSync(DOC, "utf8"), rendered);
  assert.ok(rendered.endsWith("\n"));
  assert.ok(!rendered.endsWith("\n\n"));
});

test("C-73b013e5: DIAGNOSTICS has one entry per code in list order with single-line text", () => {
  assert.equal(DIAGNOSTICS.length, 53);
  assert.deepEqual(
    DIAGNOSTICS.map((d) => d.code),
    allCodes(),
  );
  for (const d of DIAGNOSTICS) {
    assert.ok(d.summary.length > 0 && !d.summary.includes("\n"), d.code);
    assert.ok(d.fix.length > 0 && !d.fix.includes("\n"), d.code);
  }
  const internal = DIAGNOSTICS.find((d) => d.code === "INTERNAL_ERROR");
  assert.equal(internal?.layer, null);
});

test("C-73b013e5: the file holds exactly one heading per code", () => {
  assert.ok(existsSync(DOC), "docs/authoring/diagnostics.md exists");
  const headings = readFileSync(DOC, "utf8")
    .split("\n")
    .filter((l) => l.startsWith("### "))
    .map((l) => l.slice(4));
  assert.deepEqual(headings, allCodes());
});

test("C-73b013e5: links and anchors", () => {
  let link: string | null = "x";
  let anchor = "";
  let none: string | null = "x";
  assert.doesNotThrow(() => {
    link = diagnosticLink("L1_REQUIRED");
    anchor = diagnosticAnchor("L3_REF_UNKNOWN_PATH");
    none = diagnosticLink("L9_NOPE");
  });
  assert.equal(link, "docs/authoring/diagnostics.md#l1_required");
  assert.equal(anchor, "l3_ref_unknown_path");
  assert.equal(none, null);
});
