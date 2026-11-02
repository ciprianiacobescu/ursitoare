/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import {
  diagnosticHref,
  diagnosticRows,
  diagnosticsSummary,
  parseValidation,
  textProblemRow,
} from "./diagnostics.ts";
import type { DiagnosticRow, ValidationView } from "./diagnostics.ts";

assert.equal(typeof parseValidation, "function");

const DOCS_BASE = "https://github.com/ciprianiacobescu/ursitoare/blob/main/";
const DOCS_PATH = "docs/authoring/diagnostics.md";

const R: ValidationView = {
  ok: false,
  errors: [
    {
      layer: "L2",
      code: "L2_UNKNOWN_BLOCK",
      node: "fetch",
      path: "/nodes/fetch/uses",
      message: 'block "nope.missing@1" is not in the catalogue',
    },
  ],
  warnings: [
    {
      layer: "L3",
      code: "W_LETHAL_TRIFECTA",
      node: null,
      path: "/nodes",
      message: "flow reads untrusted content",
    },
    {
      layer: "L1",
      code: "W_X",
      node: null,
      path: "",
      message: "m",
    },
  ],
  layers_run: ["L1", "L2", "L3"],
};

const CLEAN: ValidationView = {
  ok: true,
  errors: [],
  warnings: [],
  layers_run: ["L1", "L2", "L3"],
};

function parsed(raw: unknown, label: string): ValidationView {
  let result: ValidationView | null | undefined;
  assert.doesNotThrow(() => {
    result = parseValidation(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== null && result !== undefined, `${label} parses to a view`);
  return result as ValidationView;
}

function refused(raw: unknown, label: string): void {
  let result: ValidationView | null | undefined;
  assert.doesNotThrow(() => {
    result = parseValidation(raw);
  }, `${label} parses without throwing`);
  assert.equal(result, null, `${label} is refused`);
}

function rows(result: ValidationView, label: string): DiagnosticRow[] {
  let built: DiagnosticRow[] | undefined;
  assert.doesNotThrow(() => {
    built = diagnosticRows(result);
  }, `${label} builds rows without throwing`);
  assert.ok(built !== undefined, `${label} produced rows`);
  return built;
}

function href(code: string, label: string): string | null {
  let result: string | null | undefined;
  assert.doesNotThrow(() => {
    result = diagnosticHref(code);
  }, `${label} is linked without throwing`);
  assert.ok(result !== undefined, `${label} produced a link answer`);
  return result as string | null;
}

function summary(result: ValidationView, validatedAt: string | null, label: string): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = diagnosticsSummary(result, validatedAt);
  }, `${label} is summarised without throwing`);
  assert.ok(text !== undefined, `${label} produced a summary`);
  return text;
}

function textRow(error: unknown, label: string): DiagnosticRow | null {
  let result: DiagnosticRow | null | undefined;
  assert.doesNotThrow(() => {
    result = textProblemRow(error, "rf-1-core");
  }, `${label} builds a row without throwing`);
  assert.ok(result !== undefined, `${label} produced an answer`);
  return result as DiagnosticRow | null;
}

test("C-36b16be8 parseValidation keeps a valid validation result", () => {
  assert.deepEqual(parsed(R, "the engine result"), R);
});

test("C-36b16be8 parseValidation refuses a bad ok a bad code and a bad node", () => {
  refused({ ...R, ok: "yes" }, "a string ok");
  refused(
    {
      ok: true,
      errors: [{ layer: "L2", code: "bad code", node: null, path: "", message: "m" }],
      warnings: [],
      layers_run: ["L1"],
    },
    "a code with a space",
  );
  refused(
    {
      ok: true,
      errors: [{ layer: "L2", code: "L2_UNKNOWN_BLOCK", node: 5, message: "m" }],
      warnings: [],
      layers_run: [],
    },
    "a numeric node without a path",
  );
});

test("C-36b16be8 diagnosticRows lists the error then the warnings", () => {
  assert.deepEqual(rows(R, "the engine result"), [
    {
      key: "error:0",
      severity: "error",
      code: "L2_UNKNOWN_BLOCK",
      message: 'block "nope.missing@1" is not in the catalogue',
      where: "Node fetch · /nodes/fetch/uses",
      href: `${DOCS_BASE}${DOCS_PATH}#l2_unknown_block`,
      linkText: "Guide for L2_UNKNOWN_BLOCK (opens in a new tab)",
      path: "/nodes/fetch/uses",
      position: null,
    },
    {
      key: "warning:0",
      severity: "warning",
      code: "W_LETHAL_TRIFECTA",
      message: "flow reads untrusted content",
      where: "/nodes",
      href: `${DOCS_BASE}${DOCS_PATH}#w_lethal_trifecta`,
      linkText: "Guide for W_LETHAL_TRIFECTA (opens in a new tab)",
      path: "/nodes",
      position: null,
    },
    {
      key: "warning:1",
      severity: "warning",
      code: "W_X",
      message: "m",
      where: "Whole flow",
      href: `${DOCS_BASE}${DOCS_PATH}#w_x`,
      linkText: "Guide for W_X (opens in a new tab)",
      path: "",
      position: null,
    },
  ]);
});

