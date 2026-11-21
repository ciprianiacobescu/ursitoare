/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ADMIN_PAGES } from "./admin/pages.ts";
import { FLOW_PAGES } from "./flows/pages.ts";
import { RUN_PAGES } from "./runs/pages.ts";
import { TOOL_PAGES } from "./tools/pages.ts";

const JOURNEY = new URL("../../e2e/test_m6b_ui.py", import.meta.url);
const HOME = new URL("./features/10-home.tsx", import.meta.url);

interface PageRow {
  path: string;
  navLabel: string | null;
}

interface PageTables {
  ADMIN_PAGES: readonly PageRow[];
  TOOL_PAGES: readonly PageRow[];
  FLOW_PAGES: readonly PageRow[];
  RUN_PAGES: readonly PageRow[];
}

const LITERAL = "VISUAL_PAGES: dict[str, list[str]] = {";

function visualPages(source: string): Record<string, string[]> | null {
  const start = source.indexOf(LITERAL);
  if (start < 0) return null;
  const tail = source.slice(start + LITERAL.length);
  const end = tail.search(/^}/m);
  if (end < 0) return null;
  const body = tail.slice(0, end);
  const pages: Record<string, string[]> = {};
  for (const match of body.matchAll(/"([a-z-]+)"\s*:\s*\[([\s\S]*?)\]/g)) {
    const role = match[1];
    const list = match[2];
    if (role === undefined || list === undefined) continue;
    pages[role] = [...list.matchAll(/"([^"]*)"/g)].map((item) => item[1] ?? "");
  }
  return Object.keys(pages).length === 0 ? null : pages;
}

function requiredPaths(rows: PageTables, homeSource: string): string[] {
  const paths: string[] = [];
  if (homeSource.includes('path: "/",') && homeSource.includes('navLabel: "Home"')) {
    paths.push("/");
  }
  for (const row of [
    ...rows.ADMIN_PAGES,
    ...rows.TOOL_PAGES,
    ...rows.FLOW_PAGES,
    ...rows.RUN_PAGES,
  ]) {
    if (row.navLabel !== null) paths.push(row.path);
  }
  paths.push("/flows/demo-ui", "/flows/demo-ui/graph", "/admin/tool-servers?server=acme");
  return paths;
}

function journeyProblems(source: string, rows: PageTables, homeSource: string): string[] {
  const pages = visualPages(source);
  if (pages === null) return ["VISUAL_PAGES is missing"];

  const problems: string[] = [];
  if (Object.keys(pages).join(", ") !== "signed-out, alice, carol") {
    problems.push("VISUAL_PAGES roles are not signed-out, alice, carol");
  }

  const union = new Set(Object.values(pages).flat());
  for (const path of requiredPaths(rows, homeSource)) {
    if (!union.has(path)) problems.push(`no page for ${path}`);
  }

  const needles = [
    "watch_csp(",
    "assert_layout(",
    "assert_accessible(",
    "E2E_VISUAL_DIR",
    '".l4-out"',
    '"width": 1366',
    '"height": 860',
    '"width": 900',
    "MAX_BANNER_PX = 72",
    "MAX_FLOW_PAGE_PX = 3000",
    "full_page=True",
    "st_size > 0",
    "png_height(",
    "Signed in as",
    "LOADING",
  ];
  for (const needle of needles) {
    if (!source.includes(needle)) problems.push(`missing ${needle}`);
  }

  const marks = source.split('@pytest.mark.milestone("M6b")').length - 1;
  if (marks !== 3) problems.push(`${String(marks)} milestone marks, not 3`);

  for (const banned of ["time.sleep", "wait_for_timeout", "networkidle"]) {
    if (source.includes(banned)) problems.push(`holds ${banned}`);
  }
  const skip = /pytest\.(?:mark\.)?skip\s*\(/.exec(source);
  if (skip !== null) problems.push(`holds ${skip[0]}`);

  return problems;
}

test("C-8ac052fa the journey lists every page of every role and keeps its checks", () => {
  assert.ok(existsSync(JOURNEY), "e2e/test_m6b_ui.py must exist");
  const source = readFileSync(JOURNEY, "utf8");
  const homeSource = readFileSync(HOME, "utf8");
  const rows: PageTables = { ADMIN_PAGES, TOOL_PAGES, FLOW_PAGES, RUN_PAGES };

  const pages = visualPages(source);
  assert.ok(pages !== null, "the journey holds the VISUAL_PAGES literal");
  assert.deepEqual(pages["signed-out"], ["/", "/sign-in", "/no-such-page"]);
  assert.equal(requiredPaths(rows, homeSource).length, 13);
  assert.doesNotThrow(() => {
    assert.deepEqual(journeyProblems(source, rows, homeSource), []);
  });

  const renamed = source.split('"/admin/grants"').join('"/x"');
  assert.deepEqual(journeyProblems(renamed, rows, homeSource), ["no page for /admin/grants"]);

  const unwatched = source.split("watch_csp(").join("watch(");
  assert.deepEqual(journeyProblems(unwatched, rows, homeSource), ["missing watch_csp("]);

  assert.deepEqual(journeyProblems("", rows, homeSource), ["VISUAL_PAGES is missing"]);
});
