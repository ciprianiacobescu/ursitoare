/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";

const ADMIN_CSS_URL = new URL("./admin.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);

const PAGE_NAMES: readonly string[] = [
  "UsersPage.tsx",
  "TeamsPage.tsx",
  "MappingsPage.tsx",
  "AuditPage.tsx",
];

const FEATURE_NAMES: readonly string[] = [
  "60-admin-users.tsx",
  "61-admin-roles-teams.tsx",
  "62-admin-group-mappings.tsx",
  "63-admin-audit.tsx",
];

const TONE_PAIRS: Readonly<Record<string, readonly [string, string]>> = {
  ".admin-status--ok": ["--ui-color-success-text", "--ui-color-success-surface"],
  ".admin-status--broken": ["--ui-color-danger-text", "--ui-color-danger-surface"],
  ".admin-status--unavailable": ["--ui-color-danger-text", "--ui-color-danger-surface"],
  ".admin-status--checking": ["--ui-color-info-text", "--ui-color-info-surface"],
};

function readText(url: URL): string {
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

function ruleBlock(css: string, selector: string): string | null {
  const start = css.indexOf(selector);
  if (start < 0) return null;
  const open = css.indexOf("{", start);
  if (open < 0) return null;
  const close = css.indexOf("}", open);
  if (close < 0) return null;
  return css.slice(open + 1, close);
}

test("C-52c26a32 the admin stylesheet and sources follow the kit rules", () => {
  assert.ok(existsSync(ADMIN_CSS_URL), `${ADMIN_CSS_URL.pathname} must exist`);
  assert.ok(existsSync(TOKENS_CSS_URL), `${TOKENS_CSS_URL.pathname} must exist`);

  const css = readText(ADMIN_CSS_URL);
  const tokens = parseTokens(readText(TOKENS_CSS_URL));

  assert.deepEqual(findRawColours(css), [], "admin.css holds no raw colour");
  assert.deepEqual(findInlineStyleUse(css), [], "admin.css uses no inline style");
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `admin.css uses the kit token ${name}`);
  }

  const sources: readonly [URL, string][] = [
    ...PAGE_NAMES.map((name): [URL, string] => [new URL(name, new URL("./", import.meta.url)), name]),
    ...FEATURE_NAMES.map((name): [URL, string] => [
      new URL(`../features/${name}`, import.meta.url),
      name,
    ]),
  ];
  for (const [url] of sources) {
    assert.ok(existsSync(url), `${url.pathname} must exist`);
    const text = readText(url);
    assert.deepEqual(findInlineStyleUse(text), [], `${url.pathname} has no inline style`);
  }

  for (const selector of Object.keys(TONE_PAIRS)) {
    const pair = TONE_PAIRS[selector];
    assert.ok(pair !== undefined, `the tone pair of ${selector} was read`);
    const block = ruleBlock(css, selector);
    assert.ok(block !== null, `the rule ${selector} exists`);
    assert.ok(
      block.includes(`var(${pair[0]})`),
      `${selector} sets its colour from the token ${pair[0]}`,
    );
    assert.ok(
      block.includes(`var(${pair[1]})`),
      `${selector} sets its background from the token ${pair[1]}`,
    );
  }
});
