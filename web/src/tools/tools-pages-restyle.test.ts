/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { findCssImports } from "../ui/rules.ts";

assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof findRawColours, "function");
assert.equal(typeof parseTokens, "function");
assert.equal(typeof findCssImports, "function");

const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);

interface PageRow {
  readonly file: string;
  readonly root: string;
  readonly primary: number;
  readonly confirms: number;
  readonly mustContain: readonly string[];
  readonly mustNotContain: readonly string[];
}

const BASE_SUBSTRINGS: readonly string[] = [
  "regionState(",
  "actionState(",
  "LoadingState",
  "aria-disabled",
  "browserSession.api",
];

const ROWS: readonly PageRow[] = [
  {
    file: "ServersPage.tsx",
    root: 'cn("tools-page", PAGE_WIDTHS.list)',
    primary: 1,
    confirms: 1,
    mustContain: [
      '<Section title={TOOL_NAMES["surfaceHeading"] ?? "Surface"}>',
      "useDisplayNames(",
      "personLabel(",
    ],
    mustNotContain: ["destructive", "xl:grid-cols"],
  },
  {
    file: "GrantsPage.tsx",
    root: 'cn("tools-page", PAGE_WIDTHS.list)',
    primary: 0,
    confirms: 0,
    mustContain: [
      '<Section title={label("grantForm")}>',
      'description={label("deployHint")}',
      "xl:grid-cols-[20rem_minmax(0,1fr)]",
    ],
    mustNotContain: ["people/", "ConfirmDialog", "destructive"],
  },
  {
    file: "PoliciesPage.tsx",
    root: 'cn("tools-page", PAGE_WIDTHS.form)',
    primary: 1,
    confirms: 0,
    mustContain: ["<Card "],
    mustNotContain: ["people/", "ConfirmDialog", "<Section"],
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
  if (count(text, "<PageHeader") !== 1) found.push("<PageHeader must occur once");
  if (count(text, row.root) !== 1) found.push(`${row.root} must occur once`);
  if (text.includes("<h1")) found.push("no <h1");
  if (findRawColours(text).length > 0) found.push("raw colour");
  if (findInlineStyleUse(text).length > 0) found.push("inline style");
  if (findCssImports(text).length > 0) found.push("css import");
  for (const needle of BASE_SUBSTRINGS) {
    if (!text.includes(needle)) found.push(`must contain ${needle}`);
  }
  if (count(text, 'className="tools-feedback"') !== 1) found.push("tools-feedback once");
  if (count(text, 'data-tone="primary"') !== row.primary) found.push("primary tone count");
  if (count(text, "<ConfirmDialog") !== row.confirms) found.push("ConfirmDialog count");
  for (const needle of row.mustContain) {
    if (!text.includes(needle)) found.push(`must contain ${needle}`);
  }
  for (const needle of row.mustNotContain) {
    if (text.includes(needle)) found.push(`must not contain ${needle}`);
  }
  if (row.file !== "ServersPage.tsx" && text.includes("people/")) found.push("no people/ import");
  if (row.file === "ServersPage.tsx" && !text.includes("people/")) found.push("people/ import");
  return found;
}

test("C-e553aba2 the tool sources use the layout parts and keep their pins", () => {
  for (const row of ROWS) {
    assert.deepEqual(problems(row, read(row.file)), [], row.file);
  }

  const css = read("tools.css");
  const tokens = parseTokens(readFileSync(TOKENS_CSS_URL, "utf8"));
  assert.deepEqual(findRawColours(css), []);
  assert.ok(!css.includes("max-width"), "tools.css holds no max-width");
  assert.ok(!css.includes(".tools-section"), "tools.css holds no .tools-section");
  assert.ok(!css.includes(".tools-form"), "tools.css holds no .tools-form");
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    const name = match[1];
    assert.ok(name !== undefined && Object.hasOwn(tokens, name), `token ${String(name)}`);
  }
  const rule = (selector: string): string => {
    const start = css.indexOf(selector);
    assert.ok(start >= 0, selector);
    return css.slice(start, css.indexOf("}", start));
  };
  const status = rule('.tools-feedback[role="status"] {');
  assert.ok(status.includes("var(--ui-color-success-text)"));
  assert.ok(status.includes("var(--ui-color-success-surface)"));
  const alert = rule('.tools-feedback[role="alert"] {');
  assert.ok(alert.includes("var(--ui-color-danger-text)"));
  assert.ok(alert.includes("var(--ui-color-danger-surface)"));
});

test("C-e553aba2 the checker fails three altered Servers sources", () => {
  const row = ROWS[0];
  assert.ok(row !== undefined);
  const source = read(row.file);
  assert.deepEqual(problems(row, source), []);
  const mutations = [
    `${source}\nconst c = "#ffffff";\n`,
    `${source}\n<p style="x"/>\n`,
    source.replace("<ConfirmDialog", "<ConfirmDialog destructive"),
  ];
  for (const mutated of mutations) {
    assert.ok(problems(row, mutated).length > 0, "a mutation is found");
  }
});

test("C-68a6b8c2 the Servers page names who registered the server and badges the state", () => {
  const text = read("ServersPage.tsx");
  assert.equal(count(text, "useDisplayNames("), 1);
  assert.equal(count(text, "personLabel("), 1);
  assert.ok(text.includes("Registered by {personLabel(names, view.registeredBy)}"));
  assert.ok(text.includes("summaryWithBadge("), "the row text carries a badge");
  assert.ok(text.includes("serverStateTone("));
  assert.ok(text.includes("captionDisplay={captionDisplayFor("), "the caption is hidden");
  assert.ok(!text.includes("useId"), "useId is gone");
});

test("C-3c7c4fbe the Grants page badges the status and keeps subject ids", () => {
  const text = read("GrantsPage.tsx");
  assert.ok(text.includes("grantTextWithBadge("), "the grant text carries a badge");
  assert.ok(text.includes("grantStatusTone("));
  assert.ok(text.includes('<div className="min-w-0">'), "the table cell is bounded");
  assert.ok(text.includes("captionDisplay={captionDisplayFor("), "the caption is hidden");
  assert.ok(!text.includes("useDisplayNames"), "no names on Grants");
});

test("C-403c66db the Policies page puts its status in the header and bounds one editor", () => {
  const text = read("PoliciesPage.tsx");
  assert.ok(text.includes("meta="), "the status sentences sit in the header");
  assert.ok(text.includes('<Card className="flex flex-col gap-3 p-4">'));
  assert.equal(count(text, 'data-tone="primary"'), 1);
  assert.equal(count(text, "<Card "), 1);
});
