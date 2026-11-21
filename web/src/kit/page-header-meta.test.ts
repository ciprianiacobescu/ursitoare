/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const THEME_URL = new URL("./theme.css", import.meta.url);

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

test("C-6027f26f the page header meta is a full-width wrapping row with a gap", () => {
  const theme = readFileSync(THEME_URL, "utf8");
  const rules = cssRules(theme);

  const meta = rules.filter((rule) => rule.selector === ".ui-page-header-meta");
  assert.equal(meta.length, 1, ".ui-page-header-meta is one rule");
  const declared = declarations(meta[0]?.body ?? "");

  assert.equal(
    declared.get("grid-column"),
    "1 / -1",
    "the meta spans both header columns below the title",
  );
  assert.equal(declared.get("display"), "flex", "the meta is a row");
  assert.equal(declared.get("flex-wrap"), "wrap", "the meta wraps at narrow widths");
  assert.equal(declared.get("align-items"), "center", "the meta items share a baseline");
  assert.equal(
    declared.get("gap"),
    "var(--ui-space-2) var(--ui-space-4)",
    "the meta items keep a visible horizontal gap",
  );
});
