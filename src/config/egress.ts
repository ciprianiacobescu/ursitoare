import type { Env } from "./config.ts";
import { ConfigError } from "./errors.ts";
import type { Secret, SecretReader } from "./secret.ts";
import { readSecretValue } from "./secret.ts";

export interface EgressConfig {
  readonly brokerUrl: string;
  readonly proxyUrl: string;
  readonly brokerToken: Secret;
  readonly agentId: string;
  readonly vault: {
    readonly url: string;
    readonly identity: string;
    readonly token: Secret;
  } | null;
}

const BROKER_URL_VARIABLE = "URSITOARE_EGRESS_BROKER_URL";
const PROXY_URL_VARIABLE = "URSITOARE_EGRESS_PROXY_URL";
const BROKER_TOKEN_FILE_VARIABLE = "URSITOARE_EGRESS_BROKER_TOKEN_FILE";
const AGENT_ID_VARIABLE = "URSITOARE_EGRESS_AGENT_ID";
const VAULT_URL_VARIABLE = "URSITOARE_EGRESS_VAULT_URL";
const VAULT_IDENTITY_VARIABLE = "URSITOARE_EGRESS_VAULT_IDENTITY";
const VAULT_TOKEN_FILE_VARIABLE = "URSITOARE_EGRESS_VAULT_TOKEN_FILE";

const EGRESS_VARIABLES = [
  BROKER_URL_VARIABLE,
  PROXY_URL_VARIABLE,
  BROKER_TOKEN_FILE_VARIABLE,
  AGENT_ID_VARIABLE,
  VAULT_URL_VARIABLE,
  VAULT_IDENTITY_VARIABLE,
  VAULT_TOKEN_FILE_VARIABLE,
] as const;

const DEFAULT_AGENT_ID = "ursitoare-engine";
const AGENT_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;
const TOKEN_PATTERN = /^[\x21-\x7e]{1,4096}$/;

const REQUIRED_REASON = "required when another URSITOARE_EGRESS_ variable is set";
const URL_REASON = "must be an http or https URL without credentials, query or fragment";
const AGENT_ID_REASON = "must be 1 to 128 characters of letters, digits, dot, underscore, colon or hyphen";
const VAULT_TOGETHER_REASON = "set together with the other URSITOARE_EGRESS_VAULT_ variables or not at all";
const ORIGIN_REASON = "must be an http or https origin without path, credentials, query or fragment";
const TOKEN_CHARS_REASON = "must be 1 to 4096 visible ASCII characters";

function error(variable: string, reason: string): ConfigError {
  return new ConfigError("CONFIG_INVALID", variable, reason);
}

function isSet(env: Env, name: string): boolean {
  const value = env[name];
  return value !== undefined && value.length > 0;
}

function requireSet(env: Env, name: string): string {
  if (!isSet(env, name)) throw error(name, REQUIRED_REASON);
  return env[name] as string;
}

function parseUrl(variable: string, value: string, allowPath: boolean): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw error(variable, allowPath ? URL_REASON : ORIGIN_REASON);
  }
  const reason = allowPath ? URL_REASON : ORIGIN_REASON;
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw error(variable, reason);
  if (parsed.host === "" || parsed.username !== "" || parsed.password !== "") throw error(variable, reason);
  if (parsed.search !== "" || parsed.hash !== "") throw error(variable, reason);
  if (!allowPath && parsed.pathname !== "/" && parsed.pathname !== "") throw error(variable, reason);
  return parsed.toString().replace(/\/+$/, "");
}

function readAgentId(env: Env): string {
  if (!isSet(env, AGENT_ID_VARIABLE)) return DEFAULT_AGENT_ID;
  const value = env[AGENT_ID_VARIABLE] as string;
  if (!AGENT_ID_PATTERN.test(value)) throw error(AGENT_ID_VARIABLE, AGENT_ID_REASON);
  return value;
}

function readToken(variable: string, path: string, readSecret: SecretReader): Secret {
  const secret = readSecretValue(variable, path, readSecret);
  if (!TOKEN_PATTERN.test(secret.reveal())) throw error(variable, TOKEN_CHARS_REASON);
  return secret;
}

type VaultParts = {
  readonly url: string;
  readonly identity: string;
  readonly tokenFile: string;
} | null;

function readVaultParts(env: Env): VaultParts {
  const url = isSet(env, VAULT_URL_VARIABLE);
  const identity = isSet(env, VAULT_IDENTITY_VARIABLE);
  const tokenFile = isSet(env, VAULT_TOKEN_FILE_VARIABLE);
  if (!url && !identity && !tokenFile) return null;
  if (!url) throw error(VAULT_URL_VARIABLE, VAULT_TOGETHER_REASON);
  if (!identity) throw error(VAULT_IDENTITY_VARIABLE, VAULT_TOGETHER_REASON);
  if (!tokenFile) throw error(VAULT_TOKEN_FILE_VARIABLE, VAULT_TOGETHER_REASON);

  const rawUrl = env[VAULT_URL_VARIABLE] as string;
  const rawIdentity = env[VAULT_IDENTITY_VARIABLE] as string;
  if (!AGENT_ID_PATTERN.test(rawIdentity)) throw error(VAULT_IDENTITY_VARIABLE, AGENT_ID_REASON);

  return {
    url: parseUrl(VAULT_URL_VARIABLE, rawUrl, false),
    identity: rawIdentity,
    tokenFile: env[VAULT_TOKEN_FILE_VARIABLE] as string,
  };
}

export function loadEgressConfig(env: Env, readSecret: SecretReader): EgressConfig | undefined {
  if (!EGRESS_VARIABLES.some((name) => isSet(env, name))) return undefined;

  const brokerUrl = parseUrl(BROKER_URL_VARIABLE, requireSet(env, BROKER_URL_VARIABLE), true);
  const proxyUrl = parseUrl(PROXY_URL_VARIABLE, requireSet(env, PROXY_URL_VARIABLE), true);
  const agentId = readAgentId(env);
  const vaultParts = readVaultParts(env);

  const brokerPath = requireSet(env, BROKER_TOKEN_FILE_VARIABLE);
  const brokerToken = readToken(BROKER_TOKEN_FILE_VARIABLE, brokerPath, readSecret);

  const vault =
    vaultParts === null
      ? null
      : {
          url: vaultParts.url,
          identity: vaultParts.identity,
          token: readToken(VAULT_TOKEN_FILE_VARIABLE, vaultParts.tokenFile, readSecret),
        };

  return { brokerUrl, proxyUrl, brokerToken, agentId, vault };
}
