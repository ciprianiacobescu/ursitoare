/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { featureLiterals } from "../admin/pages.ts";
import { createFeatureRegistry } from "../app/features.ts";
import { visibleNav } from "../kit/capabilities.ts";
import { findInlineStyleUse, findRawColours, parseTokens } from "../kit/contrast.ts";
import { dataTableModel } from "../kit/data/data-table.ts";
import type { DataTableModel, DataTableSpec } from "../kit/data/data-table.ts";
import { TOOL_NAMES, TOOL_PAGES, TOOL_TABLES, TOOL_TITLES } from "./pages.ts";
import { serverIdFromSearch, serverLink } from "./servers.ts";

assert.equal(typeof featureLiterals, "function");
assert.equal(typeof visibleNav, "function");
assert.equal(typeof findRawColours, "function");
assert.equal(typeof findInlineStyleUse, "function");
assert.equal(typeof parseTokens, "function");
assert.equal(typeof createFeatureRegistry, "function");

const CSS_URL = new URL("./tools.css", import.meta.url);
const TOKENS_CSS_URL = new URL("../kit/tokens.css", import.meta.url);
const PAGE_URLS: readonly URL[] = [
  new URL("./ServersPage.tsx", import.meta.url),
  new URL("./GrantsPage.tsx", import.meta.url),
  new URL("./PoliciesPage.tsx", import.meta.url),
];
const FEATURE_URLS: readonly URL[] = [
  new URL("../features/64-admin-tool-servers.tsx", import.meta.url),
  new URL("../features/65-admin-grants.tsx", import.meta.url),
  new URL("../features/66-admin-policies.tsx", import.meta.url),
];

const PAGE_SOURCE_TOKENS = [
  "regionState(",
  "actionState(",
  "LoadingState",
  "aria-disabled",
  "browserSession.api",
] as const;

