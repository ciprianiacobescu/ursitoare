/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ADMIN_PAGES } from "../admin/pages.ts";
import { FLOW_PAGES } from "../flows/pages.ts";
import { RUN_PAGES } from "../runs/pages.ts";
import { TOOL_PAGES } from "../tools/pages.ts";
import { NAV_GROUP_LABELS, NAV_GROUP_OF } from "./nav-groups.ts";

const EXPECTED: Record<string, string> = {
  home: "home",
  flows: "build",
  runs: "build",
  "admin-users": "admin",
  "admin-roles-teams": "admin",
  "admin-group-mappings": "admin",
  "admin-audit": "admin",
  "admin-tool-servers": "admin",
  "admin-grants": "admin",
  "admin-policies": "admin",
};

function navIds(): string[] {
  const pages: readonly { id: string; navLabel: string | null }[] = [
    ...ADMIN_PAGES,
    ...TOOL_PAGES,
    ...FLOW_PAGES,
    ...RUN_PAGES,
  ];
  return ["home", ...pages.filter((p) => p.navLabel !== null).map((p) => p.id)];
}

test("C-e722bbf4 the map holds exactly the ten navigation ids with their groups", () => {
  assert.deepEqual(Object.keys(NAV_GROUP_OF).sort(), Object.keys(EXPECTED).sort());
  for (const [id, group] of Object.entries(EXPECTED)) {
    assert.equal(NAV_GROUP_OF[id], group);
  }
  assert.deepEqual(navIds().sort(), Object.keys(NAV_GROUP_OF).sort());
  assert.equal(Object.hasOwn(NAV_GROUP_OF, "flow-editor"), false);
  assert.equal(Object.hasOwn(NAV_GROUP_OF, "run"), false);
});

test("C-e722bbf4 the group labels are fixed", () => {
  assert.deepEqual(NAV_GROUP_LABELS, { home: null, build: "Build", admin: "Admin", more: "More" });
});
