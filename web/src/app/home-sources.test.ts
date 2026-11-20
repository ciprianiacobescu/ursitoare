/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";
import { findBannedImports, findCssImports, findPaletteUtilities } from "../ui/rules.ts";

const PAGE_URL = new URL("./HomePage.tsx", import.meta.url);
const FEATURE_URL = new URL("../features/10-home.tsx", import.meta.url);
const LOGIC_URL = new URL("./home.ts", import.meta.url);

function read(url: URL): string {
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function count(source: string, needle: string): number {
  return source.split(needle).length - 1;
}

test("C-d63e4803 the home sources keep the pinned markup", () => {
  assert.equal(typeof findInlineStyleUse, "function");
  assert.equal(typeof findPaletteUtilities, "function");
  assert.equal(typeof findCssImports, "function");
  assert.equal(typeof findBannedImports, "function");

  const page = read(PAGE_URL);
  const feature = read(FEATURE_URL);
  const logic = read(LOGIC_URL);

  for (const needle of [
    "homeView(",
    "useSession()",
    "useDisplayNames(",
    "createApiClient()",
    "<PageHeader",
    "<EmptyState",
    "<Skeleton",
    "<Tooltip",
    'title="Recent runs"',
    'title="Recent flows"',
    'title="Next steps"',
    'what="Recent runs"',
    'what="Recent flows"',
    "Try again",
    "could not be loaded.",
    "All runs",
    "All flows",
    "Check again",
    "aria-disabled",
    "after:absolute",
    "<ArrowRight",
    'aria-hidden="true"',
    "Shown from the first 200 flows, in name order.",
    "Nothing needs your attention right now.",
    "Your account has no access to flows or runs yet. Ask an administrator for a role.",
  ]) {
    assert.ok(page.includes(needle), `HomePage.tsx contains ${needle}`);
  }

  assert.equal(count(page, 'role="status"'), 2, "two status roles in the page source");
  assert.equal(count(page, "<h1>Ursitoare</h1>"), 1, "one literal h1");
  assert.equal(count(page, 'title="Ursitoare"'), 1, "one page header title");
  assert.equal(count(page, "Ursitoare"), 2, "two Ursitoare mentions");
  assert.equal(count(page, 'className="engine-health"'), 1, "one engine health paragraph");

  for (const banned of [
    'role="alert"',
    "aria-live",
    "DataTable",
    "ErrorPanel",
    "LoadingState",
    "browserSession",
    "style=",
    "outline-none",
    "dangerouslySetInnerHTML",
  ]) {
    assert.ok(!page.includes(banned), `HomePage.tsx does not contain ${banned}`);
  }
  assert.ok(!/(?<!aria-)disabled/.test(page), "HomePage.tsx has no native disabled attribute");

  for (const needle of ['<HomePage />', 'id: "home"', 'path: "/"', 'navLabel: "Home"']) {
    assert.ok(feature.includes(needle), `10-home.tsx contains ${needle}`);
  }
  assert.ok(!feature.includes("useState"), "10-home.tsx holds no state of its own");

  for (const banned of ["browserSession", "react", "document", "window", "Date.now(", "Math.random(", "new Date("]) {
    assert.ok(!logic.includes(banned), `home.ts does not contain ${banned}`);
  }

  for (const source of [page, feature, logic]) {
    assert.deepEqual(findInlineStyleUse(source), []);
    assert.deepEqual(findPaletteUtilities(source), []);
    assert.deepEqual(findCssImports(source), []);
    assert.deepEqual(findBannedImports(source), []);
  }
});
