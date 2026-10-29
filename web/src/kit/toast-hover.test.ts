/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findRawColours } from "./contrast.ts";

const THEME = readFileSync(new URL("./theme.css", import.meta.url), "utf8");

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
    found.push({ selector: selector.trim(), body });
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
      piece.slice(colon + 1).trim(),
    );
  }
  return declared;
}

function isToastDismissHover(selector: string): boolean {
  return selector.split(",").some((part) => {
    const value = part.trim();
    return (
      value.includes(":hover") &&
      value.includes(".ui-toast") &&
      (value.includes("button") || value.includes(".ui-button"))
    );
  });
}

test("C-817bfc8a C-92d9ac35 toast dismiss keeps the toast background on hover", () => {
  const hoverRules = cssRules(THEME).filter((rule) =>
    isToastDismissHover(rule.selector),
  );
  assert.ok(
    hoverRules.length > 0,
    "theme.css has a hover rule for the toast dismiss button",
  );

  for (const rule of hoverRules) {
    const declared = declarations(rule.body);
    const background =
      declared.get("background") ?? declared.get("background-color");
    assert.ok(
      background === "transparent" ||
        background === "var(--ui-color-toast-bg)",
      `${rule.selector} keeps a transparent or toast background, got ${String(background)}`,
    );
    const colour = declared.get("color");
    if (colour !== undefined) {
      assert.equal(
        colour,
        "var(--ui-color-toast-text)",
        `${rule.selector} keeps the toast text colour`,
      );
    }
  }

  assert.deepEqual(
    findRawColours(THEME),
    [],
    "the theme uses design tokens, never raw colours",
  );

  const sample = [
    "a { color: #fff; }",
    "b { background: rgb(0 0 0); }",
    "/* #123 */",
    "  --x: #000;",
    "  color: var(--ui-color-text);",
  ].join("\n");
  assert.deepEqual(
    findRawColours(sample).map((hit) => hit.line),
    [1, 2],
    "the raw colour scanner still reports real raw colours",
  );
});
