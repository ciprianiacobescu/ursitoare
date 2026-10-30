// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export type { CliErrorCode } from "./errors.ts";
export { CliError } from "./errors.ts";
export type { CliOutput } from "./output.ts";
export { CLI_PROGRAM, safeText, safeJson } from "./output.ts";
export type {
  CliOption,
  OwnerAccess,
  CliCall,
  CliCommand,
  CommandRegistry,
} from "./registry.ts";
export { createCommandRegistry } from "./registry.ts";
export type { OwnerConnection, CliDeps } from "./run.ts";
export { runCli } from "./run.ts";
export { resolveCliTenant } from "./tenant.ts";
export { createDefaultRegistry } from "./builtin.ts";
export { cliMain } from "./main.ts";
