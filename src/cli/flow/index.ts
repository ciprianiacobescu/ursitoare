import type { CommandRegistry } from "../registry.ts";
import { flowTestCommand } from "./test.ts";
import { flowValidateCommand } from "./validate.ts";

export { flowTestCommand } from "./test.ts";
export { flowValidateCommand } from "./validate.ts";

export function registerFlowCommands(registry: CommandRegistry): void {
  registry.registerCommand("flow test", flowTestCommand);
  registry.registerCommand("flow validate", flowValidateCommand);
}