const PAGE_NAME_KEYS: readonly (readonly string[])[] = [
  ["surfaceHeading", "approveButton", "ownBox"],
  [
    "grantForm",
    "subjectGroup",
    "subjectRole",
    "subjectUser",
    "subjectField",
    "toolField",
    "scopeGroup",
    "scopeAny",
    "scopeNode",
    "flowField",
    "stepField",
    "createGrant",
    "revoke",
    "confirm",
    "deployHint",
  ],
  ["cedarField", "validate", "deploy"],
];

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function readSource(url: URL): string {
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

function tokenUses(css: string): string[] {
  const found: string[] = [];
  for (const match of css.matchAll(/var\((--[a-z0-9-]+)\)/g)) {
    const name = match[1];
    assert.ok(name !== undefined, "a var use was read");
    found.push(name);
  }
  return found;
}

function modelFor(key: keyof typeof TOOL_TABLES): DataTableModel {
  let model: DataTableModel | undefined;
  assert.doesNotThrow(() => {
    model = dataTableModel(TOOL_TABLES[key]);
  }, `dataTableModel builds the ${key} table`);
  assert.ok(model !== undefined, `the ${key} table has a model`);
  return model;
}

const EXPECTED_PAGES = [
  {
    id: "admin-tool-servers",
    file: "64-admin-tool-servers.tsx",
    path: "/admin/tool-servers",
    navLabel: "Tool servers",
    capability: "register_tool_server",
  },
  {
    id: "admin-grants",
    file: "65-admin-grants.tsx",
    path: "/admin/grants",
    navLabel: "Grants",
    capability: "deploy_policy",
  },
  {
    id: "admin-policies",
    file: "66-admin-policies.tsx",
    path: "/admin/policies",
    navLabel: "Policies",
    capability: "deploy_policy",
  },
] as const;

const EXPECTED_TABLES: Record<keyof typeof TOOL_TABLES, DataTableSpec> = {
  servers: {
    caption: "Tool servers",
    columns: [
      { key: "server", header: "Server", rowHeader: true },
      { key: "summary", header: "Summary" },
    ],
    emptyTitle: "No tool servers",
  },
  tools: {
    caption: "Tools",
    columns: [
      { key: "name", header: "Name", rowHeader: true },
      { key: "effect", header: "Effect" },
      { key: "block", header: "Block" },
      { key: "result", header: "Result" },
      { key: "call", header: "Call" },
    ],
    emptyTitle: "No tools",
  },
  grants: {
    caption: "Grants",
    columns: [
      { key: "grant", header: "Grant", rowHeader: true },
      { key: "actions", header: "Actions" },
    ],
    emptyTitle: "No grants",
  },
};

const EXPECTED_NAMES: Readonly<Record<string, string>> = {
  surfaceHeading: "Surface",
  approveButton: "Approve surface",
  ownBox: "I approve my own surface",
  grantForm: "New grant",
  subjectGroup: "Subject",
  subjectRole: "Role",
  subjectUser: "User",
  subjectField: "Role or user",
  toolField: "Tool",
  scopeGroup: "Scope",
  scopeAny: "Any step",
  scopeNode: "One step",
  flowField: "Flow",
  stepField: "Step",
  createGrant: "Create grant",
  revoke: "Revoke",
  confirm: "Confirm for the newest version",
  cedarField: "Hand-written Cedar",
  validate: "Validate",
  deploy: "Deploy",
  deployHint: "Grant changes take effect when you deploy the policy.",
};

const CSRF = ["cs", "rf_", "a".repeat(38)].join("");

function ready(capabilities: readonly string[]): {
  status: "ready";
  me: {
    user: { id: string; displayName: string; email: null };
    tenant: { id: string; name: string; reviewProfile: "team" };
    capabilities: ReadonlySet<string>;
    csrfToken: string;
  };
} {
  return {
    status: "ready",
    me: {
      user: { id: "u_carol", displayName: "Carol", email: null },
      tenant: { id: "tenant_a", name: "Tenant", reviewProfile: "team" },
      capabilities: new Set(capabilities),
      csrfToken: CSRF,
    },
  };
}

test("C-ba990588 the tool pages, titles, tables and names are fixed", () => {
  assert.deepEqual(TOOL_PAGES, EXPECTED_PAGES, "the tool pages are listed in their order");
  assert.deepEqual(TOOL_TITLES, {
    servers: "Tool servers · Ursitoare",
    grants: "Grants · Ursitoare",
    policies: "Policies · Ursitoare",
  });
  assert.deepEqual(TOOL_NAMES, EXPECTED_NAMES, "TOOL_NAMES is design § Roles and names");

  for (const key of Object.keys(EXPECTED_TABLES) as (keyof typeof TOOL_TABLES)[]) {
    const spec = EXPECTED_TABLES[key];
    assert.deepEqual(TOOL_TABLES[key], spec, `the ${key} table is its spec`);
    const model = modelFor(key);
    assert.equal(model.caption, spec.caption, `the ${key} table has its caption`);
    assert.equal(model.emptyTitle, spec.emptyTitle, `the ${key} table has its empty title`);
    assert.equal(model.emptyDescription, null, `the ${key} table has no empty description`);
  }

  assert.deepEqual(
    modelFor("servers").columns.map((column) => column.cellTag),
    ["th", "td"],
    "the servers table has a row header and one cell",
  );
  assert.deepEqual(
    modelFor("tools").columns.map((column) => column.cellTag),
    ["th", "td", "td", "td", "td"],
    "the tools table has a row header and four cells",
  );
  assert.deepEqual(
    modelFor("grants").columns.map((column) => column.cellTag),
    ["th", "td"],
    "the grants table has a row header and one cell",
  );
});

test("C-ba990588 serverLink and serverIdFromSearch follow the id pattern", () => {
  assert.equal(call(() => serverLink("acme")), "/admin/tool-servers?server=acme");
  assert.throws(() => serverLink("a/b"), RangeError, "a server id with a slash is refused");

  assert.equal(call(() => serverIdFromSearch("?server=acme")), "acme");
  assert.equal(call(() => serverIdFromSearch("server=beta_2")), "beta_2");
  assert.equal(call(() => serverIdFromSearch("?server=acme&server=beta")), "acme");
  for (const search of ["?server=Acme", "?server=", "", "?other=acme", "?server=a%2Fb"]) {
    assert.equal(call(() => serverIdFromSearch(search)), null, `${JSON.stringify(search)} gives null`);
  }
});

test("C-ba990588 the tools stylesheet uses kit tokens and no raw colour or inline style", () => {
  const css = readSource(CSS_URL);
  const tokens = parseTokens(readSource(TOKENS_CSS_URL));

  assert.deepEqual(findRawColours(css), [], "tools.css holds no raw colour");
  assert.deepEqual(findInlineStyleUse(css), [], "tools.css uses no inline style");
  for (const name of tokenUses(css)) {
    assert.ok(Object.hasOwn(tokens, name), `tools.css uses the kit token ${name}`);
  }

  for (const url of PAGE_URLS) {
    const source = readSource(url);
    assert.deepEqual(findRawColours(source), [], `${url.pathname} holds no raw colour`);
    assert.deepEqual(findInlineStyleUse(source), [], `${url.pathname} has no inline style`);
    assert.equal(
      source.includes("dangerouslySetInnerHTML"),
      false,
      `${url.pathname} sets no raw html`,
    );
  }
});

test("C-ba990588 the pages use the kit components, their names and the page tokens", () => {
  const sources = PAGE_URLS.map(readSource);
  const all = sources.join("\n");
  for (const component of ["DataTable", "Form", "ConfirmDialog"]) {
    assert.equal(all.includes(component), true, `the pages use ${component}`);
  }

  for (const [index, url] of PAGE_URLS.entries()) {
    const source = sources[index] ?? "";
    for (const token of PAGE_SOURCE_TOKENS) {
      assert.equal(source.includes(token), true, `${url.pathname} contains ${token}`);
    }
    for (const key of PAGE_NAME_KEYS[index] ?? []) {
      assert.equal(source.includes(key), true, `${url.pathname} names TOOL_NAMES.${key}`);
    }
  }

  const servers = sources[0] ?? "";
  assert.equal(servers.includes("DataTable"), true, "ServersPage uses DataTable");
  assert.equal(servers.includes("ConfirmDialog"), true, "ServersPage uses ConfirmDialog");
  const grants = sources[1] ?? "";
  assert.equal(grants.includes("DataTable"), true, "GrantsPage uses DataTable");
  assert.equal(grants.includes("Form"), true, "GrantsPage uses Form");
});

test("C-a7f551fc the feature files declare the tool pages and register the messages", () => {
  const literals = FEATURE_URLS.map((url) => featureLiterals(readSource(url)));
  assert.deepEqual(
    literals,
    EXPECTED_PAGES.map((page) => ({
      id: page.id,
      path: page.path,
      navLabel: page.navLabel,
      capability: page.capability,
    })),
    "the feature literals describe the tool pages",
  );

  for (const url of FEATURE_URLS) {
    const source = readSource(url);
    assert.equal(
      source.includes("registerToolMessages();"),
      true,
      `${url.pathname} registers the tool messages`,
    );
  }
});

test("C-a7f551fc the navigation is gated by the tool capabilities", () => {
  const registry = createFeatureRegistry();
  for (const page of TOOL_PAGES) {
    registry.register({
      id: page.id,
      path: page.path,
      navLabel: page.navLabel,
      capability: page.capability,
      element: null,
    });
  }

  const labels = (capabilities: readonly string[]): string[] =>
    visibleNav(ready(capabilities), registry.nav).map((item) => item.label);

  assert.deepEqual(
    labels([
      "read_self",
      "read_registry",
      "register_tool_server",
      "approve_tool_surface",
      "deploy_policy",
      "manage_tenant",
      "manage_users_roles",
      "read_audit",
    ]),
    ["Tool servers", "Grants", "Policies"],
    "carol sees all three tool pages",
  );
  assert.deepEqual(
    labels(["read_self", "read_registry", "read_flow", "read_run"]),
    [],
    "alice sees none of the tool pages",
  );
  assert.deepEqual(
    labels(["deploy_policy"]),
    ["Grants", "Policies"],
    "a deployer sees Grants and Policies only",
  );
  assert.deepEqual(
    visibleNav(null, registry.nav).map((item) => item.label),
    [],
    "no session sees none of the tool pages",
  );
});
