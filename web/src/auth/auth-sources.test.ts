/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { findPaletteUtilities } from "../ui/rules.ts";

const FILES = {
  "AccountMenu.tsx": new URL("./AccountMenu.tsx", import.meta.url),
  "SignInPage.tsx": new URL("./SignInPage.tsx", import.meta.url),
  "App.tsx": new URL("../app/App.tsx", import.meta.url),
} as const;

const EXTRA: Record<keyof typeof FILES, string[]> = {
  "AccountMenu.tsx": [
    'role="group"',
    'aria-label="Account"',
    "Signed in as",
    "Tenant:",
    "Sign out",
    "aria-disabled",
    "asChild",
  ],
  "SignInPage.tsx": [
    'tone="primary"',
    "ErrorPanel",
    "Checking your session",
    "Use your organization account to open Ursitoare.",
  ],
  "App.tsx": [
    "Page not found",
    "Go to the landing page",
    "asChild",
    'tone="primary"',
    'DocumentTitle routeId="not-found"',
  ],
};

test("C-2159a890 the account, sign-in and not-found sources use the shared Button", () => {
  for (const [name, url] of Object.entries(FILES) as [keyof typeof FILES, URL][]) {
    const source = readFileSync(url, "utf8");
    for (const needle of ["<Button", 'from "../ui/button.tsx"', ...EXTRA[name]]) {
      assert.ok(source.includes(needle), `${name} contains ${needle}`);
    }
    for (const banned of ['className="ui-button"', "style="]) {
      assert.ok(!source.includes(banned), `${name} does not contain ${banned}`);
    }
    assert.ok(!/(?<!aria-)disabled=/.test(source), `${name} has no native disabled`);
    assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
    assert.deepEqual(findPaletteUtilities(source), [], `${name} has no palette utility`);
  }
  const signIn = readFileSync(FILES["SignInPage.tsx"], "utf8");
  assert.equal(signIn.split("<h1>Sign in</h1>").length - 1, 2, "two sign-in headings");
});
