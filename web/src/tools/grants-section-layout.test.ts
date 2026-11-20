/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const HINT = "A role, for example author, or a user id from the Users page.";

function read(url: string): string {
  return readFileSync(new URL(url, import.meta.url), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
}

test("C-3802bfd0 a section body spans the grid below its heading", () => {
  const css = read("../kit/theme.css");
  const rule = /\.ui-section\s*>\s*:not\(\s*\.ui-section-title\s*,\s*\.ui-section-actions\s*\)\s*\{([^}]*)\}/.exec(css);
  assert.ok(rule !== null, "the rule for the children of .ui-section exists");
  const body = (rule[1] ?? "").replace(/\s+/g, " ");
  assert.ok(body.includes("grid-column: 1 / -1"), "every other child spans the full row");
});

test("C-3c7c4fbe the Grants subject field keeps its hint beside the status badges", () => {
  const source = read("./GrantsPage.tsx");
  const start = source.indexOf('name="subject"');
  assert.ok(start > 0, "the subject Field is in GrantsPage");
  const field = source.slice(start, source.indexOf("</Field>", start));
  assert.ok(field.includes(`hint="${HINT}"`), "the hint sits on the subject Field");
  assert.ok(source.includes("grantStatusTone("), "the status stays a badge");
});
