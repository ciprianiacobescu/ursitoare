import type pg from "pg";

import { TENANT_ID_PATTERN } from "../tenancy/index.ts";
import type { ReviewProfile, TenantContext } from "../tenancy/index.ts";
import { CliError } from "./errors.ts";

interface TenantRow {
  tenant_id: string;
  review_profile: ReviewProfile;
}

export async function resolveCliTenant(
  db: Pick<pg.Pool, "query">,
  requested?: string,
): Promise<TenantContext> {
  if (requested !== undefined && !TENANT_ID_PATTERN.test(requested)) {
    throw new CliError("CLI_USAGE", "--tenant is not a valid tenant id");
  }

  const result =
    requested === undefined
      ? await db.query<TenantRow>(
          "SELECT tenant_id, review_profile FROM ursitoare.tenant ORDER BY tenant_id",
        )
      : await db.query<TenantRow>(
          "SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE tenant_id = $1 ORDER BY tenant_id",
          [requested],
        );

  if (requested !== undefined) {
    const row = result.rows[0];
    if (row === undefined) {
      throw new CliError("CLI_TENANT_UNKNOWN", "no tenant has that id");
    }
    return { tenantId: row.tenant_id, reviewProfile: row.review_profile };
  }

  if (result.rows.length === 0) {
    throw new CliError("CLI_NO_TENANT", "no tenant exists");
  }
  if (result.rows.length > 1) {
    throw new CliError("CLI_TENANT_REQUIRED", "several tenants exist; pass --tenant <id>");
  }
  const row = result.rows[0] as TenantRow;
  return { tenantId: row.tenant_id, reviewProfile: row.review_profile };
}
