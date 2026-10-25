// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.
import type { LogLevel } from "../core/index.ts";
import type { Secret, SecretReader } from "./secret.ts";

export type Role = "all" | "api" | "worker" | "sandbox";

export type Env = Readonly<Record<string, string | undefined>>;

export interface DatabaseEndpoint {
  readonly url: string;
  readonly password: Secret | null;
}

export interface AppConfig {
  readonly role: Role;
  readonly host: string;
  readonly port: number;
  readonly logLevel: LogLevel;
  readonly publicBaseUrl: string;
  readonly webDist: string | null;
  readonly shutdownDrainMs: number;
  readonly engineKey: Secret | null;
  readonly database: { readonly app: DatabaseEndpoint | null; readonly owner: DatabaseEndpoint | null };
}

export function loadConfig(_env: Env, _readSecret?: SecretReader): AppConfig {
  throw new Error("not implemented");
}
