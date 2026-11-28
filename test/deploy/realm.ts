import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..", "..");

export const REALM_TEMPLATE_PATH: string = "deploy/keycloak/import/ursitoare-realm.json";

export const KC_REALM_ENV: readonly string[] = [
  "KC_URSITOARE_CLIENT_SECRET",
  "KC_URSITOARE_REDIRECT_URI",
  "KC_URSITOARE_POST_LOGOUT_URI",
  "KC_URSITOARE_FIRST_USER",
  "KC_URSITOARE_FIRST_PASSWORD",
  "KC_URSITOARE_ORGANIZATION",
];

export const REALM_GROUPS: readonly string[] = ["ursitoare-admins", "ursitoare-authors", "team-default"];

export const REALM_CLIENTS: readonly string[] = ["ursitoare-engine", "ursitoare-mcp"];

export const REALM_BROWSER_FLOW: string = "browser-single-page";

export function readRealmTemplate(path?: string): string {
  const p = path ?? join(REPO_ROOT, REALM_TEMPLATE_PATH);
  return readFileSync(p, "utf8");
}

export function realmPlaceholders(template: string): string[] {
  const names = new Set<string>();
  const re = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::[^}]*)?\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(template)) !== null) {
    const name = m[1];
    if (name !== undefined) {
      names.add(name);
    }
  }
  return [...names].sort();
}

