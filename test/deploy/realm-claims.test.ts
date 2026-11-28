import assert from "node:assert/strict";
import { test } from "node:test";

import { readRealmTemplate, realmClaimProblems, renderRealm } from "./realm.ts";

const ENV: Record<string, string> = {
  KC_URSITOARE_CLIENT_SECRET: "test-client-secret-0001",
  KC_URSITOARE_REDIRECT_URI: "http://127.0.0.1:8080/auth/oidc/callback",
  KC_URSITOARE_POST_LOGOUT_URI: "http://127.0.0.1:8080/sign-in",
  KC_URSITOARE_FIRST_USER: "owner",
  KC_URSITOARE_FIRST_PASSWORD: "test-first-password-0001",
  KC_URSITOARE_ORGANIZATION: "home",
};

type Obj = Record<string, unknown>;

type Mapper = Obj & {
  protocolMapper: string;
  config: Record<string, string>;
};

type Client = Obj & {
  clientId: string;
  publicClient: boolean;
  secret: string;
  standardFlowEnabled: boolean;
  implicitFlowEnabled: boolean;
  directAccessGrantsEnabled: boolean;
  serviceAccountsEnabled: boolean;
  redirectUris: string[];
  attributes: Record<string, string>;
  defaultClientScopes: string[];
  optionalClientScopes: string[];
  protocolMappers: Mapper[];
};

type Flow = Obj & {
  alias: string;
  authenticationExecutions: Obj[];
};

type User = Obj & {
  username: string;
  credentials: Obj[];
  groups: string[];
};

type Organization = Obj & {
  name: string;
  alias: string;
  members: Obj[];
};

type Realm = Obj & {
  clients: Client[];
  groups: Obj[];
  users: User[];
  organizations: Organization[];
  authenticationFlows: Flow[];
};

function rendered(env: Record<string, string> = ENV): Realm {
  return renderRealm(readRealmTemplate(), env) as Realm;
}

function clientOf(realm: Realm, id: string): Client {
  const found = realm.clients.find((client) => client.clientId === id);
  assert.ok(found, `client ${id} is missing`);
  return found;
}

function flowOf(realm: Realm, alias: string): Flow {
  const found = realm.authenticationFlows.find((flow) => flow.alias === alias);
  assert.ok(found, `flow ${alias} is missing`);
  return found;
}

function onlyUser(realm: Realm): User {
  const user = realm.users[0];
  assert.ok(user, "the realm has no user");
  return user;
}

function onlyOrganization(realm: Realm): Organization {
  const organization = realm.organizations[0];
  assert.ok(organization, "the realm has no organization");
  return organization;
}

function credentialOf(user: User): Obj {
  const credential = user.credentials[0];
  assert.ok(credential, "the user has no credential");
  return credential;
}

function groupsMapperOf(client: Client): Mapper {
  const mapper = client.protocolMappers.find(
    (candidate) => candidate.protocolMapper === "oidc-group-membership-mapper",
  );
  assert.ok(mapper, "the engine client has no group membership mapper");
  return mapper;
}

function problemsOf(value: unknown): string[] {
  let problems: string[] | undefined;
  assert.doesNotThrow(() => {
    problems = realmClaimProblems(value);
  });
  assert.notEqual(problems, undefined, "realmClaimProblems did not return a value");
  return problems as string[];
}

type Mutation = {
  name: string;
  edit: (realm: Realm) => void;
  expected: string[];
};

