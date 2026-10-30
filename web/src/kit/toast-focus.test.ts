/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { CONTRAST_PAIRS, contrastRatio, parseTokens } from "./contrast.ts";

const TOKENS = parseTokens(
  readFileSync(new URL("./tokens.css", import.meta.url), "utf8"),
);
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

function isToastDismissFocus(selector: string): boolean {
  return selector.split(",").some((part) => {
    const value = part.trim();
    return (
      value.includes(":focus") &&
      value.includes(".ui-toast") &&
      (value.includes("button") || value.includes(".ui-button"))
    );
  });
}

function outlineColour(body: string): string | undefined {
  const declared = declarations(body);
  return declared.get("outline-color") ?? declared.get("outline");
}

function tokenName(value: string): string | undefined {
  return /var\((--ui-color-[a-z0-9-]+)\)/i.exec(value)?.[1];
}

test("C-461674d2 C-16a71639 toast Dismiss focus outline contrasts with the toast background", () => {
  assert.equal(
    CONTRAST_PAIRS.length,
    16,
    "the fix keeps the sixteen contrast pairs instead of adding one",
  );

  const rules = cssRules(THEME).filter((rule) =>
    isToastDismissFocus(rule.selector),
  );
  assert.ok(
    rules.length > 0,
    "theme.css sets a focus outline for the Dismiss button inside a toast",
  );

  const toastBackground = TOKENS["--ui-color-toast-bg"];
  assert.ok(
    toastBackground !== undefined,
    "tokens.css defines --ui-color-toast-bg",
  );

  let checked = 0;
  for (const rule of rules) {
    const colourValue = outlineColour(rule.body);
    if (colourValue === undefined) continue;
    const token = tokenName(colourValue);
    assert.ok(
      token !== undefined,
      `${rule.selector} draws its focus outline with a colour token`,
    );
    const colour = TOKENS[token];
    assert.ok(colour !== undefined, `${token} is an existing colour token`);
    const ratio = contrastRatio(colour, toastBackground);
    assert.ok(
      ratio >= 3,
      `${rule.selector} outline ${colour} has ${ratio}:1 against ${toastBackground}`,
    );
    checked += 1;
  }
  assert.ok(
    checked > 0,
    "the toast focus rule declares the colour of its outline",
  );
});
