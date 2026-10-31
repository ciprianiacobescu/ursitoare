import { revokeRole } from "../../identity/index.ts";
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
  summary: "revoke a directly granted role from a user",
  options: {
    user: { type: "string", summary: "user to revoke the role from", required: true },
    role: { type: "string", summary: "role to revoke", required: true },
  },
  async run(call: AdminCall): Promise<AdminResult> {
    const userId = requiredString(call, "user");
    const roleId = requiredString(call, "role");
    const removed = await revokeRole(
      call.tx,
      call.tenant,
      { userId, roleId },
      { kind: "operator", name: call.operator },
      { clock: call.clock, ids: call.ids },
    );
    const result = removed ? "revoked" : "absent";
    if (removed) {
      return {
        lines: [`revoked ${roleId} from ${userId}`],
        data: { result, userId, roleId },
        audit: { result, userId, roleId },
      };
    }
    return {
      lines: [`not held: ${roleId} for ${userId}`],
      data: { result, userId, roleId },
      audit: { result, userId, roleId },
    };
  },
};

export const revokeRoleCommand = defineAdminCommand("admin revoke-role", spec);
