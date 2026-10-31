import {
  bootstrapAdminGroup,
  mapBootstrapAdminGroup,
  RbacError,
} from "../../identity/index.ts";
import { CliError } from "../errors.ts";
import { defineAdminCommand } from "./define.ts";
import type { AdminCall, AdminResult, AdminSpec } from "./define.ts";

const MAX_GROUP_LENGTH = 255;
const MAX_ISSUER_LENGTH = 2048;

const NO_IDP = "the tenant has no identity provider; provision one first";
const ISSUER_REQUIRED = "the tenant has several identity providers; pass --issuer <url>";
const INVALID_GROUP = "is not a valid group name";
const INVALID_ISSUER = "--issuer is not a valid issuer";

function isGroupName(value: string): boolean {
  return (
    value.length >= 1 &&
    value.length <= MAX_GROUP_LENGTH &&
    value.isWellFormed() &&
    !value.includes("\u0000") &&
    !value.includes("\n") &&
    value === value.trim()
  );
}

function resolveGroup(env: Readonly<Record<string, string | undefined>>, requested: unknown): string {
  if (typeof requested === "string") {
    if (!isGroupName(requested)) {
      throw new CliError("CLI_USAGE", `--group ${INVALID_GROUP}`);
    }
    return requested;
  }
  try {
    return bootstrapAdminGroup(env);
  } catch (error) {
    if (error instanceof RbacError && error.code === "RBAC_INVALID") {
      throw new CliError("CLI_CONFIG_INVALID", `URSITOARE_BOOTSTRAP_ADMIN_GROUP: ${INVALID_GROUP}`);
    }
    throw error;
  }
}

async function resolveIssuer(call: AdminCall): Promise<string> {
  const requested = call.args.issuer;
  if (typeof requested === "string") {
    if (requested === "" || requested.length > MAX_ISSUER_LENGTH || requested.includes("\n")) {
      throw new CliError("CLI_USAGE", INVALID_ISSUER);
    }
    return requested;
  }
  const result = await call.tx.query<{ issuer: string }>(
    "SELECT DISTINCT issuer FROM ursitoare.tenant_idp WHERE tenant_id = $1 ORDER BY issuer",
    [call.tenant.tenantId],
  );
  const issuers = result.rows.map((row) => row.issuer);
  if (issuers.length === 0) {
    throw new CliError("CLI_NO_IDP", NO_IDP);
  }
  if (issuers.length > 1) {
    throw new CliError("CLI_ISSUER_REQUIRED", ISSUER_REQUIRED);
  }
  return issuers[0] as string;
}

const spec: AdminSpec = {
  summary: "map the bootstrap admin group to tenant_admin",
  details:
    "Prerequisite: the tenant's identity provider is provisioned.\nEffect: members of the group get tenant_admin at their next sign-in.",
  options: {
    group: { type: "string", summary: "group to map to tenant_admin" },
    issuer: { type: "string", summary: "identity provider issuer" },
  },
  async run(call: AdminCall): Promise<AdminResult> {
    const group = resolveGroup(call.env, call.args.group);
    const issuer = await resolveIssuer(call);
    let result: "mapped" | "already_mapped";
    try {
      result = await mapBootstrapAdminGroup(
        call.tx,
        call.tenant,
        { issuer, group, operator: call.operator },
        { clock: call.clock, ids: call.ids },
      );
    } catch (error) {
      if (error instanceof RbacError && error.code === "RBAC_INVALID") {
        throw new CliError("CLI_USAGE", `--group ${INVALID_GROUP}`);
      }
      throw error;
    }
    if (result === "mapped") {
      return {
        lines: [
          `mapped ${group} to tenant_admin`,
          `members of ${group} get tenant_admin at their next sign-in`,
        ],
        data: { result, group, issuer },
        audit: { result, group, issuer },
      };
    }
    return {
      lines: ["already mapped: tenant_admin has a group; nothing changed"],
      data: { result, group, issuer },
      audit: { result, group, issuer },
    };
  },
};

export const bootstrapAdminCommand = defineAdminCommand("admin bootstrap-admin", spec);
