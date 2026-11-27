/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const PANEL_URL = new URL("./RefCarryPanel.tsx", import.meta.url);
const SERVERS_URL = new URL("./ServersPage.tsx", import.meta.url);
const REF_CARRY_URL = new URL("./ref-carry.ts", import.meta.url);

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test("C-88f41f1b the carry panel and Servers page keep every pin", () => {
  assert.ok(existsSync(PANEL_URL), "RefCarryPanel.tsx must exist");

  const panel = readSource(PANEL_URL);
  for (const token of [
    "carryGrants(",
    "carryKeys(",
    "refNoticeText(",
    "<ErrorPanel",
    "<Link",
    "aria-disabled",
    'aria-label={REF_CARRY_NAMES["listName"]}',
    'className="tools-note"',
  ]) {
    assert.equal(panel.includes(token), true, `RefCarryPanel.tsx contains ${token}`);
  }
  for (const banned of ["tools-feedback", "data-tone", "useId", "surface"]) {
    assert.equal(panel.includes(banned), false, `RefCarryPanel.tsx has no ${banned}`);
  }

  const servers = readSource(SERVERS_URL);
  for (const token of [
    "<RefCarryPanel",
    "changedRefs(",
    "approvedEffects(",
    "setCarry(",
    "loadServerReview(",
  ]) {
    assert.equal(servers.includes(token), true, `ServersPage.tsx contains ${token}`);
  }
  assert.equal(count(servers, "surface={"), 1, "ServersPage.tsx passes one surface prop");
  assert.equal(count(servers, 'className="tools-feedback"'), 1, 'ServersPage.tsx keeps one tools-feedback');
  assert.equal(count(servers, 'data-tone="primary"'), 1, 'ServersPage.tsx keeps one primary tone');
  assert.equal(count(servers, "<ConfirmDialog"), 1, "ServersPage.tsx keeps one ConfirmDialog");
  for (const banned of ["useId", "loadToolServer(", "destructive"]) {
    assert.equal(servers.includes(banned), false, `ServersPage.tsx has no ${banned}`);
  }

  const refCarry = readSource(REF_CARRY_URL);
  for (const banned of [
    "console.",
    "localStorage",
    "sessionStorage",
    "registerMessages",
    "loadToolServer(",
    "./grants.ts",
    'from "react"',
  ]) {
    assert.equal(refCarry.includes(banned), false, `ref-carry.ts has no ${banned}`);
  }

  const pages: readonly (readonly [string, string])[] = [
    ["RefCarryPanel.tsx", panel],
    ["ServersPage.tsx", servers],
  ];
  for (const [name, source] of pages) {
    assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
    assert.deepEqual(findPaletteUtilities(source), [], `${name} uses no palette utility`);
    assert.deepEqual(findCssImports(source), [], `${name} imports no stylesheet`);
    assert.deepEqual(findBannedImports(source), [], `${name} imports no banned package`);
    assert.deepEqual(findRawColours(source), [], `${name} holds no raw colour`);
  }

  const mutated = `${servers}\n<div className="tools-feedback" />\n`;
  assert.notEqual(
    count(mutated, 'className="tools-feedback"'),
    1,
    "a ServersPage copy with a second tools-feedback is found",
  );
});
