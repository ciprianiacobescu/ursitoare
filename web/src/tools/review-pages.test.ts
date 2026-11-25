/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";
import { REVIEW_NAMES } from "./review.ts";

const SERVERS_URL = new URL("./ServersPage.tsx", import.meta.url);
const SECTIONS_URL = new URL("./ReviewSections.tsx", import.meta.url);
const REVIEW_URL = new URL("./review.ts", import.meta.url);
const MESSAGES_URL = new URL("./messages.ts", import.meta.url);

const REVIEW_VALUES = [
  "Discovery",
  "Discover tools",
  "Tool settings",
  "Server tool",
  "Server hints",
  "Tool name",
  "Tool name of ",
  "Effect",
  "Proposed",
  "Skip",
  "Effect of ",
  "Discover again with these settings",
  "Changes",
  "No pending surface to compare.",
  "No changes.",
  "The surface could not be read.",
  "Calls",
  "Tool",
  "Call",
  "Retry",
  "Read tools are called for real, even in a dry run. Check that each one changes nothing.",
  "Result",
  "No calls",
] as const;

const NAVIGATION_LABELS = [
  "Home",
  "Users",
  "Roles and teams",
  "Group mappings",
  "Audit log",
  "Tool servers",
  "Grants",
  "Policies",
  "Flows",
  "Runs",
] as const;

const DISCOVERY_REASONS = [
  "credential_missing",
  "discovery_denied",
  "discovery_failed",
  "mcp_session_required",
  "no_tools",
  "name_collision",
  "discovery_not_configured",
  "gateway_unavailable",
] as const;

const SERVERS_TOKENS = ["loadServerReview(", "<ReviewSections", "DataTable", "aria-disabled"] as const;
const SECTIONS_TOKENS = [
  "<Section",
  "discoverTools(",
  "changesView(",
  "callRows(",
  "readNote(",
  "DataTable",
  "aria-disabled",
] as const;

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

test("C-85b20ad6 the review names are the twenty three values and the messages stay untouched", () => {
  const values = Object.values(REVIEW_NAMES);
  assert.equal(values.length, 23, "REVIEW_NAMES holds 23 values");
  assert.deepEqual([...values].sort(), [...REVIEW_VALUES].sort(), "the values are those of the plan");
  assert.equal(new Set(values).size, 23, "the values are distinct");

  for (const key of Object.keys(REVIEW_NAMES)) {
    assert.match(key, /^[a-z][A-Za-z0-9]*$/, `${key} is a camelCase key`);
  }
  for (const value of values) {
    assert.equal(
      NAVIGATION_LABELS.includes(value as (typeof NAVIGATION_LABELS)[number]),
      false,
      `${value} is not a navigation label`,
    );
    assert.equal(value.includes("Ursitoare"), false, `${value} holds no Ursitoare`);
  }

  const review = readSource(REVIEW_URL);
  for (const banned of ["console.", "localStorage", "sessionStorage", "registerMessages"]) {
    assert.equal(review.includes(banned), false, `review.ts holds no ${banned}`);
  }

  const messages = readSource(MESSAGES_URL);
  for (const reason of DISCOVERY_REASONS) {
    assert.equal(messages.includes(reason), false, `messages.ts holds no discovery reason ${reason}`);
  }
});

test("C-85b20ad6 the review page and its sections use the required parts and pass the rules", () => {
  const servers = readSource(SERVERS_URL);
  const sections = readSource(SECTIONS_URL);

  for (const token of SERVERS_TOKENS) {
    assert.equal(servers.includes(token), true, `ServersPage.tsx contains ${token}`);
  }
  assert.equal(servers.includes("loadToolServer("), false, "ServersPage.tsx no longer loads with loadToolServer");
  assert.equal(
    count(servers, 'className="tools-feedback"'),
    1,
    'ServersPage.tsx keeps one className="tools-feedback"',
  );

  for (const token of SECTIONS_TOKENS) {
    assert.equal(sections.includes(token), true, `ReviewSections.tsx contains ${token}`);
  }
  assert.equal(
    sections.includes('data-tone="primary"'),
    false,
    'ReviewSections.tsx has no data-tone="primary"',
  );
  assert.ok(
    count(sections, "tools-feedback") <= 2,
    "ReviewSections.tsx uses tools-feedback only for its two messages",
  );

  const pages: readonly (readonly [string, string])[] = [
    ["ServersPage.tsx", servers],
    ["ReviewSections.tsx", sections],
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
