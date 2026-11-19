/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ACCOUNT_MENU = new URL("./AccountMenu.tsx", import.meta.url);

test("C-c6a08479 C-51d4764a C-0cbfa992 the sign-out button neither shrinks nor wraps beside long account names", () => {
  const source = readFileSync(ACCOUNT_MENU, "utf8");
  for (const utility of ["shrink-0", "whitespace-nowrap"]) {
    assert.ok(
      source.includes(utility),
      `AccountMenu.tsx keeps the sign-out button stable with ${utility}`,
    );
  }
});