const MUTATIONS: Mutation[] = [
  {
    name: "sslRequired is none",
    edit: (realm) => {
      realm.sslRequired = "none";
    },
    expected: ["realm: sslRequired is not external"],
  },
  {
    name: "registrationAllowed is true",
    edit: (realm) => {
      realm.registrationAllowed = true;
    },
    expected: ["realm: registrationAllowed is not false"],
  },
  {
    name: "organizationsEnabled is false",
    edit: (realm) => {
      realm.organizationsEnabled = false;
    },
    expected: ["realm: organizationsEnabled is not true"],
  },
  {
    name: "a clientScopes key is added",
    edit: (realm) => {
      realm.clientScopes = [];
    },
    expected: ["realm: a clientScopes key is present"],
  },
  {
    name: "browserFlow is browser",
    edit: (realm) => {
      realm.browserFlow = "browser";
    },
    expected: ["realm: browserFlow is not browser-single-page"],
  },
  {
    name: "the bound flow is removed",
    edit: (realm) => {
      realm.authenticationFlows = realm.authenticationFlows.filter(
        (flow) => flow.alias !== "browser-single-page",
      );
    },
    expected: ["realm: flow browser-single-page is not a defined top-level flow"],
  },
  {
    name: "an organization execution is added to the forms flow",
    edit: (realm) => {
      flowOf(realm, "browser-single-page forms").authenticationExecutions.push({
        authenticator: "organization",
        authenticatorFlow: false,
        requirement: "REQUIRED",
        priority: 99,
      });
    },
    expected: ["realm: flow browser-single-page has an organization step"],
  },
  {
    name: "an organization execution is added to the otp flow",
    edit: (realm) => {
      flowOf(realm, "browser-single-page otp").authenticationExecutions.push({
        authenticator: "organization",
        authenticatorFlow: false,
        requirement: "REQUIRED",
        priority: 99,
      });
    },
    expected: ["realm: flow browser-single-page has an organization step"],
  },
  {
    name: "the team-default group is removed",
    edit: (realm) => {
      realm.groups = realm.groups.filter((group) => group.name !== "team-default");
    },
    expected: ["realm: group team-default is missing"],
  },
  {
    name: "the engine client is public",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").publicClient = true;
    },
    expected: ["client ursitoare-engine: not confidential"],
  },
  {
    name: "the engine secret is empty",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").secret = "";
    },
    expected: ["client ursitoare-engine: no secret"],
  },
  {
    name: "the engine standard flow is off",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").standardFlowEnabled = false;
    },
    expected: ["client ursitoare-engine: standard flow is off"],
  },
  {
    name: "the engine direct access grant is on",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").directAccessGrantsEnabled = true;
    },
    expected: ["client ursitoare-engine: implicit, direct access or service accounts is on"],
  },
  {
    name: "the engine PKCE method is plain",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").attributes["pkce.code.challenge.method"] = "plain";
    },
    expected: ["client ursitoare-engine: PKCE method is not S256"],
  },
  {
    name: "the engine redirect is a wildcard",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").redirectUris = ["http://127.0.0.1:8080/*"];
    },
    expected: [
      "client ursitoare-engine: redirectUris is not one exact URI",
      "client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI",
    ],
  },
  {
    name: "the engine post-logout list holds only the sign-in URI",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").attributes["post.logout.redirect.uris"] =
        "http://127.0.0.1:8080/sign-in";
    },
    expected: [
      "client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI",
    ],
  },
  {
    name: "the engine default scopes lack email",
    edit: (realm) => {
      const client = clientOf(realm, "ursitoare-engine");
      client.defaultClientScopes = client.defaultClientScopes.filter((scope) => scope !== "email");
    },
    expected: ["client ursitoare-engine: default scopes lack profile or email"],
  },
  {
    name: "the engine optional scopes lack organization",
    edit: (realm) => {
      const client = clientOf(realm, "ursitoare-engine");
      client.optionalClientScopes = client.optionalClientScopes.filter(
        (scope) => scope !== "organization",
      );
    },
    expected: ["client ursitoare-engine: optional scope organization is missing"],
  },
  {
    name: "the groups mapper writes full paths",
    edit: (realm) => {
      groupsMapperOf(clientOf(realm, "ursitoare-engine")).config["full.path"] = "true";
    },
    expected: ["client ursitoare-engine: groups mapper full.path is not false"],
  },
  {
    name: "the groups mapper does not write the ID token",
    edit: (realm) => {
      groupsMapperOf(clientOf(realm, "ursitoare-engine")).config["id.token.claim"] = "false";
    },
    expected: ["client ursitoare-engine: groups mapper does not write the ID token"],
  },
  {
    name: "the groups mapper claim name is grp",
    edit: (realm) => {
      groupsMapperOf(clientOf(realm, "ursitoare-engine")).config["claim.name"] = "grp";
    },
    expected: ["client ursitoare-engine: groups mapper claim.name is not groups"],
  },
  {
    name: "the engine client has no mappers",
    edit: (realm) => {
      clientOf(realm, "ursitoare-engine").protocolMappers = [];
    },
    expected: ["client ursitoare-engine: no group membership mapper"],
  },
  {
    name: "the mcp client is confidential",
    edit: (realm) => {
      clientOf(realm, "ursitoare-mcp").publicClient = false;
    },
    expected: ["client ursitoare-mcp: not public"],
  },
  {
    name: "the mcp redirects are one pattern",
    edit: (realm) => {
      clientOf(realm, "ursitoare-mcp").redirectUris = ["http://127.0.0.1/*"];
    },
    expected: ["client ursitoare-mcp: redirectUris are not the two loopback patterns"],
  },
  {
    name: "the mcp client has no mappers",
    edit: (realm) => {
      clientOf(realm, "ursitoare-mcp").protocolMappers = [];
    },
    expected: ["client ursitoare-mcp: no audience mapper for ursitoare-mcp"],
  },
  {
    name: "the user is missing from team-default",
    edit: (realm) => {
      const user = onlyUser(realm);
      user.groups = user.groups.filter((group) => group !== "/team-default");
    },
    expected: ["user owner: missing from group /team-default"],
  },
  {
    name: "the user password is not temporary",
    edit: (realm) => {
      credentialOf(onlyUser(realm)).temporary = false;
    },
    expected: ["user owner: password is not one temporary password"],
  },
  {
    name: "the user has an email",
    edit: (realm) => {
      onlyUser(realm).email = "a@example.invalid";
    },
    expected: ["user owner: has a preset name or email"],
  },
  {
    name: "the organization has no members",
    edit: (realm) => {
      onlyOrganization(realm).members = [];
    },
    expected: ["organization home: first user is not a member"],
  },
  {
    name: "the realm has no organizations",
    edit: (realm) => {
      realm.organizations = [];
    },
    expected: ["realm: organizations is not exactly one enabled organization"],
  },
];

