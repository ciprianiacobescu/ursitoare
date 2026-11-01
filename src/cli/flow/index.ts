import type { CommandRegistry } from "../registry.ts";
import { flowValidateCommand } from "./validate.ts";

export { flowValidateCommand } from "./validate.ts";

export function registerFlowCommands(registry: CommandRegistry): void {
  registry.registerCommand("flow validate", flowValidateCommand);
}