test("C-36b16be8 diagnosticHref links the engine codes and nothing else", () => {
  assert.equal(href("L1_PARSE", "L1_PARSE"), `${DOCS_BASE}${DOCS_PATH}#l1_parse`);
  assert.equal(
    href("W_LETHAL_TRIFECTA", "W_LETHAL_TRIFECTA"),
    `${DOCS_BASE}${DOCS_PATH}#w_lethal_trifecta`,
  );
  assert.equal(
    href("INTERNAL_ERROR", "INTERNAL_ERROR"),
    `${DOCS_BASE}${DOCS_PATH}#internal_error`,
  );
  assert.equal(href("FORMAT_YAML_SYNTAX", "FORMAT_YAML_SYNTAX"), null);
  assert.equal(href("l2_lower", "a lower-case code"), null);
  assert.equal(href("L2_X\nY", "a code with a newline"), null);
});

test("C-36b16be8 diagnosticsSummary counts the issues and formats the time", () => {
  assert.equal(
    summary(R, "2026-10-25T09:00:00.000000Z", "the invalid result"),
    "Not valid. 1 error, 2 warnings. Layers run: L1, L2, L3. Checked 2026-10-25 09:00:00 UTC.",
  );
  assert.equal(
    summary(CLEAN, null, "the valid result without a time"),
    "Valid. 0 errors, 0 warnings. Layers run: L1, L2, L3.",
  );
});

test("C-92ac8872 textProblemRow shows a parse error where it was found", () => {
  const yaml = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: {
      reason: "parse",
      code: "FORMAT_YAML_SYNTAX",
      message: "Unexpected end",
      line: 3,
      column: 2,
    },
  });
  assert.deepEqual(textRow(yaml, "the YAML parse error"), {
    key: "text:0",
    severity: "error",
    code: "FORMAT_YAML_SYNTAX",
    message: "Unexpected end",
    where: "Line 3, column 2",
    href: null,
    linkText: null,
    path: null,
    position: { line: 3, column: 2 },
  });

  const json = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: { reason: "parse", code: "FORMAT_JSON_SYNTAX", message: "Bad token" },
  });
  assert.deepEqual(textRow(json, "the JSON parse error"), {
    key: "text:0",
    severity: "error",
    code: "FORMAT_JSON_SYNTAX",
    message: "Bad token",
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  });
});

test("C-92ac8872 textProblemRow names a parse error that has no message", () => {
  const notJson = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: { reason: "parse", code: "FORMAT_NOT_JSON" },
  });
  assert.deepEqual(textRow(notJson, "the not JSON error"), {
    key: "text:0",
    severity: "error",
    code: "FORMAT_NOT_JSON",
    message: "The flow text is not a readable flow document (FORMAT_NOT_JSON).",
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  });
});

test("C-92ac8872 textProblemRow explains the reason a text is refused", () => {
  const notObject = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: { reason: "not_object" },
  });
  assert.deepEqual(textRow(notObject, "the not object reason"), {
    key: "text:0",
    severity: "error",
    code: "FLOW_TEXT_INVALID",
    message: "The text must describe one flow: a mapping with keys such as flow, start and nodes.",
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  });

  const nameMismatch = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: { reason: "name_mismatch" },
  });
  assert.deepEqual(textRow(nameMismatch, "the name mismatch reason"), {
    key: "text:0",
    severity: "error",
    code: "FLOW_TEXT_INVALID",
    message: 'The flow key must be "rf-1-core", the name of this flow.',
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  });

  const other = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: { reason: "other" },
  });
  assert.deepEqual(textRow(other, "an unknown reason"), {
    key: "text:0",
    severity: "error",
    code: "FLOW_TEXT_INVALID",
    message: "The text is not a flow document.",
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  });
});

test("C-92ac8872 textProblemRow cuts a long message and ignores other errors", () => {
  const long = new ApiRequestError(422, "FLOW_TEXT_INVALID", "m", {
    details: {
      reason: "parse",
      code: "FORMAT_YAML_SYNTAX",
      message: "x".repeat(400),
    },
  });
  const row = textRow(long, "the long parse error");
  assert.ok(row !== null, "the long parse error gives a row");
  assert.equal(row.message, `${"x".repeat(299)}…`, "the message is cut to 300 characters");
  assert.equal(row.message.length, 300, "the cut message is 300 characters long");
  assert.ok(row.message.endsWith("…"), "the cut message ends with an ellipsis");
  assert.equal(row.where, "Whole text", "a message without a place is whole text");

  assert.equal(
    textRow(new ApiRequestError(409, "ALREADY_EXISTS", "m"), "a conflict"),
    null,
    "a conflict gives no text row",
  );
  assert.equal(textRow(new Error("x"), "a plain error"), null, "a plain error gives no text row");
});
