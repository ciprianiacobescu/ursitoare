import { registerAdminCommands } from "./admin/index.ts";
import { createCommandRegistry } from "./registry.ts";
import type { CommandRegistry } from "./registry.ts";

export function createDefaultRegistry(): CommandRegistry {
  const registry = createCommandRegistry();
  registerAdminCommands(registry);
  return registry;
}
