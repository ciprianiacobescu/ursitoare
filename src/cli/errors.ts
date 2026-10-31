// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type CliErrorCode =
  | "CLI_USAGE"
  | "CLI_UNKNOWN_COMMAND"
  | "CLI_INVALID_COMMAND"
  | "CLI_CONFIG_INVALID"
  | "CLI_OWNER_REQUIRED"
  | "CLI_OWNER_ROLE_INVALID"
  | "CLI_DATABASE_UNAVAILABLE"
  | "CLI_NO_TENANT"
  | "CLI_TENANT_REQUIRED"
  | "CLI_TENANT_UNKNOWN"
  | "CLI_NO_IDP"
  | "CLI_ISSUER_REQUIRED"
  | "CLI_ENGINE_KEY_REQUIRED"
  | "CLI_AUDIT_FAILED"
  | "CLI_INTERNAL";

export class CliError extends Error {
  readonly code: CliErrorCode;

  constructor(code: CliErrorCode, message: string) {
    super(message);
    this.name = "CliError";
    this.code = code;
  }
}
