import { registerAdminCommands } from "./admin/index.ts";
import { registerFlowCommands } from "./flow/index.ts";
import { initSecretsCommand } from "./init-secrets.ts";
import { createCommandRegistry } from "./registry.ts";
import { dbPrepareCommand } from "./setup/db-prepare.ts";
import { dbRolesCommand } from "./setup/db-roles.ts";
import { tenantCreateCommand } from "./setup/tenant-create.ts";
import { tenantIdpCommand } from "./setup/tenant-idp.ts";
import { tenantSinkCommand } from "./setup/tenant-sink.ts";
import type { CommandRegistry } from "./registry.ts";

export function createDefaultRegistry(): CommandRegistry {
  const registry = createCommandRegistry();
  registerAdminCommands(registry);
  registerFlowCommands(registry);
  registry.registerCommand("init-secrets", initSecretsCommand);
  registry.registerCommand("db-roles", dbRolesCommand);
  registry.registerCommand("db-prepare", dbPrepareCommand);
  registry.registerCommand("tenant-create", tenantCreateCommand);
  registry.registerCommand("tenant-idp", tenantIdpCommand);
  registry.registerCommand("tenant-sink", tenantSinkCommand);
  return registry;
}
