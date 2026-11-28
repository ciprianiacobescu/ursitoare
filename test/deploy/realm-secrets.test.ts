import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { ENV_KEYS, SECRET_FILES, planSecrets } from "../../src/cli/init-secrets.ts";
import {
  KC_REALM_ENV,
  readRealmTemplate,
  realmClaimProblems,
  renderRealm,
} from "./realm.ts";

const REDIRECT_URI = "http://127.0.0.1:8080/auth/oidc/callback";
const POST_LOGOUT_URI = "http://127.0.0.1:8080/sign-in";
const ORGANIZATION = "home";

type PlannedFile = { path: string; bytes: Uint8Array };
type Plan = { files: readonly PlannedFile[] };

type Realm = {
  clients: Array<{ clientId: string; secret: string }>;
  users: Array<{
    username: string;
    credentials: Array<{ value: string }>;
  }>;
  organizations: Array<{ members: Array<{ username: string }> }>;
};

function counterRandom(): (n: number) => Uint8Array {
  let k = 0;
  return (n: number): Uint8Array =>
    createHash("sha256")
      .update(`keycloak-realm-test:${k++}`)
      .digest()
      .subarray(0, n);
}

function plannedFile(plan: Plan, name: string): PlannedFile {
  const file = plan.files.find((candidate) => candidate.path.endsWith(`/secrets/${name}`));
  assert.ok(file, `the plan has no secret file ${name}`);
  return file;
}

function fileText(plan: Plan, name: string): string {
  return Buffer.from(plannedFile(plan, name).bytes).toString("utf8").replace(/\n$/, "");
}

function envOf(plan: Plan): Record<string, string> {
  const file = plan.files.find((candidate) => candidate.path.endsWith("/.env"));
  assert.ok(file, "the plan has no .env file");
  const env: Record<string, string> = {};
  for (const line of Buffer.from(file.bytes).toString("utf8").split("\n")) {
    if (line === "") continue;
    const at = line.indexOf("=");
    assert.ok(at >= 0, `the .env line has no =: ${line}`);
    env[line.slice(0, at)] = line.slice(at + 1);
  }
  return env;
}

function realmEnvOf(plan: Plan): Record<string, string> {
  return {
    ...envOf(plan),
    KC_URSITOARE_REDIRECT_URI: REDIRECT_URI,
    KC_URSITOARE_POST_LOGOUT_URI: POST_LOGOUT_URI,
    KC_URSITOARE_ORGANIZATION: ORGANIZATION,
  };
}

function problemsOf(realm: unknown): string[] {
  let problems: string[] | undefined;
  assert.doesNotThrow(() => {
    problems = realmClaimProblems(realm);
  });
  assert.notEqual(problems, undefined, "realmClaimProblems did not return a value");
  return problems as string[];
}

function engineOf(realm: Realm): { clientId: string; secret: string } {
  const client = realm.clients.find((candidate) => candidate.clientId === "ursitoare-engine");
  assert.ok(client, "the realm has no engine client");
  return client;
}

function onlyUser(realm: Realm): Realm["users"][number] {
  const user = realm.users[0];
  assert.ok(user, "the realm has no user");
  return user;
}

function onlyOrganization(realm: Realm): Realm["organizations"][number] {
  const organization = realm.organizations[0];
  assert.ok(organization, "the realm has no organization");
  return organization;
}

test("C-1aae0873 init-secrets files fill the realm", () => {
  assert.equal(typeof realmClaimProblems, "function");

  const inRealm = ENV_KEYS.filter((key) => KC_REALM_ENV.includes(key));
  assert.deepEqual(inRealm, [
    "KC_URSITOARE_CLIENT_SECRET",
    "KC_URSITOARE_FIRST_USER",
    "KC_URSITOARE_FIRST_PASSWORD",
  ]);
  const fromCompose = KC_REALM_ENV.filter((key) => !ENV_KEYS.includes(key));
  assert.deepEqual([...fromCompose], [
    "KC_URSITOARE_REDIRECT_URI",
    "KC_URSITOARE_POST_LOGOUT_URI",
    "KC_URSITOARE_ORGANIZATION",
  ]);

  const plan = planSecrets("/deploy", counterRandom());
  const realm = renderRealm(readRealmTemplate(), realmEnvOf(plan)) as Realm;
  assert.deepEqual(problemsOf(realm), []);
  assert.equal(engineOf(realm).secret, fileText(plan, "oidc_client_secret"));
  assert.equal(onlyUser(realm).credentials[0]?.value, fileText(plan, "first_user_password"));
  assert.equal(onlyUser(realm).username, "owner");
  assert.equal(onlyOrganization(realm).members[0]?.username, "owner");

  assert.ok(SECRET_FILES.some((file) => file.name === "db_keycloak_password"));
  assert.equal(fileText(plan, "db_keycloak_password"), envOf(plan)["KC_DB_PASSWORD"]);

  const planAna = planSecrets("/deploy", counterRandom(), { firstUser: "ana.m" });
  const realmAna = renderRealm(readRealmTemplate(), realmEnvOf(planAna)) as Realm;
  assert.deepEqual(problemsOf(realmAna), []);
  assert.equal(engineOf(realmAna).secret, fileText(planAna, "oidc_client_secret"));
  assert.equal(onlyUser(realmAna).credentials[0]?.value, fileText(planAna, "first_user_password"));
  assert.equal(onlyUser(realmAna).username, "ana.m");
  assert.equal(onlyOrganization(realmAna).members[0]?.username, "ana.m");
});
