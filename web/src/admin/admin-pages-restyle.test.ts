/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { findCssImports } from "../ui/rules.ts";

const ADMIN_CSS_URL = new URL("./admin.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);

interface PageRow {
  readonly file: string;
  readonly confirms: number;
  readonly mustContain: readonly string[];
  readonly mustNotContain: readonly string[];
}

const ROWS: readonly PageRow[] = [
  {
    file: "UsersPage.tsx",
    confirms: 1,
    mustContain: [
      "captionDisplay={captionDisplayFor(ADMIN_TABLES.users.caption, PAGE_HEADING)}",
    ],
    mustNotContain: ["people/"],
  },
  {
    file: "TeamsPage.tsx",
    confirms: 1,
    mustContain: ['<Section title="Create team">', "xl:grid-cols-[20rem_minmax(0,1fr)]"],
    mustNotContain: ["people/", "captionDisplay"],
  },
  {
    file: "MappingsPage.tsx",
    confirms: 1,
    mustContain: [
      '<Section title="Map a group"',
      "useDisplayNames(",
      "personLabel(",
      '<span className="break-all">{cells.issuer}</span>',
      'className="ui-button whitespace-nowrap"',
      "captionDisplay={captionDisplayFor(ADMIN_TABLES.mappings.caption, PAGE_HEADING)}",
    ],
    mustNotContain: ["xl:grid-cols"],
  },
  {
    file: "AuditPage.tsx",
    confirms: 0,
    mustContain: [
      '<Section title="Chain verification">',
      '<Section title="Filter the audit log">',
      "lg:grid-cols-2",
      "whitespace-nowrap",
      "[overflow-wrap:anywhere]",
      "block min-w-48 max-w-sm break-all",
    ],
    mustNotContain: ["people/", "captionDisplay", "destructive"],
  },
];

function read(name: string): string {
  return readFileSync(new URL(`./${name}`, import.meta.url), "utf8");
}

function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

function problems(row: PageRow, text: string): string[] {
  const found: string[] = [];
  const once = (needle: string): void => {
    if (count(text, needle) !== 1) found.push(`${needle} must occur once`);
  };
  once("<PageHeader");
  once("headingRef={headingRef}");
  once('cn("admin-page", PAGE_WIDTHS.list)');
  if (text.includes("<h1")) found.push("no <h1");
  if (text.includes("admin-section")) found.push("no admin-section");
  if (findInlineStyleUse(text).length > 0) found.push("inline style");
  if (findCssImports(text).length > 0) found.push("css import");
  if (count(text, "<ConfirmDialog") !== row.confirms) found.push("ConfirmDialog count");
  if (count(text, "destructive") !== row.confirms) found.push("destructive count");
  for (const needle of row.mustContain) {
    if (!text.includes(needle)) found.push(`must contain ${needle}`);
  }
  for (const needle of row.mustNotContain) {
    if (text.includes(needle)) found.push(`must not contain ${needle}`);
  }
  return found;
}

test("C-b824c627 the admin sources use the layout parts and keep their pins", () => {
  assert.equal(typeof findInlineStyleUse, "function");
  assert.equal(typeof findRawColours, "function");
  assert.equal(typeof parseTokens, "function");
  assert.equal(typeof findCssImports, "function");

  for (const row of ROWS) {
    assert.deepEqual(problems(row, read(row.file)), [], row.file);
  }

  const css = read("admin.css");
  const tokens = parseTokens(readFileSync(TOKENS_CSS_URL, "utf8"));
  assert.deepEqual(findRawColours(css), []);
  assert.ok(!css.includes("max-width"), "admin.css holds no max-width");
  assert.ok(!css.includes(".admin-section"), "admin.css holds no .admin-section");
  assert.ok(!css.includes(".admin-form"), "admin.css holds no .admin-form");
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    const name = match[1];
    assert.ok(name !== undefined && Object.hasOwn(tokens, name), `token ${String(name)}`);
  }
  for (const selector of [
    ".admin-status--ok {",
    ".admin-status--broken {",
    ".admin-status--unavailable {",
    ".admin-status--checking {",
  ]) {
    assert.ok(css.includes(selector), selector);
  }
  assert.ok(ADMIN_CSS_URL.pathname.endsWith("admin.css"));
});

test("C-b824c627 the checker fails three altered Users sources", () => {
  const row = ROWS[0];
  assert.ok(row !== undefined);
  const source = read(row.file);
  const clean = problems(row, source);
  assert.deepEqual(clean, []);
  const mutations = [
    `${source}\n<h1>x</h1>\n`,
    source.replace(/^ *destructive\n/m, ""),
    `${source}\n<p style="x"/>\n`,
  ];
  for (const mutated of mutations) {
    assert.ok(problems(row, mutated).length > 0, "a mutation is found");
  }
});

test("C-1baa1083 the Users page shows a toned state badge, the id and a red confirm", () => {
  const text = read("UsersPage.tsx");
  assert.ok(text.includes("<Badge"), "the state is a Badge");
  assert.ok(text.includes('"success"') && text.includes('"neutral"'), "two tones");
  assert.ok(text.includes("font-mono"), "the user id is shown in mono");
  assert.equal(count(text, "destructive"), 1, "the confirm is destructive");
  assert.ok(text.includes("captionDisplay={captionDisplayFor("), "the caption is hidden");
});

test("C-5d8c406e the Mappings page shows reviewer names through useDisplayNames", () => {
  const text = read("MappingsPage.tsx");
  assert.equal(count(text, "useDisplayNames("), 1);
  assert.equal(count(text, "personLabel("), 1);
  assert.ok(text.includes("clip(personLabel(names, mapping.reviewedBy))"));
  assert.ok(text.includes('<span className="whitespace-nowrap">'), "cells do not wrap");
});
