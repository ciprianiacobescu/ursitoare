/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const HINT = "A role, for example author, or a user id from the Users page.";

test("C-e96ac1a6 the Grants page gives the Role or user field its hint", () => {
  const source = readFileSync(new URL("./GrantsPage.tsx", import.meta.url), "utf8");
  const start = source.indexOf('name="subject"');
  assert.ok(start > 0, "the subject Field is in GrantsPage");
  const end = source.indexOf("</Field>", start);
  const field = source.slice(start, end);
  assert.ok(field.includes("hint="), "the subject Field passes a hint");
  const pages = readFileSync(new URL("./pages.ts", import.meta.url), "utf8");
  assert.ok(source.includes(HINT) || pages.includes(HINT), "the hint text is defined");
});