test("C-cdf2b51e each broken rule gives its own problem", () => {
  assert.equal(typeof realmClaimProblems, "function");

  assert.deepEqual(problemsOf(rendered()), []);

  const noOrganization = { ...ENV };
  delete noOrganization.KC_URSITOARE_ORGANIZATION;
  assert.deepEqual(problemsOf(rendered(noOrganization)), []);

  for (const mutation of MUTATIONS) {
    const realm = structuredClone(rendered());
    mutation.edit(realm);
    assert.deepEqual(problemsOf(realm), mutation.expected, mutation.name);
  }
});

test("C-87ac6333 a non-object, an empty object and a leftover placeholder", () => {
  assert.equal(typeof realmClaimProblems, "function");

  for (const value of [null, [], "x", 42]) {
    assert.deepEqual(problemsOf(value), ["realm: not an object"]);
  }

  const emptyRow = [
    "realm: name is not ursitoare",
    "realm: not enabled",
    "realm: sslRequired is not external",
    "realm: registrationAllowed is not false",
    "realm: organizationsEnabled is not true",
    "realm: browserFlow is not browser-single-page",
    "realm: flow browser-single-page is not a defined top-level flow",
    "realm: group ursitoare-admins is missing",
    "realm: group ursitoare-authors is missing",
    "realm: group team-default is missing",
    "client ursitoare-engine: missing",
    "client ursitoare-mcp: missing",
    "realm: users is not exactly one user with a name",
  ];
  assert.deepEqual(problemsOf({}), emptyRow);

  const brokenRecord = {
    realm: "ursitoare",
    clients: "x",
    users: 5,
    groups: null,
    authenticationFlows: [1, null],
    organizations: {},
  };
  assert.deepEqual(problemsOf(brokenRecord), emptyRow.slice(1));

  const placeholderRow = [
    "client ursitoare-engine: redirectUris is not one exact URI",
    "client ursitoare-engine: post.logout.redirect.uris is not one exact URI followed by the redirect URI",
    "realm: unresolved placeholder at clients[0].secret",
    "realm: unresolved placeholder at clients[0].redirectUris[0]",
    "realm: unresolved placeholder at clients[0].attributes.post.logout.redirect.uris",
    "realm: unresolved placeholder at users[0].username",
    "realm: unresolved placeholder at users[0].credentials[0].value",
    "realm: unresolved placeholder at organizations[0].members[0].username",
  ];
  assert.deepEqual(problemsOf(rendered({})), placeholderRow);

  const noSecret = { ...ENV };
  delete noSecret.KC_URSITOARE_CLIENT_SECRET;
  assert.deepEqual(problemsOf(rendered(noSecret)), [
    "realm: unresolved placeholder at clients[0].secret",
  ]);
});
