/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import type { StringMap } from "../contrast.ts";
import { findInlineStyleUse, findRawColours, parseTokens } from "../contrast.ts";

assert.equal(typeof findRawColours, "function");
assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof parseTokens, "function");

const DATA_CSS_URL = new URL("./data.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../tokens.css", import.meta.url);

const DATA_CLASSES = [
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
] as const;

interface Rule {
  readonly selector: string;
  readonly body: string;
}

function rules(css: string): Rule[] {
  const found: Rule[] = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of css.matchAll(pattern)) {
    const selector = (match[1] ?? "").trim();
    const body = (match[2] ?? "").trim();
    if (selector.length > 0) {
      found.push({ selector, body });
    }
  }
  return found;
}

function ruleFor(css: string, selector: string): Rule {
  const candidates = rules(css).filter((rule) => rule.selector === selector);
  assert.equal(candidates.length, 1, `one rule for ${selector}`);
  const rule = candidates[0];
  assert.ok(rule !== undefined, `the rule for ${selector} was found`);
  return rule;
}

function readCss(tokens: boolean): string {
  const url = tokens ? TOKENS_CSS_URL : DATA_CSS_URL;
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

function tokenUses(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    const name = match[1];
    assert.ok(name !== undefined, "a var use was read");
    found.push(name);
  }
  return found;
}

test("C-74fd23b0 data css holds the 16 classes and the target token", () => {
  const css = readCss(false);
  for (const className of DATA_CLASSES) {
    assert.ok(css.includes(className), `${className} is styled`);
  }
  assert.ok(css.includes("var(--ui-target-min)"), "the target size token is used");
});

test("C-74fd23b0 data css uses only defined kit tokens and no raw colours", () => {
  const css = readCss(false);
  const tokens: StringMap = parseTokens(readCss(true));
  assert.deepEqual(findRawColours(css), []);
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `the token ${name} is defined by tokens.css`);
  }
});

test("C-74fd23b0 data css colours the parts as the design states", () => {
  const css = readCss(false);

  const tableHead = ruleFor(css, ".ui-table thead th");
  assert.ok(tableHead.body.includes("color: var(--ui-color-text)"));
  assert.ok(tableHead.body.includes("var(--ui-color-surface)"));

  for (const muted of [".ui-field-hint", ".ui-field-required"]) {
    assert.ok(
      ruleFor(css, muted).body.includes("color: var(--ui-color-text-muted)"),
      `${muted} is muted text`,
    );
  }

  assert.ok(
    ruleFor(css, ".ui-field-error").body.includes("color: var(--ui-color-danger)"),
    "the field error is danger text",
  );

  for (const panel of [".ui-form-error", ".ui-form-problems"]) {
    const body = ruleFor(css, panel).body;
    assert.ok(body.includes("color: var(--ui-color-danger-text)"), `${panel} is danger text`);
    assert.ok(
      body.includes("var(--ui-color-danger-surface)"),
      `${panel} sits on the danger surface`,
    );
  }

  const input = ruleFor(css, ".ui-input");
  assert.ok(input.body.includes("color: var(--ui-color-text)"));
  assert.ok(input.body.includes("var(--ui-color-bg)"));
  assert.ok(input.body.includes("border: var(--ui-color-border)"), "input lines use the border token");

  const invalid = ruleFor(css, '.ui-input[aria-invalid="true"]');
  assert.ok(invalid.body.includes("var(--ui-color-danger)"), "an invalid input gets a danger border");
});

test("C-74fd23b0 data css sizes and spacing use the kit tokens", () => {
  const css = readCss(false);

  const used = tokenUses(css);
  assert.ok(used.some((name) => name.startsWith("--ui-space-")), "spacing uses --ui-space-*");
  assert.ok(used.includes("--ui-radius"), "corners use --ui-radius");
  assert.ok(used.includes("--ui-font-size"), "text uses --ui-font-size");

  const input = ruleFor(css, ".ui-input");
  assert.ok(input.body.includes("width: 100%"), "the input is full width");
  assert.ok(input.body.includes("min-height: var(--ui-target-min)"), "the input meets the target size");

  const checkbox = ruleFor(css, ".ui-checkbox");
  assert.ok(checkbox.body.includes("width: 1.5rem"));
  assert.ok(checkbox.body.includes("height: 1.5rem"), "the checkbox is 1.5rem square");

  assert.ok(
    ruleFor(css, ".ui-table-wrap").body.includes("overflow-x: auto"),
    "the table wrap scrolls sideways",
  );
});
