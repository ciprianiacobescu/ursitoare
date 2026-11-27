import { registerAdminCommands } from "./admin/index.ts";
import { registerFlowCommands } from "./flow/index.ts";
import { initSecretsCommand } from "./init-secrets.ts";
import { createCommandRegistry } from "./registry.ts";
import type { CommandRegistry } from "./registry.ts";

export function createDefaultRegistry(): CommandRegistry {
  const registry = createCommandRegistry();
  registerAdminCommands(registry);
  registerFlowCommands(registry);
  registry.registerCommand("init-secrets", initSecretsCommand);
  return registry;
}
