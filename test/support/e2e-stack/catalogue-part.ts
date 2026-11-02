import { createPool } from "../../../src/db/index.ts";
import { importCatalogue } from "../../../src/registry/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { readCatalogueDocument } from "../catalogue/document.ts";
import { databaseApi } from "./database-part.ts";
import { oidcApi } from "./oidc-part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

const POOL_APPLICATION_NAME = "e2e-catalogue";
const SEED_ACTOR = { kind: "system", id: "e2e-seed" } as const;

interface TenantRow {
  tenant_id: string;
  review_profile: TenantContext["reviewProfile"];
}

async function start(context: PartContext): Promise<PartHandle> {
  databaseApi(context.handles);
  return {
    env: {},
    close: async (): Promise<void> => {},
  };
}

async function seed(context: PartContext): Promise<void> {
  const fake = oidcApi(context.handles).fake;
  const ownerUrl = databaseApi(context.handles).ownerUrl;
  const pool = createPool(ownerUrl, {
    max: 1,
    applicationName: POOL_APPLICATION_NAME,
  });
  const blocks = readCatalogueDocument().blocks;

  try {
    const tenants = await pool.query<TenantRow>(
      `SELECT tenant_id, review_profile FROM ursitoare.tenant
       ORDER BY tenant_id COLLATE "C"`,
    );

    for (const row of tenants.rows) {
      const ctx: TenantContext = {
        tenantId: row.tenant_id,
        reviewProfile: row.review_profile,
      };

      const routed = await withTenantTx(pool, ctx, async (tx) => {
        const result = await tx.query(
          "SELECT 1 FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2 LIMIT 1",
          [ctx.tenantId, fake.issuer],
        );
        return (result.rowCount ?? 0) > 0;
      });

      if (!routed) {
        continue;
      }

      await importCatalogue(pool, ctx, blocks, SEED_ACTOR);
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export const cataloguePart: E2eStackPart = {
  name: "catalogue",
  start,
  seed,
};
