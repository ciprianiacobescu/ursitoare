/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const MARKER_URL = new URL("./RefMarker.tsx", import.meta.url);
const GRANTS_URL = new URL("./GrantsPage.tsx", import.meta.url);

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test("C-5db13202 the ref marker and the Grants page keep every pin", () => {
  assert.ok(existsSync(MARKER_URL), "RefMarker.tsx must exist");

  const marker = readSource(MARKER_URL);
  for (const token of ['data-slot="ref-marker"', "data-state=", "REF_MARKERS["]) {
    assert.equal(marker.includes(token), true, `RefMarker.tsx contains ${token}`);
  }
  for (const banned of ['data-slot="badge"', "<Badge", "data-tone"]) {
    assert.equal(marker.includes(banned), false, `RefMarker.tsx has no ${banned}`);
  }

  const grants = readSource(GRANTS_URL);
  for (const token of [
    "<RefMarker",
    "refState(",
    "loadAllToolServers(createApiClient()",
    "grantTextWithBadge(",
    '<div className="min-w-0">',
  ]) {
    assert.equal(grants.includes(token), true, `GrantsPage.tsx contains ${token}`);
  }
  assert.equal(
    count(grants, 'className="tools-feedback"'),
    1,
    "GrantsPage.tsx keeps one tools-feedback",
  );
  for (const banned of [
    'data-tone="primary"',
    "people/",
    "ConfirmDialog",
    "parseGrantRecord(",
    "loadAllToolServers(browserSession",
  ]) {
    assert.equal(grants.includes(banned), false, `GrantsPage.tsx has no ${banned}`);
  }

  const pages: readonly (readonly [string, string])[] = [
    ["RefMarker.tsx", marker],
    ["GrantsPage.tsx", grants],
  ];
  for (const [name, source] of pages) {
    assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
    assert.deepEqual(findPaletteUtilities(source), [], `${name} uses no palette utility`);
    assert.deepEqual(findCssImports(source), [], `${name} imports no stylesheet`);
    assert.deepEqual(findBannedImports(source), [], `${name} imports no banned package`);
    assert.deepEqual(findRawColours(source), [], `${name} holds no raw colour`);
  }

  const mutated = `${marker}\n<span data-slot="badge" />\n`;
  assert.notEqual(
    count(mutated, 'data-slot="badge"'),
    0,
    "a RefMarker copy with data-slot badge is found",
  );
});
