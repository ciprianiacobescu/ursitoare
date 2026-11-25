/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { featureLiterals } from "../admin/pages.ts";
import { createFeatureRegistry } from "../app/features.ts";
import { visibleNav } from "../kit/capabilities.ts";
import { findInlineStyleUse } from "../kit/contrast.ts";
import { findCssImports, findPaletteUtilities } from "../ui/rules.ts";
import { CREDENTIAL_NAMES } from "./credentials.ts";
import { TOOL_PAGES } from "./pages.ts";
import { REGISTER_NAMES, REGISTER_PAGE } from "./register.ts";

const REGISTER_VALUES: readonly string[] = [
  "Register a tool server",
  "New tool server",
  "Kind",
  "MCP server",
  "OpenAPI document",
  "Code block",
  "Server id",
  "MCP URL",
  "Origin",
  "Local network server",
  "OpenAPI document (JSON)",
  "Preview operations",
  "Operations",
  "Skip",
  "Effect of ",
  "Tool name",
  "Description",
  "Input schema (JSON)",
  "Output schema (JSON)",
  "Source",
  "Register server",
  "Change registration",
  "Replace document",
  "Edit code",
  "Save changes",
  "Document replaced.",
  "Code saved.",
  "Do not paste a URL that holds a key; store the key as a credential.",
  "This server has several tools; edit it through the API.",
];

const CREDENTIAL_VALUES: readonly string[] = [
  "Credential",
  "Scheme",
  "API key header",
  "Bearer token",
  "Header name",
  "Secret value",
  "Store credential",
  "Rotate credential",
  "Credential stored.",
  "Credential rotated.",
  "A server that needs no key still needs a value here: enter any text.",
];

function read(name: string): string {
  const url = new URL(name, import.meta.url);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

const FEATURE = read("../features/67-admin-tool-register.tsx");
const REGISTER_PAGE_SRC = read("./RegisterPage.tsx");
const CREDENTIAL_SRC = read("./CredentialSection.tsx");
const REPLACE_SRC = read("./ReplaceSection.tsx");
const SERVERS_SRC = read("./ServersPage.tsx");
const GRANTS_SRC = read("./GrantsPage.tsx");

const CSRF = ["cs", "rf_", "a".repeat(38)].join("");

function carol(): {
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
      capabilities: new Set([
        "read_self",
        "read_registry",
        "register_tool_server",
        "approve_tool_surface",
        "deploy_policy",
        "manage_tenant",
        "manage_users_roles",
        "read_audit",
      ]),
      csrfToken: CSRF,
    },
  };
}

test("C-2ec0cc21 the registration constants hold the fixed names", () => {
  assert.deepEqual(REGISTER_PAGE, {
    id: "admin-tool-register",
    file: "67-admin-tool-register.tsx",
    path: "/admin/tool-servers/new",
    capability: "register_tool_server",
    title: "Register a tool server · Ursitoare",
  });
  assert.deepEqual(Object.values(REGISTER_NAMES).sort(), [...REGISTER_VALUES].sort());
  assert.equal(Object.keys(REGISTER_NAMES).length, 29);
  assert.deepEqual(Object.values(CREDENTIAL_NAMES).sort(), [...CREDENTIAL_VALUES].sort());
  assert.equal(Object.keys(CREDENTIAL_NAMES).length, 11);
});

test("C-2ec0cc21 the feature file has no navLabel and the nav lists the three tool pages", () => {
  assert.equal(featureLiterals(FEATURE), null, "the feature has no navLabel");
  for (const token of [
    'id: "admin-tool-register"',
    'path: "/admin/tool-servers/new"',
    'capability: "register_tool_server"',
    "registerToolMessages();",
  ]) {
    assert.equal(FEATURE.includes(token), true, `the feature file holds ${token}`);
  }

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
  registry.register({
    id: REGISTER_PAGE.id,
    path: REGISTER_PAGE.path,
    capability: REGISTER_PAGE.capability,
    element: null,
  });
  assert.deepEqual(
    visibleNav(carol(), registry.nav).map((item) => item.label),
    ["Tool servers", "Grants", "Policies"],
  );
});

test("C-2ec0cc21 the new pages use the kit and keep the secret field a password", () => {
  assert.equal(CREDENTIAL_SRC.includes('type="password"'), true);
  assert.equal(CREDENTIAL_SRC.includes('autoComplete="new-password"'), true);
  assert.equal(REGISTER_PAGE_SRC.includes("PageHeader"), true);
  assert.equal(REGISTER_PAGE_SRC.includes("PAGE_WIDTHS.form"), true);
  for (const [name, source] of [
    ["RegisterPage", REGISTER_PAGE_SRC],
    ["CredentialSection", CREDENTIAL_SRC],
    ["ReplaceSection", REPLACE_SRC],
  ] as const) {
    assert.notEqual(source, "", `${name} exists`);
    for (const banned of ["console.", "localStorage", "sessionStorage", "dangerouslySetInnerHTML"]) {
      assert.equal(source.includes(banned), false, `${name} has no ${banned}`);
    }
    assert.deepEqual(findInlineStyleUse(source), [], `${name} has no inline style`);
    assert.deepEqual(findCssImports(source), [], `${name} imports no css`);
    assert.deepEqual(findPaletteUtilities(source), [], `${name} has no palette utility`);
  }
});

test("C-2ec0cc21 the servers and grants pages carry the link, the sections and the note", () => {
  assert.equal(SERVERS_SRC.includes("Register a tool server"), true, "the link text");
  assert.equal(SERVERS_SRC.includes("CredentialSection"), true);
  assert.equal(SERVERS_SRC.includes("ReplaceSection"), true);
  assert.equal(GRANTS_SRC.includes("toolListNote("), true);
  assert.equal(GRANTS_SRC.includes("tools.value.refs"), true);
});
