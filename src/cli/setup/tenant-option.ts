import type pg from "pg";

import { findTenantByName } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { CliError } from "../errors.ts";
import type { CliCall } from "../registry.ts";
import { resolveCliTenant } from "../tenant.ts";

export async function resolveSetupTenant(
  pool: Pick<pg.Pool, "query" | "connect">,
  args: CliCall["args"],
): Promise<TenantContext> {
  const id = args.tenant;
  const name = args["tenant-name"];
  if (id !== undefined && name !== undefined) {
    throw new CliError("CLI_USAGE", "pass --tenant or --tenant-name, not both");
  }
  if (typeof name === "string") {
    const tenant = await findTenantByName(pool, name);
    if (tenant === null) {
      throw new CliError("CLI_TENANT_UNKNOWN", "no tenant has that name");
    }
    return tenant;
  }
  return resolveCliTenant(pool, typeof id === "string" ? id : undefined);
}
