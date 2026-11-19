/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findRawColours, parseTokens } from "../contrast.ts";

const DATA_URL = new URL("./data.css", import.meta.url);
const TOKENS_URL = new URL("../tokens.css", import.meta.url);

interface CssRule {
  selector: string;
  body: string;
}

function cssRules(css: string): CssRule[] {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const found: CssRule[] = [];
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = match[1];
    const body = match[2];
    if (selector === undefined || body === undefined) continue;
    found.push({ selector: selector.trim().replace(/\s+/g, " "), body });
  }
  return found;
}

function declarations(body: string): Map<string, string> {
  const declared = new Map<string, string>();
  for (const piece of body.split(";")) {
    const colon = piece.indexOf(":");
    if (colon === -1) continue;
    declared.set(
      piece.slice(0, colon).trim().toLowerCase(),
      piece.slice(colon + 1).trim().replace(/\s+/g, " "),
    );
  }
  return declared;
}

interface Row {
  id: string;
  selector: string;
  decl: Record<string, string>;
  count?: number;
}

const ROWS: Row[] = [
  { id: "D1", selector: ".ui-table-wrap", decl: { "overflow-x": "auto", border: "1px solid var(--ui-color-divider)", "border-radius": "var(--ui-radius-lg)", "box-shadow": "var(--ui-shadow-sm)", background: "var(--ui-color-bg)" }, count: 5 },
  { id: "D2", selector: ".ui-table-caption", decl: { "text-align": "left", "font-weight": "600" } },
  { id: "D3", selector: ".ui-table thead th", decl: { color: "var(--ui-color-text)", background: "var(--ui-color-surface)", "font-weight": "600", "border-bottom": "1px solid var(--ui-color-divider)" } },
  { id: "D4", selector: ".ui-table tbody th, .ui-table tbody td", decl: { "border-bottom": "1px solid var(--ui-color-divider)", "vertical-align": "top" } },
  { id: "D5", selector: ".ui-table tbody tr:hover", decl: { background: "var(--ui-color-accent-surface)" } },
  { id: "D6", selector: ".ui-field", decl: { "max-width": "40rem" } },
  { id: "D7", selector: ".ui-field-inline", decl: { "max-width": "40rem", "flex-wrap": "wrap" } },
  { id: "D8", selector: ".ui-field-hint", decl: { color: "var(--ui-color-text-muted)", "font-size": "0.875rem" } },
  { id: "D9", selector: ".ui-field-error", decl: { color: "var(--ui-color-danger)", "font-size": "0.875rem" } },
  { id: "D10", selector: ".ui-input", decl: { border: "var(--ui-color-border)", width: "100%", "min-height": "var(--ui-target-min)", "box-shadow": "var(--ui-shadow-sm)" } },
  { id: "D11", selector: ".ui-form-actions", decl: { "justify-content": "flex-start" } },
  { id: "D12a", selector: ".ui-form-error", decl: { "max-width": "40rem" } },
  { id: "D12b", selector: ".ui-form-problems", decl: { "max-width": "40rem" } },
  { id: "D13", selector: ".ui-checkbox", decl: { width: "1.5rem", height: "1.5rem" } },
  { id: "D14", selector: '.ui-input[aria-invalid="true"]', decl: { border: "var(--ui-color-danger)" } },
  { id: "D15", selector: ".ui-table-region", decl: { "max-width": "100%" } },
  { id: "D16", selector: ".ui-table tbody tr:last-child > *", decl: { "border-bottom": "0" } },
];

const PINNED = [
  ".ui-table-region",
  ".ui-table-wrap",
  ".ui-table",
  ".ui-table-actions",
  ".ui-form",
  ".ui-form-error",
  ".ui-form-problems",
  ".ui-form-actions",
  ".ui-field",
  ".ui-field-inline",
  ".ui-field-label",
  ".ui-field-required",
  ".ui-field-hint",
  ".ui-field-error",
  ".ui-input",
  ".ui-checkbox",
  ".ui-table thead th",
  ".ui-table tbody th, .ui-table tbody td",
  '.ui-input[aria-invalid="true"]',
  ".ui-table-caption",
  ".ui-table tbody tr:hover",
  ".ui-table tbody tr:last-child > *",
];

function checkRows(data: string): void {
  const rules = cssRules(data);
  for (const selector of PINNED) {
    assert.equal(
      rules.filter((rule) => rule.selector === selector).length,
      1,
      `${selector} is one rule`,
    );
  }
  for (const row of ROWS) {
    const matching = rules.filter((rule) => rule.selector === row.selector);
    assert.equal(matching.length, 1, `${row.id} ${row.selector} is one rule`);
    const declared = declarations(matching[0]?.body ?? "");
    for (const [name, value] of Object.entries(row.decl)) {
      assert.equal(declared.get(name), value, `${row.id} ${name}`);
    }
    if (row.count !== undefined) {
      assert.equal(declared.size, row.count, `${row.id} declaration count`);
    }
  }
}

test("C-66cb6cb0 data.css keeps every pinned rule and adds the new declarations", () => {
  assert.equal(typeof findRawColours, "function");
  assert.equal(typeof parseTokens, "function");
  assert.ok(existsSync(DATA_URL));
  assert.ok(existsSync(TOKENS_URL));
  const data = readFileSync(DATA_URL, "utf8");
  const tokens = parseTokens(readFileSync(TOKENS_URL, "utf8"));

  checkRows(data);
  assert.deepEqual(findRawColours(data), []);
  for (const match of data.matchAll(/var\((--ui-[A-Za-z0-9-]+)/g)) {
    const name = match[1] ?? "";
    assert.ok(name in tokens, `${name} is defined in tokens.css`);
  }
  assert.ok(!data.includes("@media"));
});
