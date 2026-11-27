// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { CliError } from "./errors.ts";
import type { CliCommand } from "./registry.ts";

export type SecretFormat = "hex64" | "raw32";

export interface SecretFileSpec {
  name: string;
  format: SecretFormat;
  readers: readonly string[];
}

export const SECRET_FILES: readonly SecretFileSpec[] = [
  { name: "engine_key", format: "hex64", readers: ["URSITOARE_ENGINE_KEY_FILE"] },
  { name: "kek", format: "raw32", readers: ["MINTKEY_VAULT_KEK_FILE"] },
  { name: "signing_seed", format: "raw32", readers: ["MINTKEY_BROKER_SIGNING_KEY_FILE"] },
  {
    name: "mk_issue_token",
    format: "hex64",
    readers: ["URSITOARE_EGRESS_BROKER_TOKEN_FILE", "MINTKEY_MCP_SERVICE_TOKEN_FILE"],
  },
  {
    name: "mk_proxy_token",
    format: "hex64",
    readers: ["MINTKEY_PROXY_SERVICE_TOKEN_FILE", "URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE"],
  },
  {
    name: "mk_broker_token",
    format: "hex64",
    readers: ["MINTKEY_BROKER_SERVICE_TOKEN_FILE", "URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE"],
  },
  {
    name: "mk_vault_proxy_token",
    format: "hex64",
    readers: ["MINTKEY_VAULT_PROXY_TOKEN_FILE"],
  },
  {
    name: "mk_vault_writer_token",
    format: "hex64",
    readers: ["MINTKEY_VAULT_ADMIN_TOKEN_FILE", "URSITOARE_EGRESS_VAULT_TOKEN_FILE"],
  },
  {
    name: "db_superuser_password",
    format: "hex64",
    readers: ["POSTGRES_PASSWORD_FILE", "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE"],
  },
  {
    name: "db_owner_password",
    format: "hex64",
    readers: ["URSITOARE_DATABASE_OWNER_PASSWORD_FILE"],
  },
  {
    name: "db_app_password",
    format: "hex64",
    readers: ["URSITOARE_DATABASE_PASSWORD_FILE"],
  },
  { name: "db_keycloak_password", format: "hex64", readers: [] },
  {
    name: "oidc_client_secret",
    format: "hex64",
    readers: ["URSITOARE_OIDC_CLIENT_SECRET_FILE"],
  },
  { name: "keycloak_admin_password", format: "hex64", readers: [] },
  { name: "first_user_password", format: "hex64", readers: [] },
];

export const ENV_KEYS: readonly string[] = [
  "KC_DB_PASSWORD",
  "KC_BOOTSTRAP_ADMIN_USERNAME",
  "KC_BOOTSTRAP_ADMIN_PASSWORD",
  "KC_URSITOARE_CLIENT_SECRET",
  "KC_URSITOARE_FIRST_USER",
  "KC_URSITOARE_FIRST_PASSWORD",
];

const FIRST_USER_PATTERN = /^[a-z][a-z0-9._-]{0,63}$/;

const FIRST_USER_MESSAGE = "--first-user must match ^[a-z][a-z0-9._-]{0,63}$";

export interface PlannedFile {
  path: string;
  bytes: Uint8Array;
  mode: 0o600;
}

export interface SecretPlan {
  dirs: readonly string[];
  files: readonly PlannedFile[];
  firstUser: string;
}

function secretText(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("utf8").replace(/\n$/, "");
}

export function planSecrets(
  dir: string,
  random: (n: number) => Uint8Array,
  opts?: { firstUser?: string },
): SecretPlan {
  const firstUser = opts?.firstUser ?? "owner";
  if (!FIRST_USER_PATTERN.test(firstUser)) {
    throw new CliError("CLI_USAGE", FIRST_USER_MESSAGE);
  }

  const secretBytes: Uint8Array[] = [];
  const files: PlannedFile[] = [];
  for (const spec of SECRET_FILES) {
    const drawn = random(32);
    if (drawn.length !== 32) {
      throw new CliError("CLI_INTERNAL", "random source returned the wrong length");
    }
    const bytes =
      spec.format === "raw32"
        ? new Uint8Array(drawn)
        : new TextEncoder().encode(`${Buffer.from(drawn).toString("hex")}\n`);
    secretBytes.push(bytes);
    files.push({ path: `${dir}/secrets/${spec.name}`, bytes, mode: 0o600 });
  }

  const envLines = [
    `${ENV_KEYS[0]}=${secretText(secretBytes[11] as Uint8Array)}`,
    `${ENV_KEYS[1]}=admin`,
    `${ENV_KEYS[2]}=${secretText(secretBytes[13] as Uint8Array)}`,
    `${ENV_KEYS[3]}=${secretText(secretBytes[12] as Uint8Array)}`,
    `${ENV_KEYS[4]}=${firstUser}`,
    `${ENV_KEYS[5]}=${secretText(secretBytes[14] as Uint8Array)}`,
  ];
  const envBytes = new TextEncoder().encode(`${envLines.join("\n")}\n`);
  files.push({ path: `${dir}/.env`, bytes: envBytes, mode: 0o600 });

  return { dirs: [`${dir}/secrets`], files, firstUser };
}

export interface InitSecretsFs {
  exists(path: string): Promise<boolean>;
  mkdir(path: string, mode: number): Promise<void>;
  writeNew(path: string, bytes: Uint8Array, mode: number): Promise<void>;
  remove(path: string): Promise<void>;
}

export const nodeInitSecretsFs: InitSecretsFs = {
  exists: () => Promise.reject(new Error("not implemented")),
  mkdir: () => Promise.reject(new Error("not implemented")),
  writeNew: () => Promise.reject(new Error("not implemented")),
  remove: () => Promise.reject(new Error("not implemented")),
};

export async function writeSecrets(
  _plan: SecretPlan,
  _fs: InitSecretsFs,
): Promise<{ written: string[] }> {
  throw new Error("not implemented");
}

export interface InitSecretsDeps {
  random?: (n: number) => Uint8Array;
  fs?: InitSecretsFs;
}

export function createInitSecretsCommand(_deps?: InitSecretsDeps): CliCommand {
  throw new Error("not implemented");
}

export const initSecretsCommand: CliCommand = {
  summary: "",
  options: {},
  database: false,
  run: () => Promise.reject(new Error("not implemented")),
};
