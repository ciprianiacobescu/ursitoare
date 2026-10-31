import type { CommandRegistry } from "../registry.ts";
import { bootstrapAdminCommand } from "./bootstrap-admin.ts";
import { grantRoleCommand } from "./grant-role.ts";
import { listUsersCommand } from "./list-users.ts";
import { revokeRoleCommand } from "./revoke-role.ts";
import { verifyAuditCommand } from "./verify-audit.ts";

export function registerAdminCommands(registry: CommandRegistry): void {
  registry.registerCommand("admin bootstrap-admin", bootstrapAdminCommand);
  registry.registerCommand("admin grant-role", grantRoleCommand);
  registry.registerCommand("admin list-users", listUsersCommand);
  registry.registerCommand("admin revoke-role", revokeRoleCommand);
  registry.registerCommand("admin verify-audit", verifyAuditCommand);
}
