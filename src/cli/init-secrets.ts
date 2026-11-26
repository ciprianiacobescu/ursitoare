// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { CliCommand } from "./registry.ts";

export type SecretFormat = "hex64" | "raw32";

export interface SecretFileSpec {
  name: string;
  format: SecretFormat;
  readers: readonly string[];
}

export const SECRET_FILES: readonly SecretFileSpec[] = [];

export const ENV_KEYS: readonly string[] = [];

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

export function planSecrets(
  _dir: string,
  _random: (n: number) => Uint8Array,
  _opts?: { firstUser?: string },
): SecretPlan {
  throw new Error("not implemented");
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
