/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findRawColours, parseTokens } from "../kit/contrast.ts";

const SHELL_CSS_URL = new URL("./shell.css", import.meta.url);
const AUTH_CSS_URL = new URL("../auth/auth.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);

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

test("C-9eeb9987 shell.css holds a light scheme and script focus draws no frame", () => {
  const css = readText(SHELL_CSS_URL);
  for (const needle of [
    "color-scheme: light;",
    ".skip-link:focus",
    '[tabindex="-1"]:focus',
    "outline: none;",
    "var(--ui-focus-width)",
  ]) {
    assert.ok(css.includes(needle), `shell.css contains ${needle}`);
  }
  for (const banned of [
    "main:focus",
    "light dark",
    "Canvas",
    "currentColor",
    ".app-shell",
    ".app-banner",
    ".app-nav",
    ".app-brand",
    ".app-footer",
  ]) {
    assert.ok(!css.includes(banned), `shell.css does not contain ${banned}`);
  }
});

test("C-9eeb9987 auth.css is a 24rem card that truncates", () => {
  const css = readText(AUTH_CSS_URL);
  for (const needle of [
    ".auth-account",
    ".auth-page",
    "text-overflow: ellipsis",
    "max-width: 24rem",
    "var(--ui-color-divider)",
    "var(--ui-radius-lg)",
    "var(--ui-shadow-sm)",
  ]) {
    assert.ok(css.includes(needle), `auth.css contains ${needle}`);
  }
  assert.ok(!css.includes("max-width: 32rem"), "auth.css has no 32rem width");
});

test("C-9eeb9987 both stylesheets hold no raw colour and only kit tokens", () => {
  const tokens = parseTokens(readText(TOKENS_CSS_URL));
  const shell = readText(SHELL_CSS_URL);
  const auth = readText(AUTH_CSS_URL);
  assert.ok(shell.includes("color-scheme: light;"), "shell.css declares the light scheme");
  assert.ok(auth.includes("max-width: 24rem"), "auth.css is the 24rem card");
  for (const [file, css] of [
    ["shell.css", shell],
    ["auth.css", auth],
  ] as const) {
    assert.deepEqual(findRawColours(css), [], `${file} holds no raw colour`);
    for (const name of tokenUses(css)) {
      assert.ok(Object.hasOwn(tokens, name), `${file} uses the kit token ${name}`);
    }
  }
});
