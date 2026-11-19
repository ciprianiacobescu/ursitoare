/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { captionDisplayFor } from "../kit/layout/layout.ts";
import { TOOL_TABLES } from "../tools/pages.ts";
import { ADMIN_TABLES } from "./pages.ts";

const MARKER = "captionDisplay={captionDisplayFor(";

const PAGES: readonly (readonly [string, URL])[] = [
  ["UsersPage.tsx", new URL("./UsersPage.tsx", import.meta.url)],
  ["TeamsPage.tsx", new URL("./TeamsPage.tsx", import.meta.url)],
  ["MappingsPage.tsx", new URL("./MappingsPage.tsx", import.meta.url)],
  ["AuditPage.tsx", new URL("./AuditPage.tsx", import.meta.url)],
  ["ServersPage.tsx", new URL("../tools/ServersPage.tsx", import.meta.url)],
  ["GrantsPage.tsx", new URL("../tools/GrantsPage.tsx", import.meta.url)],
  ["PoliciesPage.tsx", new URL("../tools/PoliciesPage.tsx", import.meta.url)],
];

test("C-e4e27fab exactly four captions are hidden", () => {
  assert.equal(typeof captionDisplayFor, "function");
  const pairs: readonly (readonly [string, string])[] = [
    [ADMIN_TABLES.users.caption, "Users"],
    [ADMIN_TABLES.roles.caption, "Roles and teams"],
    [ADMIN_TABLES.teams.caption, "Roles and teams"],
    [ADMIN_TABLES.mappings.caption, "Group mappings"],
    [ADMIN_TABLES.audit.caption, "Audit log"],
    [TOOL_TABLES.servers.caption, "Tool servers"],
    [TOOL_TABLES.tools.caption, "Tool servers"],
    [TOOL_TABLES.grants.caption, "Grants"],
  ];
  const hidden = pairs.filter(([c, h]) => captionDisplayFor(c, h) === "hidden").map(([c]) => c);
  const visible = pairs.filter(([c, h]) => captionDisplayFor(c, h) === "visible").map(([c]) => c);
  assert.deepEqual(hidden, ["Users", "Group mappings", "Tool servers", "Grants"]);
  assert.deepEqual(visible, ["Roles", "Teams", "Audit events", "Tools"]);

  const withMarker = PAGES.filter(([, url]) => readFileSync(url, "utf8").includes(MARKER)).map(
    ([name]) => name,
  );
  assert.deepEqual(withMarker, [
    "UsersPage.tsx",
    "MappingsPage.tsx",
    "ServersPage.tsx",
    "GrantsPage.tsx",
  ]);
});
