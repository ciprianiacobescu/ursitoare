import { randomBytes } from "node:crypto";

import { Secret } from "../../../src/config/index.ts";
import { systemClock, systemIds } from "../../../src/core/index.ts";
import {
  listCredentials,
  provisionCredential,
  seedServiceId,
} from "../../../src/credentials/index.ts";
import type { CredentialDeps } from "../../../src/credentials/index.ts";
import { createPool } from "../../../src/db/index.ts";
import { createVaultWriter } from "../../../src/gateway/index.ts";
import { createLogger } from "../../../src/observability/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { getToolServer, registerToolServer } from "../../../src/tools/index.ts";

import { FAKE_TOOLS_KEY_HEADER, FAKE_TOOLS_ORIGIN } from "../fake-tools/index.ts";
import { fixtureSurface } from "../tool-surface.ts";

import { databaseApi } from "./database-part.ts";
import { egressApi } from "./egress-part.ts";
import { oidcApi } from "./oidc-part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";
import { toolsApi } from "./tools-part.ts";

const POOL_APPLICATION_NAME = "e2e-tool-servers";
const SEED_ACTOR = { kind: "system", id: "e2e-seed" } as const;
const UNTRUSTED_RESULT = {
  "erp.lookup_vendor@1": false,
  "erp.create_payment@1": false,
} as const;

interface TenantRow {
  tenant_id: string;
  review_profile: TenantContext["reviewProfile"];
}

async function start(context: PartContext): Promise<PartHandle> {
  databaseApi(context.handles);
  egressApi(context.handles);
  toolsApi(context.handles);
  return {
    env: {},
    close: async (): Promise<void> => {},
  };
}

async function seed(context: PartContext): Promise<void> {
  const fake = oidcApi(context.handles).fake;
  const egress = egressApi(context.handles).fake;
  const ownerUrl = databaseApi(context.handles).ownerUrl;
  const pool = createPool(ownerUrl, {
    max: 1,
    applicationName: POOL_APPLICATION_NAME,
  });
  const vault = createVaultWriter(
    {
      url: egress.vaultUrl,
      identity: egress.vaultAdmin.identity,
      token: new Secret(egress.vaultAdmin.token),
    },
    { logger: createLogger({ level: "silent" }) },
  );
  const deps: CredentialDeps = {
    pool,
    vault,
    ids: systemIds,
    clock: systemClock,
  };
  const surface = fixtureSurface(SEED_TOOL_SERVER.refs, {
    untrustedResult: UNTRUSTED_RESULT,
  });

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

      const existing = await getToolServer(pool, ctx, SEED_TOOL_SERVER.id);
      if (existing === null) {
        await registerToolServer(
          pool,
          ctx,
          {
            id: SEED_TOOL_SERVER.id,
            adapter: "fixture",
            origin: SEED_TOOL_SERVER.origin,
            local: false,
            surface,
          },
          SEED_ACTOR,
        );
      }

      const credentials = await listCredentials(pool, ctx);
      const provisioned = credentials.some(
        (credential) => credential.toolServerId === SEED_TOOL_SERVER.id,
      );
      if (!provisioned) {
        await provisionCredential(
          deps,
          ctx,
          {
            toolServerId: SEED_TOOL_SERVER.id,
            authScheme: "API_KEY_HEADER",
            headerName: FAKE_TOOLS_KEY_HEADER,
            value: randomBytes(16).toString("hex"),
            serviceId: seedServiceId(ctx.tenantId, SEED_TOOL_SERVER.id),
          },
          SEED_ACTOR,
        );
      }
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export const toolServersPart: E2eStackPart = {
  name: "tool-servers",
  start,
  seed,
};

export const SEED_TOOL_SERVER: Readonly<{
  id: string;
  origin: string;
  refs: readonly string[];
}> = {
  id: "acme",
  origin: FAKE_TOOLS_ORIGIN,
  refs: ["erp.lookup_vendor@1", "erp.create_payment@1"],
};
