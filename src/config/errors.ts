// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this module implements it.

export type ConfigErrorCode = "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY";

export class ConfigError extends Error {
  readonly code: ConfigErrorCode;
  readonly variable: string;
  constructor(_code: ConfigErrorCode, _variable: string, _reason: string) {
    super();
    throw new Error("not implemented");
  }
}
