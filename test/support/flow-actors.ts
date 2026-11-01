import {
  createTeam,
  grantRole,
  provisionTenantIdp,
  setGroupMapping,
  syncMemberships,
  upsertUserFromClaims,
} from "../../src/identity/index.ts";
import type { TenantContext } from "../../src/tenancy/index.ts";
import { withTenantTx } from "../../src/tenancy/index.ts";
import type { Clock } from "../../src/core/index.ts";
import type { TestDatabase } from "./pg.ts";

export interface FlowActorSpec {
  subject: string;
  roles: readonly string[];
  teams: readonly string[];
}

const ISSUER = "https://idp.test";
const OPERATOR = { kind: "operator", name: "seed" } as const;

export async function seedFlowActors(
  db: TestDatabase,
  ctx: TenantContext,
  actors: readonly FlowActorSpec[],
  clock: Clock,
): Promise<{ [subject: string]: string }> {
  await provisionTenantIdp(
    db.ownerPool,
    ctx,
    { issuer: ISSUER, organization: "org-" + ctx.tenantId },
    { clock },
  );

  const userIds: { [subject: string]: string } = {};
  await withTenantTx(db.appPool, ctx, async (tx) => {
    for (const spec of actors) {
      const user = await upsertUserFromClaims(
        tx,
        ctx,
        { issuer: ISSUER, subject: spec.subject, name: spec.subject },
        { clock },
      );
      userIds[spec.subject] = user.userId;

      for (const team of spec.teams) {
        const found = await tx.query(
          "SELECT 1 FROM ursitoare.team WHERE tenant_id = $1 AND team_id = $2",
          [ctx.tenantId, team],
        );
        if ((found.rowCount ?? 0) === 0) {
          await createTeam(tx, ctx, { teamId: team }, OPERATOR, { clock });
        }
        await setGroupMapping(
          tx,
          ctx,
          { issuer: ISSUER, group: "g-" + team, teamId: team },
          OPERATOR,
          { clock },
        );
      }

      await syncMemberships(
        tx,
        ctx,
        user.userId,
        { issuer: ISSUER, groups: spec.teams.map((team) => "g-" + team) },
        { clock },
      );

      for (const role of spec.roles) {
        await grantRole(tx, ctx, { userId: user.userId, roleId: role }, OPERATOR, { clock });
      }
    }
  });

  return userIds;
}
