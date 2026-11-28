import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import {
  REALM_TEMPLATE_PATH,
  readRealmTemplate,
  realmPlaceholders,
  renderRealm,
} from "./realm.ts";

type RenderedRealm = {
  realm: string;
  sslRequired: string;
  browserFlow: string;
  clients: Array<Record<string, unknown>>;
  groups: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  organizations: Array<Record<string, unknown>>;
  authenticationFlows: Array<Record<string, unknown>>;
};

const REPO = join(import.meta.dirname, "..", "..");
const TEMPLATE_PATH = join(REPO, "deploy", "keycloak", "import", "ursitoare-realm.json");

const ENV: Record<string, string> = {
  KC_URSITOARE_CLIENT_SECRET: "test-client-secret-0001",
  KC_URSITOARE_REDIRECT_URI: "http://127.0.0.1:8080/auth/oidc/callback",
  KC_URSITOARE_POST_LOGOUT_URI: "http://127.0.0.1:8080/sign-in",
  KC_URSITOARE_FIRST_USER: "owner",
  KC_URSITOARE_FIRST_PASSWORD: "test-first-password-0001",
  KC_URSITOARE_ORGANIZATION: "home",
};

function clientOf(realm: unknown, id: string): Record<string, unknown> | undefined {
  const r = realm as { clients?: unknown[] };
  return (r.clients ?? []).find((c) => (c as { clientId?: unknown })?.clientId === id) as
    | Record<string, unknown>
    | undefined;
}


function at<T>(arr: T[], i: number): T {
  return arr[i] as T;
}

test("C-bc176b5f the committed template names the six placeholders and renders with test values", () => {
  assert.equal(typeof realmPlaceholders, "function");

  assert.equal(existsSync(TEMPLATE_PATH), true);
  assert.equal(REALM_TEMPLATE_PATH, "deploy/keycloak/import/ursitoare-realm.json");

  const template = readRealmTemplate();
  assert.deepEqual(realmPlaceholders(template), [
    "KC_URSITOARE_CLIENT_SECRET",
    "KC_URSITOARE_FIRST_PASSWORD",
    "KC_URSITOARE_FIRST_USER",
    "KC_URSITOARE_ORGANIZATION",
    "KC_URSITOARE_POST_LOGOUT_URI",
    "KC_URSITOARE_REDIRECT_URI",
  ]);

  // rendered with ENV
  const r0 = renderRealm(template, ENV) as RenderedRealm;
  const engine0 = clientOf(r0, "ursitoare-engine") as Record<string, unknown>;
  assert.equal(engine0.secret, "test-client-secret-0001");
  assert.deepEqual(engine0.redirectUris, ["http://127.0.0.1:8080/auth/oidc/callback"]);
  assert.equal((engine0 as { attributes: Record<string, unknown> }).attributes["post.logout.redirect.uris"], "http://127.0.0.1:8080/sign-in##http://127.0.0.1:8080/auth/oidc/callback");
  assert.equal(at(r0.users, 0).username, "owner");
  assert.equal(at(at(r0.users, 0).credentials as Array<Record<string, unknown>>, 0).value, "test-first-password-0001");
  assert.equal(at(r0.organizations, 0).name, "home");
  assert.equal(at(r0.organizations, 0).alias, "home");

  // without organization value
  const envNoOrg = { ...ENV };
  delete envNoOrg.KC_URSITOARE_ORGANIZATION;
  const r1 = renderRealm(template, envNoOrg) as RenderedRealm;
  assert.equal(at(r1.organizations, 0).name, "home");
  assert.equal(at(r1.organizations, 0).alias, "home");

  // with acme
  const r2 = renderRealm(template, { ...ENV, KC_URSITOARE_ORGANIZATION: "acme" }) as RenderedRealm;
  assert.equal(at(r2.organizations, 0).name, "acme");
  assert.equal(at(r2.organizations, 0).alias, "acme");

  // with {}
  const r3 = renderRealm(template, {}) as RenderedRealm;
  assert.equal((clientOf(r3, "ursitoare-engine") as Record<string, unknown>).secret, "${KC_URSITOARE_CLIENT_SECRET}");
  assert.equal(at(r3.organizations, 0).alias, "home");
});

