// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { randomBytes } from "node:crypto";
import { lstat, mkdir, open, rm } from "node:fs/promises";

import { CliError } from "./errors.ts";
import type { CliCall, CliCommand } from "./registry.ts";

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
  async exists(path: string): Promise<boolean> {
    try {
      await lstat(path);
      return true;
    } catch (error) {
      if ((error as { code?: unknown }).code === "ENOENT") return false;
      throw error;
    }
  },
  async mkdir(path: string, mode: number): Promise<void> {
    await mkdir(path, { recursive: true, mode });
  },
  async writeNew(path: string, bytes: Uint8Array, mode: number): Promise<void> {
    const handle = await open(path, "wx", mode);
    try {
      await handle.writeFile(bytes);
    } finally {
      await handle.close();
    }
  },
  async remove(path: string): Promise<void> {
    await rm(path, { force: true });
  },
};

function failureCode(error: unknown): string | null {
  const code = (error as { code?: unknown } | null | undefined)?.code;
  return typeof code === "string" && /^[A-Z0-9_]+$/.test(code) ? code : null;
}

function failureText(what: string, path: string, error: unknown): string {
  const code = failureCode(error);
  return code === null ? `${what} ${path}` : `${what} ${path} (${code})`;
}

export async function writeSecrets(
  plan: SecretPlan,
  fs: InitSecretsFs,
): Promise<{ written: string[] }> {
  const existing: string[] = [];
  for (const file of plan.files) {
    try {
      if (await fs.exists(file.path)) existing.push(file.path);
    } catch (error) {
      throw new CliError("CLI_SECRETS_FAILED", failureText("could not check", file.path, error));
    }
  }
  if (existing.length > 0) {
    throw new CliError("CLI_SECRETS_EXIST", `refusing to overwrite ${existing.join(", ")}`);
  }

  for (const dir of plan.dirs) {
    try {
      await fs.mkdir(dir, 0o700);
    } catch (error) {
      throw new CliError("CLI_SECRETS_FAILED", failureText("could not create", dir, error));
    }
  }

  const written: string[] = [];
  for (const file of plan.files) {
    try {
      await fs.writeNew(file.path, file.bytes, 0o600);
      written.push(file.path);
    } catch (error) {
      const clash = failureCode(error) === "EEXIST";
      const toRemove = clash ? [...written].reverse() : [file.path, ...[...written].reverse()];
      const notRemoved: string[] = [];
      for (const path of toRemove) {
        try {
          await fs.remove(path);
        } catch {
          notRemoved.push(path);
        }
      }
      const suffix = notRemoved.length > 0 ? `; could not remove ${notRemoved.join(", ")}` : "";
      if (clash) {
        throw new CliError("CLI_SECRETS_EXIST", `refusing to overwrite ${file.path}${suffix}`);
      }
      throw new CliError(
        "CLI_SECRETS_FAILED",
        `${failureText("could not write", file.path, error)}${suffix}`,
      );
    }
  }
  return { written };
}

export interface InitSecretsDeps {
  random?: (n: number) => Uint8Array;
  fs?: InitSecretsFs;
}

export function createInitSecretsCommand(deps?: InitSecretsDeps): CliCommand {
  const random = deps?.random ?? ((n: number): Uint8Array => randomBytes(n));
  const fs = deps?.fs ?? nodeInitSecretsFs;
  return {
    summary: "write the first-run secrets and the .env file",
    options: {
      dir: {
        type: "string",
        summary: "directory that receives .env and secrets/",
        required: true,
      },
      "first-user": { type: "string", summary: "name of the first user, default owner" },
    },
    database: false,
    async run(call: CliCall): Promise<number> {
      const dir = call.args.dir;
      if (typeof dir !== "string" || dir === "") {
        throw new CliError("CLI_USAGE", "--dir must name a directory");
      }
      const firstUser = call.args["first-user"];
      const plan = planSecrets(
        dir,
        random,
        typeof firstUser === "string" ? { firstUser } : undefined,
      );
      const { written } = await writeSecrets(plan, fs);
      const prefix = `${dir}/`;
      for (const path of written) {
        call.stdout.write(`wrote ${path.startsWith(prefix) ? path.slice(prefix.length) : path}\n`);
      }
      call.stdout.write(
        `first user ${plan.firstUser}; the one-time password is in secrets/first_user_password\n`,
      );
      return 0;
    },
  };
}

export const initSecretsCommand: CliCommand = createInitSecretsCommand();
