import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { createTeam, deleteTeam, listRoles, listTeams } from "./teams.ts";

const OPERATOR = { kind: "operator", name: "e2e" } as const;
const ISS = "https://idp.example/realms/ursitoare";

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

async function ownerExec(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await tx.query(sql, params);
  });
}

async function teamsIn(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  let teams: string[] | undefined;
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      teams = await listTeams(tx, ctx);
    });
  });
  assert.ok(teams !== undefined, "listTeams resolves");
  return teams;
}

async function rolesIn(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  let roles: string[] | undefined;
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      roles = await listRoles(tx, ctx);
    });
  });
  assert.ok(roles !== undefined, "listRoles resolves");
  return roles;
}

async function auditIn(db: TestDatabase, ctx: TenantContext): Promise<AuditRow[]> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<AuditRow>(
      `SELECT event_type, actor, target, payload FROM ursitoare.audit_event
       WHERE tenant_id = $1 ORDER BY seq`,
      [ctx.tenantId],
    );
    return result.rows;
  });
}

test("C-f0f427e3 Create, list, delete", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    let created: { teamId: string } | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        created = await createTeam(tx, a, { teamId: "finance" }, OPERATOR);
      });
    });
    assert.deepEqual(created, { teamId: "finance" });

    assert.deepEqual(await teamsIn(db, a), ["finance"]);
    assert.deepEqual(await teamsIn(db, b), []);
    assert.deepEqual(await rolesIn(db, a), ["approver", "auditor", "author", "tenant_admin"]);

    let deleted: unknown = "not-called";
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        deleted = await deleteTeam(tx, a, "finance", OPERATOR);
      });
    });
    assert.equal(deleted, undefined);
    assert.deepEqual(await teamsIn(db, a), []);

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.team_created" || row.event_type === "identity.team_deleted",
    );
    assert.deepEqual(
      events.map((row) => row.event_type),
      ["identity.team_created", "identity.team_deleted"],
    );
    assert.deepEqual(events[0]?.target, { kind: "team", id: "finance" });
    assert.deepEqual(events[0]?.actor, { kind: "system", id: "operator:e2e" });
  } finally {
    await db.close();
  }
});

test("C-e31534ad Refusals", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const invalid: unknown[] = ["Finance", "1x", "", "fin ance", "a".repeat(65), 5];
    for (const teamId of invalid) {
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await assert.rejects(
          createTeam(tx, a, { teamId: teamId as string }, OPERATOR),
          { code: "RBAC_INVALID" },
        );
      });
    }
    assert.deepEqual(await teamsIn(db, a), [], "invalid input writes no team");

    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        await createTeam(tx, a, { teamId: "finance" }, OPERATOR);
      });
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(createTeam(tx, a, { teamId: "finance" }, OPERATOR), {
        code: "RBAC_EXISTS",
      });
    });
    assert.deepEqual(await teamsIn(db, a), ["finance"], "the duplicate writes nothing");

    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(deleteTeam(tx, a, "missing", OPERATOR), { code: "RBAC_NOT_FOUND" });
    });
    assert.deepEqual(await teamsIn(db, a), ["finance"], "a missing team writes nothing");

    await withTenantTx(db.ownerPool, b, async (tx) => {
      await assert.rejects(createTeam(tx, a, { teamId: "foreign" }, OPERATOR), {
        code: "RBAC_TENANT_MISMATCH",
      });
    });
    assert.deepEqual(await teamsIn(db, b), [], "a foreign transaction writes nothing");

    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'mapped'), ($1, 'joined')",
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.idp_group_map (tenant_id, issuer, group_name, team_id, reviewed_by)
       VALUES ($1, $2, 'mapped-group', 'mapped', 'u-admin')`,
      [a.tenantId, ISS],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u1', 'human', NULL, 'u1', 'active')`,
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, team_id, source, source_issuer)
       VALUES ($1, 'm1', 'u1', 'joined', 'idp_claim', $2)`,
      [a.tenantId, ISS],
    );

    for (const teamId of ["mapped", "joined"]) {
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await assert.rejects(deleteTeam(tx, a, teamId, OPERATOR), { code: "RBAC_IN_USE" });
      });
    }
    const teams = await teamsIn(db, a);
    assert.ok(teams.includes("mapped"), "the team used by a mapping remains");
    assert.ok(teams.includes("joined"), "the team used by a membership remains");
  } finally {
    await db.close();
  }
});
