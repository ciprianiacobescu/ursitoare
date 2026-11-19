/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { NavItem } from "./features.ts";
import { navGroups } from "./nav-groups.ts";

function item(id: string): NavItem {
  return { id, path: "/" + id, label: id };
}

const ADMIN_IDS = [
  "admin-users",
  "admin-roles-teams",
  "admin-group-mappings",
  "admin-audit",
  "admin-tool-servers",
  "admin-grants",
  "admin-policies",
];
const CAROL = ["home", ...ADMIN_IDS, "flows", "runs"];

function shape(items: readonly NavItem[]): [string, string | null, string[]][] {
  return navGroups(items).map((g) => [g.id, g.label, g.items.map((i) => i.id)]);
}

test("C-4ef0679b G1 carol's ten entries form three groups", () => {
  assert.equal(typeof navGroups, "function");
  assert.deepEqual(shape(CAROL.map(item)), [
    ["home", null, ["home"]],
    ["build", "Build", ["flows", "runs"]],
    ["admin", "Admin", ADMIN_IDS],
  ]);
});

test("C-4ef0679b G2 and G3 leave out empty groups", () => {
  assert.equal(typeof navGroups, "function");
  assert.deepEqual(shape(["home", "flows", "runs"].map(item)), [
    ["home", null, ["home"]],
    ["build", "Build", ["flows", "runs"]],
  ]);
  assert.deepEqual(shape([item("home")]), [["home", null, ["home"]]]);
  assert.deepEqual(navGroups([]), []);
});

test("C-4ef0679b G5 an unknown id goes to more after build", () => {
  assert.equal(typeof navGroups, "function");
  assert.deepEqual(shape(["home", "zz-new", "flows"].map(item)), [
    ["home", null, ["home"]],
    ["build", "Build", ["flows"]],
    ["more", "More", ["zz-new"]],
  ]);
});

test("C-4ef0679b G6 prototype-style ids go to more", () => {
  assert.equal(typeof navGroups, "function");
  const ids = ["constructor", "toString", "__proto__", "hasOwnProperty"];
  assert.deepEqual(shape(ids.map(item)), [["more", "More", ids]]);
});

test("C-4ef0679b G7 frozen input passes through unchanged", () => {
  assert.equal(typeof navGroups, "function");
  const input = Object.freeze(CAROL.map((id) => Object.freeze(item(id))));
  let out: ReturnType<typeof navGroups> = [];
  assert.doesNotThrow(() => {
    out = navGroups(input);
  });
  assert.equal(out.length, 3);
  assert.equal(out[1]?.items[0], input[8]);
  assert.equal(input.length, 10);
  assert.equal(out.reduce((n, g) => n + g.items.length, 0), 10);
});

test("C-4ef0679b G8 and G9 keep input order inside a group", () => {
  assert.equal(typeof navGroups, "function");
  assert.deepEqual(shape(["admin-grants", "admin-users", "runs", "flows"].map(item)), [
    ["build", "Build", ["runs", "flows"]],
    ["admin", "Admin", ["admin-grants", "admin-users"]],
  ]);
  assert.deepEqual(shape(["b-new", "a-new", "home"].map(item)), [
    ["home", null, ["home"]],
    ["more", "More", ["b-new", "a-new"]],
  ]);
});
