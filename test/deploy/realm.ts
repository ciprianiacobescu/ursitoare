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

export function realmClaimProblems(_realm: unknown): string[] {
  throw new Error("not implemented");
}
