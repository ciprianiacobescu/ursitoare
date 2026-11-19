/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findRawColours, parseTokens } from "./contrast.ts";

const THEME_URL = new URL("./theme.css", import.meta.url);
const TOKENS_URL = new URL("./tokens.css", import.meta.url);

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
  { id: "R1", selector: ".ui-button", decl: { "font-weight": "500", background: "var(--ui-color-surface)", color: "var(--ui-color-text)" } },
  { id: "R2", selector: '.ui-button:disabled, .ui-button[aria-disabled="true"]', decl: { color: "var(--ui-color-text-muted)", cursor: "not-allowed" } },
  { id: "R3", selector: '.ui-button[data-tone="primary"]', decl: { "border-color": "var(--ui-color-accent)", background: "var(--ui-color-accent)", color: "var(--ui-color-on-accent)" } },
  { id: "R4", selector: '.ui-button[data-tone="primary"]:hover', decl: { background: "var(--ui-color-accent)", filter: "brightness(0.9)" } },
  { id: "R5", selector: '.ui-button[data-tone="danger"]', decl: { "border-color": "var(--ui-color-danger)", background: "var(--ui-color-danger)", color: "var(--ui-color-on-danger)" } },
  { id: "R6", selector: '.ui-button[data-tone="danger"]:hover', decl: { background: "var(--ui-color-danger)", filter: "brightness(0.9)" } },
  { id: "R7", selector: '.ui-button[data-tone][aria-disabled="true"]', decl: { filter: "none", opacity: "0.6" } },
  { id: "R8", selector: ".ui-toast", decl: { background: "var(--ui-color-toast-bg)", color: "var(--ui-color-toast-text)", "border-radius": "var(--ui-radius-lg)" } },
  { id: "R9", selector: ".ui-toast button", decl: { background: "transparent", "box-shadow": "none", color: "var(--ui-color-toast-text)", "font-weight": "inherit" } },
  { id: "R10", selector: ".ui-toast button:hover, .ui-toast .ui-button:hover", decl: { background: "transparent", color: "var(--ui-color-toast-text)" }, count: 2 },
  { id: "R11", selector: ".ui-toast button:focus-visible, .ui-toast .ui-button:focus-visible", decl: { "outline-color": "var(--ui-color-toast-text)" }, count: 1 },
  { id: "R12", selector: ".ui-dialog", decl: { width: "32rem", "max-width": "calc(100vw - 2rem)", border: "1px solid var(--ui-color-divider)", "border-radius": "var(--ui-radius-lg)" } },
  { id: "R13", selector: ".ui-dialog::backdrop", decl: { background: "var(--ui-color-text)", opacity: "0.5" } },
  { id: "R14", selector: ".ui-error", decl: { border: "1px solid var(--ui-color-danger)", background: "var(--ui-color-danger-surface)", color: "var(--ui-color-danger-text)" } },
  { id: "R15", selector: ".ui-error .ui-button", decl: { "min-height": "2rem" } },
  { id: "R16", selector: ".ui-empty", decl: { border: "1px dashed var(--ui-color-divider)", "border-radius": "var(--ui-radius-lg)" } },
  { id: "R17", selector: ".ui-loading", decl: { background: "var(--ui-color-surface)", color: "var(--ui-color-text-muted)" } },
  { id: "R18", selector: ".ui-page-header", decl: { display: "grid" } },
  { id: "R18b", selector: ".ui-page-header-title", decl: { "overflow-wrap": "anywhere" } },
  { id: "R18c", selector: ".ui-page-header-description", decl: { "overflow-wrap": "anywhere" } },
  { id: "R19", selector: ".ui-section", decl: { display: "grid", border: "1px solid var(--ui-color-divider)", "border-radius": "var(--ui-radius-lg)" } },
  { id: "R20", selector: ".ui-visually-hidden", decl: { position: "absolute", clip: "rect(0, 0, 0, 0)" } },
];

function checkRows(theme: string): void {
  const rules = cssRules(theme);
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
  const disabled = rules.findIndex((rule) => rule.selector === ROWS[1]?.selector);
  const primary = rules.findIndex((rule) => rule.selector === ROWS[2]?.selector);
  assert.ok(disabled >= 0 && primary > disabled, "primary tone rule follows the disabled rule");
}

test("C-3192e29f tone, dialog, state and toast rules are token-only and the toast is unchanged", () => {
  assert.equal(typeof findRawColours, "function");
  assert.equal(typeof parseTokens, "function");
  assert.ok(existsSync(THEME_URL));
  assert.ok(existsSync(TOKENS_URL));
  const theme = readFileSync(THEME_URL, "utf8");
  const tokensCss = readFileSync(TOKENS_URL, "utf8");

  checkRows(theme);
  assert.deepEqual(findRawColours(theme), []);

  const tokens = parseTokens(tokensCss);
  for (const match of theme.matchAll(/var\((--ui-[A-Za-z0-9-]+)/g)) {
    const name = match[1] ?? "";
    assert.ok(name in tokens, `${name} is defined in tokens.css`);
  }
  assert.equal(
    Object.keys(tokens).filter((name) => name.startsWith("--ui-color-")).length,
    25,
  );
  assert.equal(tokens["--ui-color-toast-bg"], "#1b1f27");

  const mutations = [
    theme.replace(
      /(\.ui-toast\s*\{[^}]*?)background:\s*var\(--ui-color-toast-bg\)/,
      "$1background: red",
    ),
    theme.replace(
      /(\.ui-toast button:hover,\s*\.ui-toast \.ui-button:hover\s*\{[^}]*?)background:\s*transparent/,
      "$1background: var(--ui-color-bg)",
    ),
    theme.replace(/\.ui-button\[data-tone="primary"\]\s*\{[^}]*\}/, ""),
  ];
  for (const mutated of mutations) {
    assert.notEqual(mutated, theme);
    assert.throws(() => checkRows(mutated), assert.AssertionError);
  }
});
