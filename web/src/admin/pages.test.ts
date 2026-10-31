/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { createFeatureRegistry } from "../app/features.ts";
import type { FeatureRegistry } from "../app/features.ts";
import { dataTableModel } from "../kit/data/data-table.ts";
import type { DataTableModel, DataTableSpec } from "../kit/data/data-table.ts";
import { ADMIN_PAGES, ADMIN_TABLES, featureLiterals } from "./pages.ts";
import type { AdminPage, FeatureLiterals } from "./pages.ts";

assert.equal(typeof featureLiterals, "function");

const LITERAL_SOURCE =
  'export const feature = { id: "admin-users", path: "/admin/users", navLabel: "Users", capability: "manage_users_roles", element: <UsersPage /> };';
const EXPRESSION_PATH_SOURCE =
  'export const feature = { id: "admin-users", path: adminPath, navLabel: "Users", capability: "manage_users_roles", element: <UsersPage /> };';

function modelFor(key: keyof typeof ADMIN_TABLES): DataTableModel {
  let model: DataTableModel | undefined;
  assert.doesNotThrow(() => {
    model = dataTableModel(ADMIN_TABLES[key]);
  }, `dataTableModel builds the ${key} table`);
  assert.ok(model !== undefined, `the ${key} table has a model`);
  return model;
}

test("C-2c3410e3 the page table lists the four admin pages in order", () => {
  const expected: readonly AdminPage[] = [
    {
      id: "admin-users",
      file: "60-admin-users.tsx",
      path: "/admin/users",
      navLabel: "Users",
      capability: "manage_users_roles",
    },
    {
      id: "admin-roles-teams",
      file: "61-admin-roles-teams.tsx",
      path: "/admin/roles-and-teams",
      navLabel: "Roles and teams",
      capability: "manage_users_roles",
    },
    {
      id: "admin-group-mappings",
      file: "62-admin-group-mappings.tsx",
      path: "/admin/group-mappings",
      navLabel: "Group mappings",
      capability: "manage_users_roles",
    },
    {
      id: "admin-audit",
      file: "63-admin-audit.tsx",
      path: "/admin/audit",
      navLabel: "Audit log",
      capability: "read_audit",
    },
  ];

  assert.deepEqual(ADMIN_PAGES, expected, "the admin pages are listed in their order");
});

test("C-2c3410e3 the admin tables carry their captions columns and empty texts", () => {
  const expected: Record<keyof typeof ADMIN_TABLES, DataTableSpec> = {
    users: {
      caption: "Users",
      columns: [
        { key: "name", header: "Name", rowHeader: true },
        { key: "email", header: "Email" },
        { key: "state", header: "State" },
        { key: "rolesTeams", header: "Roles and teams" },
        { key: "actions", header: "Actions" },
      ],
      emptyTitle: "No users yet",
      emptyDescription: "People appear here after they first sign in.",
    },
    roles: {
      caption: "Roles",
      columns: [{ key: "role", header: "Role", rowHeader: true }],
      emptyTitle: "No roles",
    },
    teams: {
      caption: "Teams",
      columns: [
        { key: "team", header: "Team", rowHeader: true },
        { key: "actions", header: "Actions" },
      ],
      emptyTitle: "No teams yet",
    },
    mappings: {
      caption: "Group mappings",
      columns: [
        { key: "group", header: "Group", rowHeader: true },
        { key: "grants", header: "Grants" },
        { key: "issuer", header: "Issuer" },
        { key: "reviewedBy", header: "Reviewed by" },
        { key: "actions", header: "Actions" },
      ],
      emptyTitle: "No group mappings",
      emptyDescription: "Map a group so its members get access when they sign in.",
    },
    audit: {
      caption: "Audit events",
      columns: [
        { key: "seq", header: "Number", rowHeader: true },
        { key: "time", header: "Time (UTC)" },
        { key: "type", header: "Type" },
        { key: "actor", header: "Actor" },
        { key: "target", header: "Target" },
        { key: "details", header: "Details" },
      ],
      emptyTitle: "No events",
    },
  };

  for (const key of Object.keys(expected) as (keyof typeof ADMIN_TABLES)[]) {
    const spec = expected[key];
    assert.deepEqual(ADMIN_TABLES[key], spec, `the ${key} table is its spec`);
    const model = modelFor(key);
    assert.equal(model.caption, spec.caption, `the ${key} table has its caption`);
    assert.equal(model.emptyTitle, spec.emptyTitle, `the ${key} table has its empty title`);
    assert.equal(
      model.emptyDescription,
      spec.emptyDescription ?? null,
      `the ${key} table has its empty description`,
    );
  }

  assert.ok(
    ADMIN_TABLES.users.columns.some((column) => column.header === "Roles and teams"),
    "the users table has a Roles and teams column",
  );
});

test("C-7c7c77c3 the navigation follows capabilities", () => {
  const registry: FeatureRegistry = createFeatureRegistry();
  for (const page of ADMIN_PAGES) {
    registry.register({
      id: page.id,
      path: page.path,
      navLabel: page.navLabel,
      capability: page.capability,
      element: null,
    });
  }

  const labels = (capabilities: ReadonlySet<string>): string[] =>
    registry.nav(capabilities).map((item) => item.label);

  assert.deepEqual(labels(new Set()), [], "a user with no capability sees no admin page");
  assert.deepEqual(
    labels(new Set(["read_self", "read_audit"])),
    ["Audit log"],
    "a reader of the audit log sees only that page",
  );
  assert.deepEqual(
    labels(new Set(["manage_users_roles", "read_audit"])),
    ["Users", "Roles and teams", "Group mappings", "Audit log"],
    "an administrator sees every admin page in order",
  );
});

test("C-bf07943b featureLiterals reads the four string literals of a feature file", () => {
  let literal: FeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    literal = featureLiterals(LITERAL_SOURCE);
  }, "the sample feature text is read");
  assert.deepEqual(
    literal,
    {
      id: "admin-users",
      path: "/admin/users",
      navLabel: "Users",
      capability: "manage_users_roles",
    },
    "the four literals are read from the sample text",
  );

  let expressionPath: FeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    expressionPath = featureLiterals(EXPRESSION_PATH_SOURCE);
  }, "the sample with an expression path is read");
  assert.equal(expressionPath, null, "a path that is not a string literal gives null");
});