test("C-998a2d20 the committed template is the realm of the test plan", () => {
  assert.equal(typeof realmPlaceholders, "function");

  assert.equal(existsSync(TEMPLATE_PATH), true);

  const expected = {
    realm: "ursitoare",
    enabled: true,
    sslRequired: "external",
    registrationAllowed: false,
    organizationsEnabled: true,
    browserFlow: "browser-single-page",
    authenticationFlows: [
      {
        alias: "browser-single-page",
        description: "browser login on one page",
        providerId: "basic-flow",
        topLevel: true,
        builtIn: false,
        authenticationExecutions: [
          { authenticator: "auth-cookie", authenticatorFlow: false, requirement: "ALTERNATIVE", priority: 10, userSetupAllowed: false },
          { authenticator: "identity-provider-redirector", authenticatorFlow: false, requirement: "ALTERNATIVE", priority: 25, userSetupAllowed: false },
          { authenticatorFlow: true, requirement: "ALTERNATIVE", priority: 30, flowAlias: "browser-single-page forms", userSetupAllowed: false },
        ],
      },
      {
        alias: "browser-single-page forms",
        description: "username, password, conditional OTP",
        providerId: "basic-flow",
        topLevel: false,
        builtIn: false,
        authenticationExecutions: [
          { authenticator: "auth-username-password-form", authenticatorFlow: false, requirement: "REQUIRED", priority: 10, userSetupAllowed: false },
          { authenticatorFlow: true, requirement: "CONDITIONAL", priority: 20, flowAlias: "browser-single-page otp", userSetupAllowed: false },
        ],
      },
      {
        alias: "browser-single-page otp",
        description: "OTP when the user has one",
        providerId: "basic-flow",
        topLevel: false,
        builtIn: false,
        authenticationExecutions: [
          { authenticator: "conditional-user-configured", authenticatorFlow: false, requirement: "REQUIRED", priority: 10, userSetupAllowed: false },
          { authenticator: "auth-otp-form", authenticatorFlow: false, requirement: "REQUIRED", priority: 20, userSetupAllowed: false },
        ],
      },
    ],
    groups: [{ name: "ursitoare-admins" }, { name: "ursitoare-authors" }, { name: "team-default" }],
    clients: [
      {
        clientId: "ursitoare-engine",
        enabled: true,
        publicClient: false,
        secret: "${KC_URSITOARE_CLIENT_SECRET}",
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: false,
        redirectUris: ["${KC_URSITOARE_REDIRECT_URI}"],
        attributes: {
          "pkce.code.challenge.method": "S256",
          "post.logout.redirect.uris": "${KC_URSITOARE_POST_LOGOUT_URI}##${KC_URSITOARE_REDIRECT_URI}",
        },
        defaultClientScopes: ["web-origins", "acr", "profile", "roles", "basic", "email"],
        optionalClientScopes: ["organization"],
        protocolMappers: [
          {
            name: "groups",
            protocol: "openid-connect",
            protocolMapper: "oidc-group-membership-mapper",
            config: {
              "claim.name": "groups",
              "full.path": "false",
              "id.token.claim": "true",
              "access.token.claim": "true",
              "userinfo.token.claim": "true",
            },
          },
        ],
      },
      {
        clientId: "ursitoare-mcp",
        enabled: true,
        publicClient: true,
        standardFlowEnabled: true,
        implicitFlowEnabled: false,
        directAccessGrantsEnabled: false,
        serviceAccountsEnabled: false,
        redirectUris: ["http://127.0.0.1/*", "http://localhost/*"],
        attributes: { "pkce.code.challenge.method": "S256" },
        protocolMappers: [
          {
            name: "ursitoare-mcp-audience",
            protocol: "openid-connect",
            protocolMapper: "oidc-audience-mapper",
            config: {
              "included.custom.audience": "ursitoare-mcp",
              "access.token.claim": "true",
            },
          },
        ],
      },
    ],
    users: [
      {
        username: "${KC_URSITOARE_FIRST_USER}",
        enabled: true,
        credentials: [{ type: "password", value: "${KC_URSITOARE_FIRST_PASSWORD}", temporary: true }],
        groups: ["/ursitoare-admins", "/ursitoare-authors", "/team-default"],
      },
    ],
    organizations: [
      {
        name: "${KC_URSITOARE_ORGANIZATION:home}",
        alias: "${KC_URSITOARE_ORGANIZATION:home}",
        enabled: true,
        domains: [],
        members: [{ username: "${KC_URSITOARE_FIRST_USER}" }],
      },
    ],
  };

  const parsed = JSON.parse(readRealmTemplate());
  assert.deepEqual(parsed, expected);

  const r = renderRealm(readRealmTemplate(), ENV) as RenderedRealm;
  assert.equal(r.realm, "ursitoare");
  assert.equal(r.sslRequired, "external");

  const ids = r.clients.map((c) => c.clientId);
  assert.deepEqual(ids, ["ursitoare-engine", "ursitoare-mcp"]);
  assert.equal((clientOf(r, "ursitoare-engine") as Record<string, unknown>).publicClient, false);
  assert.equal((clientOf(r, "ursitoare-mcp") as Record<string, unknown>).publicClient, true);

  assert.deepEqual(r.groups, [{ name: "ursitoare-admins" }, { name: "ursitoare-authors" }, { name: "team-default" }]);

  const u = at(r.users, 0);
  assert.equal(u.username, "owner");
  assert.equal(u.enabled, true);
  assert.deepEqual(u.credentials, [{ type: "password", value: "test-first-password-0001", temporary: true }]);
  assert.deepEqual(u.groups, ["/ursitoare-admins", "/ursitoare-authors", "/team-default"]);
  assert.equal(Object.prototype.hasOwnProperty.call(u, "firstName"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(u, "lastName"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(u, "email"), false);

  assert.deepEqual(r.organizations, [
    { name: "home", alias: "home", enabled: true, domains: [], members: [{ username: "owner" }] },
  ]);

  const r2 = renderRealm(readRealmTemplate(), { ...ENV, KC_URSITOARE_FIRST_USER: "ana.m" }) as RenderedRealm;
  assert.equal(at(r2.users, 0).username, "ana.m");
  assert.equal(at((at(r2.organizations, 0) as { members: Array<{ username: string }> }).members, 0).username, "ana.m");
});

test("C-a1c5860f the bound browser flow has no organization step", () => {
  assert.equal(typeof realmPlaceholders, "function");

  assert.equal(existsSync(TEMPLATE_PATH), true);

  const realm = JSON.parse(readRealmTemplate()) as RenderedRealm;
  assert.equal(realm.browserFlow, "browser-single-page");

  const flows = realm.authenticationFlows as Array<Record<string, unknown>>;
  const aliases = flows.map((f) => f.alias);
  assert.deepEqual(aliases, ["browser-single-page", "browser-single-page forms", "browser-single-page otp"]);

  const topLevel = flows.map((f) => f.topLevel);
  assert.deepEqual(topLevel, [true, false, false]);

  const execsOf = (alias: string) => {
    const f = flows.find((x) => x.alias === alias) as Record<string, unknown>;
    const execs = f.authenticationExecutions as Array<Record<string, unknown>>;
    return execs.map((e) => [e.authenticator ?? e.flowAlias, e.requirement, e.priority]);
  };

  assert.deepEqual(execsOf("browser-single-page"), [
    ["auth-cookie", "ALTERNATIVE", 10],
    ["identity-provider-redirector", "ALTERNATIVE", 25],
    ["browser-single-page forms", "ALTERNATIVE", 30],
  ]);
  assert.deepEqual(execsOf("browser-single-page forms"), [
    ["auth-username-password-form", "REQUIRED", 10],
    ["browser-single-page otp", "CONDITIONAL", 20],
  ]);
  assert.deepEqual(execsOf("browser-single-page otp"), [
    ["conditional-user-configured", "REQUIRED", 10],
    ["auth-otp-form", "REQUIRED", 20],
  ]);

  // no execution has authenticator organization, directly or via flowAlias
  const defined = new Set(aliases);
  function reachable(alias: string, seen = new Set<string>()): Array<Record<string, unknown>> {
    if (seen.has(alias)) return [];
    seen.add(alias);
    const f = flows.find((x) => x.alias === alias) as Record<string, unknown> | undefined;
    if (!f) return [];
    const execs = f.authenticationExecutions as Array<Record<string, unknown>>;
    const out: Array<Record<string, unknown>> = [];
    for (const e of execs) {
      if (e.authenticator === "organization") out.push(e);
      if (e.flowAlias) out.push(...reachable(e.flowAlias as string, seen));
    }
    return out;
  }
  assert.equal(reachable("browser-single-page").length, 0);

  // every flowAlias names a defined flow
  for (const f of flows) {
    const ff = f as Record<string, unknown>;
    const execs = ff.authenticationExecutions as Array<Record<string, unknown>>;
    for (const e of execs) {
      if (e.flowAlias !== undefined) assert.ok(defined.has(e.flowAlias as string));
    }
  }
});
