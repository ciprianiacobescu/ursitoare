/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const SECTIONS_URL = new URL("./ReviewSections.tsx", import.meta.url);
const MESSAGES_URL = new URL("./messages.ts", import.meta.url);

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test("C-9bb4c4cf the Tool settings sources hold the trust controls and keep the page rules", () => {
  const sections = readSource(SECTIONS_URL);
  const messages = readSource(MESSAGES_URL);

  for (const token of [
    "discoverSettings(",
    "storedTools(",
    "carriedAfterEffect(",
    "ackStatus(",
    "valueChangeLines(",
    "withValueLines(",
    "changesView(",
    "TrustToggle",
    "DataClassSelect",
    "TrustNotes",
  ]) {
    assert.equal(sections.includes(token), true, `ReviewSections.tsx contains ${token}`);
  }
  assert.ok(
    count(sections, "tools-feedback") <= 2,
    "ReviewSections.tsx uses tools-feedback at most twice",
  );
  assert.equal(
    sections.includes('data-tone="primary"'),
    false,
    'ReviewSections.tsx has no data-tone="primary"',
  );

  const pages: readonly (readonly [string, string])[] = [
    ["ReviewSections.tsx", sections],
    ["messages.ts", messages],
  ];
  for (const [name, source] of pages) {
    assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
    assert.deepEqual(findPaletteUtilities(source), [], `${name} uses no palette utility`);
    assert.deepEqual(findCssImports(source), [], `${name} imports no stylesheet`);
    assert.deepEqual(findBannedImports(source), [], `${name} imports no banned package`);
    assert.deepEqual(findRawColours(source), [], `${name} holds no raw colour`);
    assert.equal(source.includes("dangerouslySetInnerHTML"), false, `${name} sets no raw html`);
  }
});
