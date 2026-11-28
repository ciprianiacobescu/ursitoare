import assert from "node:assert/strict";
import { test } from "node:test";

import {
  bootstrapAdminGroup,
  groupsFromIdToken,
  organizationFromClaim,
} from "../../src/identity/index.ts";
import { decodeJwt, startFakeOidc } from "../support/fake-oidc/index.ts";
import { CLIENTS } from "../support/fake-oidc/seed.ts";
import {
  REALM_CLIENTS,
  REALM_GROUPS,
  readRealmTemplate,
  realmClaimProblems,
  renderRealm,
} from "./realm.ts";

const NOW = new Date("2026-11-25T12:00:00Z");

const ENV: Record<string, string> = {
  KC_URSITOARE_CLIENT_SECRET: "test-client-secret-0001",
  KC_URSITOARE_REDIRECT_URI: "http://127.0.0.1:8080/auth/oidc/callback",
  KC_URSITOARE_POST_LOGOUT_URI: "http://127.0.0.1:8080/sign-in",
  KC_URSITOARE_FIRST_USER: "owner",
  KC_URSITOARE_FIRST_PASSWORD: "test-first-password-0001",
  KC_URSITOARE_ORGANIZATION: "home",
};

type Mapper = {
  protocolMapper?: string;
  config: Record<string, string>;
};

type Client = {
  clientId: string;
  publicClient: boolean;
  defaultClientScopes: string[];
  optionalClientScopes: string[];
  protocolMappers: Mapper[];
};

type Realm = {
  clients: Client[];
  users: Array<{ groups: string[] }>;
  organizations: Array<{ alias: string }>;
};

function assertClaimShape(payload: Record<string, unknown>): void {
  const groups = payload["groups"];
  assert.ok(Array.isArray(groups), "groups is not an array");
  assert.ok(groups.length >= 1, "groups is empty");
  for (const group of groups) {
    assert.equal(typeof group, "string", "a group is not a string");
    assert.ok((group as string).length > 0, "a group is empty");
    assert.equal((group as string).startsWith("/"), false, "a group starts with /");
  }
  const organization = payload["organization"];
  assert.ok(Array.isArray(organization), "organization is not an array");
  assert.equal(organization.length, 1, "organization is not one entry");
  assert.equal(typeof organization[0], "string", "organization is not a string");
  assert.ok((organization[0] as string).length > 0, "organization is empty");
}

function tokenWithPayload(payload: Record<string, unknown>): string {
  const encode = (value: unknown): string =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
  return `${encode({ alg: "none", typ: "JWT" })}.${encode(payload)}.`;
}

function problemsOf(realm: unknown): string[] {
  let problems: string[] | undefined;
  assert.doesNotThrow(() => {
    problems = realmClaimProblems(realm);
  });
  assert.notEqual(problems, undefined, "realmClaimProblems did not return a value");
  return problems as string[];
}

test("C-a612c0ca the realm's claims have the fake's shapes and the engine reads them", async (t) => {
  assert.equal(typeof realmClaimProblems, "function");

  const fake = await startFakeOidc({ port: 0, now: () => NOW });
  t.after(async () => {
    await fake.close();
  });

  const carolToken = fake.mintToken({ user: "carol" });
  const carolPayload = decodeJwt(carolToken).payload;
  assert.deepEqual(carolPayload["groups"], ["ursitoare-admins"]);
  assert.deepEqual(carolPayload["organization"], ["org-a"]);
  assert.equal(typeof carolPayload["name"], "string");
  assert.equal(typeof carolPayload["email"], "string");
  assert.equal(typeof carolPayload["preferred_username"], "string");

  const profileOnlyToken = fake.mintToken({ user: "carol", scope: "openid profile email" });
  const profileOnlyPayload = decodeJwt(profileOnlyToken).payload;
  assert.equal(Object.prototype.hasOwnProperty.call(profileOnlyPayload, "organization"), false);

  const realm = renderRealm(readRealmTemplate(), ENV) as Realm;
  const engine = realm.clients.find((client) => client.clientId === "ursitoare-engine");
  assert.ok(engine, "the realm has no engine client");
  assert.ok(engine.optionalClientScopes.includes("organization"));
  assert.equal(engine.defaultClientScopes.includes("organization"), false);
  assert.ok(engine.defaultClientScopes.includes("profile"));
  assert.ok(engine.defaultClientScopes.includes("email"));
  const groupsMapper = engine.protocolMappers.find(
    (mapper) => mapper.protocolMapper === "oidc-group-membership-mapper",
  );
  assert.ok(groupsMapper, "the engine client has no group membership mapper");
  assert.equal(groupsMapper.config["claim.name"], "groups");

  const user = realm.users[0];
  assert.ok(user, "the realm has no user");
  const organization = realm.organizations[0];
  assert.ok(organization, "the realm has no organization");
  const derived = {
    groups: user.groups.map((group) => (group.startsWith("/") ? group.slice(1) : group)),
    organization: [organization.alias],
  };
  assert.deepEqual(derived, {
    groups: ["ursitoare-admins", "ursitoare-authors", "team-default"],
    organization: ["home"],
  });

  assertClaimShape(carolPayload);
  assertClaimShape(decodeJwt(fake.mintToken({ user: "alice" })).payload);
  assertClaimShape(derived);

  assert.deepEqual(groupsFromIdToken(carolToken), ["ursitoare-admins"]);
  assert.deepEqual(groupsFromIdToken(tokenWithPayload(derived)), [
    "ursitoare-admins",
    "ursitoare-authors",
    "team-default",
  ]);
  assert.equal(organizationFromClaim(["home"]), "home");
  assert.equal(bootstrapAdminGroup({}), REALM_GROUPS[0]);

  assert.deepEqual(
    [...REALM_CLIENTS],
    CLIENTS.map((client) => client.clientId),
  );
  for (const seedClient of CLIENTS) {
    const realmClient = realm.clients.find((client) => client.clientId === seedClient.clientId);
    assert.ok(realmClient, `the realm has no client ${seedClient.clientId}`);
    assert.equal(realmClient.publicClient, !seedClient.confidential);
  }

  assert.deepEqual(problemsOf(realm), []);
});
