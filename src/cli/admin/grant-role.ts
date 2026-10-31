import { grantRole } from "../../identity/index.ts";
import { CliError } from "../errors.ts";
import { defineAdminCommand } from "./define.ts";
import type { AdminCall, AdminResult, AdminSpec } from "./define.ts";

function requiredString(call: AdminCall, name: string): string {
  const value = call.args[name];
  if (typeof value !== "string") {
    throw new CliError("CLI_USAGE", `missing required option --${name}`);
  }
  return value;
}

const spec: AdminSpec = {
  summary: "grant a role to a user as a direct grant",
  options: {
    user: { type: "string", summary: "user to grant the role to", required: true },
    role: { type: "string", summary: "role to grant", required: true },
  },
  async run(call: AdminCall): Promise<AdminResult> {
    const userId = requiredString(call, "user");
    const roleId = requiredString(call, "role");
    const result = await grantRole(
      call.tx,
      call.tenant,
      { userId, roleId },
      { kind: "operator", name: call.operator },
      { clock: call.clock, ids: call.ids },
    );
    if (result === "exists") {
      return {
        lines: [`already held: ${roleId} for ${userId}`],
        data: { result, userId, roleId },
        audit: { result, userId, roleId },
      };
    }
    return {
      lines: [`granted ${roleId} to ${userId}`],
      data: { result, userId, roleId },
      audit: { result, userId, roleId },
    };
  },
};

export const grantRoleCommand = defineAdminCommand("admin grant-role", spec);
