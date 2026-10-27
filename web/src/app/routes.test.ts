/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Feature } from "./features.ts";
import { pageTitle, routeTable } from "./routes.ts";

assert.equal(typeof routeTable, "function");
assert.equal(typeof pageTitle, "function");

interface RouteEntry {
  readonly id: string;
  readonly path: string;
}

function feature(id: string, path: string): Feature {
  return { id, path, element: null };
}

function table(features: readonly Feature[]): readonly RouteEntry[] {
  let entries: readonly RouteEntry[] | undefined;
  assert.doesNotThrow(() => {
    entries = routeTable(features);
  }, "routeTable must return the route table");
  assert.ok(entries !== undefined, "routeTable returned a table");
  return entries;
}

function title(routeId: string): string {
  let value: string | undefined;
  assert.doesNotThrow(() => {
    value = pageTitle(routeId);
  }, "pageTitle must return the title");
  assert.ok(value !== undefined, "pageTitle returned a title");
  return value;
}

test("C-acc8eaf4 routeTable appends not-found and pageTitle names the pages", () => {
  assert.deepEqual(table([]), [{ id: "not-found", path: "*" }]);

  assert.deepEqual(table([feature("a", "/a"), feature("b", "/b/:id")]), [
    { id: "a", path: "/a" },
    { id: "b", path: "/b/:id" },
    { id: "not-found", path: "*" },
  ]);

  assert.equal(title("not-found"), "Page not found · Ursitoare");
  assert.equal(title("home"), "Ursitoare");
  assert.equal(title("a"), "Ursitoare");
});