export function renderRealm(template: string, env: Readonly<Record<string, string>>): unknown {
  const re = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::([^}]*))?\}/g;
  const out = template.replace(re, (match, name: string, def: string | undefined) => {
    if (Object.prototype.hasOwnProperty.call(env, name)) {
      return env[name] as string;
    }
    if (def !== undefined) {
      return def;
    }
    return match;
  });
  return JSON.parse(out);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isExactUri(value: unknown): boolean {
  if (typeof value !== "string") {
    return false;
  }
  if (value.includes("*") || value.includes("+") || value.includes("#") || value.includes("${")) {
    return false;
  }
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function flowProblems(realm: Record<string, unknown>): string[] {
  const flows = Array.isArray(realm.authenticationFlows) ? realm.authenticationFlows : [];
  const byAlias = new Map<string, Record<string, unknown>>();
  for (const flow of flows) {
    if (isRecord(flow) && typeof flow.alias === "string") {
      byAlias.set(flow.alias, flow);
    }
  }
  const bound = byAlias.get(REALM_BROWSER_FLOW);
  if (!isRecord(bound) || bound.topLevel !== true) {
    return [`realm: flow ${REALM_BROWSER_FLOW} is not a defined top-level flow`];
  }
  const seen = new Set<string>();
  const pending = [REALM_BROWSER_FLOW];
  let hasOrganization = false;
  while (pending.length > 0) {
    const alias = pending.pop() as string;
    if (seen.has(alias)) {
      continue;
    }
    seen.add(alias);
    const flow = byAlias.get(alias);
    if (!isRecord(flow)) {
      continue;
    }
    const executions = Array.isArray(flow.authenticationExecutions)
      ? flow.authenticationExecutions
      : [];
    for (const execution of executions) {
      if (!isRecord(execution)) {
        continue;
      }
      if (execution.authenticator === "organization") {
        hasOrganization = true;
      }
      if (typeof execution.flowAlias === "string") {
        pending.push(execution.flowAlias);
      }
    }
  }
  return hasOrganization ? [`realm: flow ${REALM_BROWSER_FLOW} has an organization step`] : [];
}

function engineProblems(realm: Record<string, unknown>): string[] {
  const prefix = "client ursitoare-engine";
  const clients = Array.isArray(realm.clients) ? realm.clients : [];
  const client = clients.find((candidate) => isRecord(candidate) && candidate.clientId === "ursitoare-engine");
  if (!isRecord(client)) {
    return [`${prefix}: missing`];
  }
  const problems: string[] = [];
  const attributes = isRecord(client.attributes) ? client.attributes : {};
  if (client.publicClient !== false) {
    problems.push(`${prefix}: not confidential`);
  }
  if (typeof client.secret !== "string" || client.secret.length === 0) {
    problems.push(`${prefix}: no secret`);
  }
  if (client.standardFlowEnabled !== true) {
    problems.push(`${prefix}: standard flow is off`);
  }
  if (
    client.implicitFlowEnabled !== false ||
    client.directAccessGrantsEnabled !== false ||
    client.serviceAccountsEnabled !== false
  ) {
    problems.push(`${prefix}: implicit, direct access or service accounts is on`);
  }
  if (attributes["pkce.code.challenge.method"] !== "S256") {
    problems.push(`${prefix}: PKCE method is not S256`);
  }
  const redirectUris = Array.isArray(client.redirectUris) ? client.redirectUris : [];
  if (redirectUris.length !== 1 || !isExactUri(redirectUris[0])) {
    problems.push(`${prefix}: redirectUris is not one exact URI`);
  }
  const postLogout = attributes["post.logout.redirect.uris"];
  const postLogoutParts = typeof postLogout === "string" ? postLogout.split("##") : [];
  if (
    postLogoutParts.length !== 2 ||
    !isExactUri(postLogoutParts[0]) ||
    !isExactUri(postLogoutParts[1]) ||
    postLogoutParts[1] !== redirectUris[0]
  ) {
    problems.push(
      `${prefix}: post.logout.redirect.uris is not one exact URI followed by the redirect URI`,
    );
  }
  const defaultScopes = Array.isArray(client.defaultClientScopes) ? client.defaultClientScopes : [];
  if (!defaultScopes.includes("profile") || !defaultScopes.includes("email")) {
    problems.push(`${prefix}: default scopes lack profile or email`);
  }
  const optionalScopes = Array.isArray(client.optionalClientScopes) ? client.optionalClientScopes : [];
  if (!optionalScopes.includes("organization")) {
    problems.push(`${prefix}: optional scope organization is missing`);
  }
  const mappers = Array.isArray(client.protocolMappers) ? client.protocolMappers : [];
  const mapper = mappers.find(
    (candidate) => isRecord(candidate) && candidate.protocolMapper === "oidc-group-membership-mapper",
  );
  if (!isRecord(mapper)) {
    problems.push(`${prefix}: no group membership mapper`);
  } else {
    const config = isRecord(mapper.config) ? mapper.config : {};
    if (config["claim.name"] !== "groups") {
      problems.push(`${prefix}: groups mapper claim.name is not groups`);
    }
    if (config["full.path"] !== "false") {
      problems.push(`${prefix}: groups mapper full.path is not false`);
    }
    if (config["id.token.claim"] !== "true") {
      problems.push(`${prefix}: groups mapper does not write the ID token`);
    }
  }
  return problems;
}

function mcpProblems(realm: Record<string, unknown>): string[] {
  const prefix = "client ursitoare-mcp";
  const clients = Array.isArray(realm.clients) ? realm.clients : [];
  const client = clients.find((candidate) => isRecord(candidate) && candidate.clientId === "ursitoare-mcp");
  if (!isRecord(client)) {
    return [`${prefix}: missing`];
  }
  const problems: string[] = [];
  const attributes = isRecord(client.attributes) ? client.attributes : {};
  if (client.publicClient !== true) {
    problems.push(`${prefix}: not public`);
  }
  if (client.standardFlowEnabled !== true) {
    problems.push(`${prefix}: standard flow is off`);
  }
  if (attributes["pkce.code.challenge.method"] !== "S256") {
    problems.push(`${prefix}: PKCE method is not S256`);
  }
  const redirectUris = Array.isArray(client.redirectUris) ? client.redirectUris : [];
  if (
    redirectUris.length !== 2 ||
    redirectUris[0] !== "http://127.0.0.1/*" ||
    redirectUris[1] !== "http://localhost/*"
  ) {
    problems.push(`${prefix}: redirectUris are not the two loopback patterns`);
  }
  const mappers = Array.isArray(client.protocolMappers) ? client.protocolMappers : [];
  const audience = mappers.find(
    (candidate) =>
      isRecord(candidate) &&
      candidate.protocolMapper === "oidc-audience-mapper" &&
      isRecord(candidate.config) &&
      candidate.config["included.custom.audience"] === "ursitoare-mcp" &&
      candidate.config["access.token.claim"] === "true",
  );
  if (!isRecord(audience)) {
    problems.push(`${prefix}: no audience mapper for ursitoare-mcp`);
  }
  return problems;
}

function userProblems(realm: Record<string, unknown>): string[] {
  const problems: string[] = [];
  const users = Array.isArray(realm.users) ? realm.users : [];
  const user = users.length === 1 ? users[0] : undefined;
  if (!isRecord(user) || typeof user.username !== "string" || user.username.length === 0) {
    problems.push("realm: users is not exactly one user with a name");
    return problems;
  }
  const name = user.username;
  const groups = Array.isArray(user.groups) ? user.groups : [];
  for (const group of REALM_GROUPS) {
    if (!groups.includes(`/${group}`)) {
      problems.push(`user ${name}: missing from group /${group}`);
    }
  }
  const credentials = Array.isArray(user.credentials) ? user.credentials : [];
  const credential = credentials.length === 1 ? credentials[0] : undefined;
  if (
    !isRecord(credential) ||
    credential.type !== "password" ||
    credential.temporary !== true ||
    typeof credential.value !== "string" ||
    credential.value.length === 0
  ) {
    problems.push(`user ${name}: password is not one temporary password`);
  }
  if (
    Object.prototype.hasOwnProperty.call(user, "firstName") ||
    Object.prototype.hasOwnProperty.call(user, "lastName") ||
    Object.prototype.hasOwnProperty.call(user, "email")
  ) {
    problems.push(`user ${name}: has a preset name or email`);
  }

  const organizations = Array.isArray(realm.organizations) ? realm.organizations : [];
  const organization = organizations.length === 1 ? organizations[0] : undefined;
  if (
    !isRecord(organization) ||
    organization.enabled !== true ||
    typeof organization.alias !== "string" ||
    organization.alias.length === 0
  ) {
    problems.push("realm: organizations is not exactly one enabled organization");
    return problems;
  }
  const alias = organization.alias;
  if (organization.name !== organization.alias) {
    problems.push(`organization ${alias}: name and alias differ`);
  }
  const members = Array.isArray(organization.members) ? organization.members : [];
  if (!members.some((member) => isRecord(member) && member.username === name)) {
    problems.push(`organization ${alias}: first user is not a member`);
  }
  return problems;
}

function unresolvedPlaceholders(value: unknown, path: string, problems: string[]): void {
  if (typeof value === "string") {
    if (value.includes("${")) {
      problems.push(`realm: unresolved placeholder at ${path}`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      unresolvedPlaceholders(item, `${path}[${index}]`, problems);
    });
    return;
  }
  if (isRecord(value)) {
    for (const [key, child] of Object.entries(value)) {
      const childPath = path === "" ? key : `${path}.${key}`;
      unresolvedPlaceholders(child, childPath, problems);
    }
  }
}

export function realmClaimProblems(realm: unknown): string[] {
  if (!isRecord(realm)) {
    return ["realm: not an object"];
  }
  const problems: string[] = [];
  if (realm.realm !== "ursitoare") {
    problems.push("realm: name is not ursitoare");
  }
  if (realm.enabled !== true) {
    problems.push("realm: not enabled");
  }
  if (realm.sslRequired !== "external") {
    problems.push("realm: sslRequired is not external");
  }
  if (realm.registrationAllowed !== false) {
    problems.push("realm: registrationAllowed is not false");
  }
  if (realm.organizationsEnabled !== true) {
    problems.push("realm: organizationsEnabled is not true");
  }
  if (Object.prototype.hasOwnProperty.call(realm, "clientScopes")) {
    problems.push("realm: a clientScopes key is present");
  }
  if (realm.browserFlow !== REALM_BROWSER_FLOW) {
    problems.push(`realm: browserFlow is not ${REALM_BROWSER_FLOW}`);
  }
  problems.push(...flowProblems(realm));
  const groups = Array.isArray(realm.groups) ? realm.groups : [];
  for (const group of REALM_GROUPS) {
    if (!groups.some((entry) => isRecord(entry) && entry.name === group)) {
      problems.push(`realm: group ${group} is missing`);
    }
  }
  problems.push(...engineProblems(realm));
  problems.push(...mcpProblems(realm));
  problems.push(...userProblems(realm));
  unresolvedPlaceholders(realm, "", problems);
  return problems;
}
