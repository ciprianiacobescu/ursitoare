import { createPool } from "../../../src/db/index.ts";
import {
  createTeam,
  listTeams,
  mapBootstrapAdminGroup,
  setGroupMapping,
  type RbacActor,
} from "../../../src/identity/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { databaseApi } from "./database-part.ts";
import { oidcApi } from "./oidc-part.ts";
import type { E2eStackPart, PartContext, PartHandle } from "./part.ts";

const POOL_APPLICATION_NAME = "e2e-rbac";
const SEED_OPERATOR = "e2e-seed";
const BOOTSTRAP_ADMIN_GROUP = "ursitoare-admins";

export const RBAC_SEED_TEAM: string = "finance";

export const RBAC_SEED_MAPPINGS: readonly {
  group: string;
  roleId: string | null;
  teamId: string | null;
}[] = [
  { group: "ursitoare-authors", roleId: "author", teamId: null },
  { group: "ursitoare-approvers", roleId: "approver", teamId: null },
  { group: "team-finance", roleId: null, teamId: RBAC_SEED_TEAM },
];

const SEED_ACTOR: RbacActor = { kind: "operator", name: SEED_OPERATOR };

interface TenantRow {
  tenant_id: string;
  review_profile: TenantContext["reviewProfile"];
}

async function start(context: PartContext): Promise<PartHandle> {
  databaseApi(context.handles);
  oidcApi(context.handles);
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

      await withTenantTx(pool, ctx, async (tx) => {
        const routed = await tx.query(
          "SELECT 1 FROM ursitoare.tenant_idp WHERE tenant_id = $1 AND issuer = $2 LIMIT 1",
          [ctx.tenantId, fake.issuer],
        );
        if ((routed.rowCount ?? 0) === 0) {
          return;
        }

        const teams = await listTeams(tx, ctx);
        if (!teams.includes(RBAC_SEED_TEAM)) {
          await createTeam(tx, ctx, { teamId: RBAC_SEED_TEAM }, SEED_ACTOR);
        }

        for (const mapping of RBAC_SEED_MAPPINGS) {
          await setGroupMapping(
            tx,
            ctx,
            {
              issuer: fake.issuer,
              group: mapping.group,
              roleId: mapping.roleId ?? undefined,
              teamId: mapping.teamId ?? undefined,
            },
            SEED_ACTOR,
          );
        }

        await mapBootstrapAdminGroup(tx, ctx, {
          issuer: fake.issuer,
          group: BOOTSTRAP_ADMIN_GROUP,
          operator: SEED_OPERATOR,
        });
      });
    }
  } finally {
    await pool.end().catch(() => undefined);
  }
}

export const rbacPart: E2eStackPart = {
  name: "rbac",
  start,
  seed,
};
