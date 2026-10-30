/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";

const AUTH_CSS_URL = new URL("./auth.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);
const AUTH_DIR_URL = new URL("./", import.meta.url);
const SIGN_IN_FEATURE_URL = new URL("../features/15-sign-in.tsx", import.meta.url);

function readText(url: URL): string {
  return readFileSync(url, "utf8");
}

function componentUrls(): URL[] {
  const urls: URL[] = [];
  for (const name of readdirSync(AUTH_DIR_URL)) {
    if (name.endsWith(".tsx")) {
      urls.push(new URL(name, AUTH_DIR_URL));
    }
  }
  if (existsSync(SIGN_IN_FEATURE_URL)) {
    urls.push(SIGN_IN_FEATURE_URL);
  }
  return urls;
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

test("C-53df20c1 stylesheet follows the kit rules", () => {
  assert.ok(existsSync(AUTH_CSS_URL), `${AUTH_CSS_URL.pathname} must exist`);

  const css = readText(AUTH_CSS_URL);
  const tokens = parseTokens(readText(TOKENS_CSS_URL));

  assert.deepEqual(findRawColours(css), [], "auth.css holds no raw colour");
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `auth.css uses the kit token ${name}`);
  }

  const urls = componentUrls();
  assert.ok(urls.length > 0, "there is at least one auth component");
  for (const url of urls) {
    assert.deepEqual(
      findInlineStyleUse(readText(url)),
      [],
      `${url.pathname} has no inline style`,
    );
  }
});
