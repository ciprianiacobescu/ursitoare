/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const TRUST_URL = new URL("./trust.ts", import.meta.url);
const CONTROLS_URL = new URL("./TrustControls.tsx", import.meta.url);
const REGISTER_URL = new URL("./RegisterPage.tsx", import.meta.url);
const REPLACE_URL = new URL("./ReplaceSection.tsx", import.meta.url);
const SERVERS_URL = new URL("./ServersPage.tsx", import.meta.url);

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test("C-1da179fb the OpenAPI form sources hold the trust controls and keep the page rules", () => {
  assert.ok(existsSync(CONTROLS_URL), "TrustControls.tsx must exist");

  const trust = readSource(TRUST_URL);
  for (const banned of ["console.", "localStorage", "sessionStorage", "registerMessages"]) {
    assert.equal(trust.includes(banned), false, `trust.ts holds no ${banned}`);
  }
  for (const line of trust.split("\n")) {
    if (/from\s+["']\.\/(?:review|register)\.ts["']/.test(line)) {
      assert.match(
        line,
        /^\s*import\s+type\b/,
        `trust.ts imports only types from review.ts or register.ts: ${line.trim()}`,
      );
    }
  }

  const controls = readSource(CONTROLS_URL);
  for (const token of [
    "TrustToggle",
    "DataClassSelect",
    "TrustNotes",
    "aria-describedby",
    "TRUST_WARNING",
    "fillName(",
  ]) {
    assert.equal(controls.includes(token), true, `TrustControls.tsx contains ${token}`);
  }

  const register = readSource(REGISTER_URL);
  for (const token of ["TrustToggle", "DataClassSelect", "TrustNotes", "ackStatus("]) {
    assert.equal(register.includes(token), true, `RegisterPage.tsx contains ${token}`);
  }
  assert.equal(register.includes("tools-feedback"), false, "RegisterPage.tsx has no tools-feedback");
  assert.equal(register.includes("<Section"), false, "RegisterPage.tsx has no Section");

  const replace = readSource(REPLACE_URL);
  for (const token of [
    "storedTools(",
    "prefillTrust(",
    "carriedAfterEffect(",
    "ackStatus(",
    "surface: unknown",
  ]) {
    assert.equal(replace.includes(token), true, `ReplaceSection.tsx contains ${token}`);
  }
  assert.equal(replace.includes("tools-feedback"), false, "ReplaceSection.tsx has no tools-feedback");

  const servers = readSource(SERVERS_URL);
  assert.equal(count(servers, "surface={"), 1, "ServersPage.tsx passes one surface prop");
  assert.equal(
    count(servers, 'className="tools-feedback"'),
    1,
    'ServersPage.tsx keeps one className="tools-feedback"',
  );
  assert.equal(servers.includes("useId"), false, "ServersPage.tsx has no useId");

  const pages: readonly (readonly [string, string])[] = [
    ["TrustControls.tsx", controls],
    ["RegisterPage.tsx", register],
    ["ReplaceSection.tsx", replace],
    ["ServersPage.tsx", servers],
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
