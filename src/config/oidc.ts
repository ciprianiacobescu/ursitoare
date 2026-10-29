import type { Env } from "./config.ts";
import { ConfigError } from "./errors.ts";
import type { Secret, SecretReader } from "./secret.ts";
import { readSecretValue } from "./secret.ts";

export interface OidcConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: Secret;
}

export interface OidcConfigBase {
  readonly engineKey: Secret | null;
  readonly database: { readonly app: object | null };
}

const ISSUER_VARIABLE = "URSITOARE_OIDC_ISSUER";
const CLIENT_ID_VARIABLE = "URSITOARE_OIDC_CLIENT_ID";
const SECRET_FILE_VARIABLE = "URSITOARE_OIDC_CLIENT_SECRET_FILE";
const DEFAULT_CLIENT_ID = "ursitoare-engine";
const CLIENT_ID_PATTERN = /^[A-Za-z0-9._-]{1,128}$/;
const ISSUER_REASON =
  "must be an https URL, or an http URL for a private host, without credentials, query or fragment";
const CLIENT_ID_REASON = "must be 1 to 128 characters of letters, digits, dot, underscore or hyphen";
const SECRET_REQUIRED_REASON = "required when URSITOARE_OIDC_ISSUER is set";
const STRAY_REASON = "set only together with URSITOARE_OIDC_ISSUER";
const ENGINE_KEY_REQUIRED_REASON = "requires URSITOARE_ENGINE_KEY_FILE";
const DATABASE_REQUIRED_REASON = "requires URSITOARE_DATABASE_URL";

function error(variable: string, reason: string): ConfigError {
  return new ConfigError("CONFIG_INVALID", variable, reason);
}

function stripBrackets(hostname: string): string {
  return hostname.startsWith("[") && hostname.endsWith("]") ? hostname.slice(1, -1) : hostname;
}

function isPrivateAddress(hostname: string): boolean {
  const host = stripBrackets(hostname).toLowerCase();
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host === "::1") return true;
  if (host.includes(":")) {
    const first = host.split(":")[0] ?? "";
    if (first === "") return false;
    const value = Number.parseInt(first, 16);
    return Number.isFinite(value) && (value & 0xfe00) === 0xfc00;
  }
  const octets = host.split(".");
  if (octets.length === 4 && octets.every((octet) => /^\d{1,3}$/.test(octet))) {
    const first = Number(octets[0]);
    const second = Number(octets[1]);
    if (first === 127 || first === 10) return true;
    if (first === 172 && second >= 16 && second <= 31) return true;
    if (first === 192 && second === 168) return true;
    return false;
  }
  return !host.includes(".");
}

function isIssuer(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
  if (parsed.username !== "" || parsed.password !== "") return false;
  if (parsed.search !== "" || parsed.hash !== "") return false;
  if (parsed.protocol === "https:") return true;
  return isPrivateAddress(parsed.hostname);
}

function isUnset(value: string | undefined): boolean {
  return value === undefined || value.length === 0;
}

export function loadOidcConfig(
  env: Env,
  readSecret: SecretReader,
  base: OidcConfigBase,
): OidcConfig | undefined {
  const issuer = env[ISSUER_VARIABLE];
  const clientId = env[CLIENT_ID_VARIABLE];
  const secretFile = env[SECRET_FILE_VARIABLE];

  if (isUnset(issuer)) {
    if (!isUnset(clientId)) throw error(CLIENT_ID_VARIABLE, STRAY_REASON);
    if (!isUnset(secretFile)) throw error(SECRET_FILE_VARIABLE, STRAY_REASON);
    return undefined;
  }

  if (!isIssuer(issuer as string)) throw error(ISSUER_VARIABLE, ISSUER_REASON);

  if (isUnset(secretFile)) throw error(SECRET_FILE_VARIABLE, SECRET_REQUIRED_REASON);

  const chosenClientId = isUnset(clientId) ? DEFAULT_CLIENT_ID : (clientId as string);
  if (!CLIENT_ID_PATTERN.test(chosenClientId)) throw error(CLIENT_ID_VARIABLE, CLIENT_ID_REASON);

  const clientSecret = readSecretValue(SECRET_FILE_VARIABLE, secretFile as string, readSecret);

  if (base.engineKey === null) throw error(ISSUER_VARIABLE, ENGINE_KEY_REQUIRED_REASON);
  if (base.database.app === null) throw error(ISSUER_VARIABLE, DATABASE_REQUIRED_REASON);

  return { issuer: issuer as string, clientId: chosenClientId, clientSecret };
}
