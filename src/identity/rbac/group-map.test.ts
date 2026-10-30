import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { provisionTenantIdp } from "../index.ts";
import {
  listGroupMappings,
  removeGroupMapping,
  setGroupMapping,
  type GroupMapping,
} from "./group-map.ts";

const ISS = "https://idp.example/realms/ursitoare";
const ADMIN = { kind: "user", userId: "u-admin", roles: ["tenant_admin"] } as const;
const AUTHOR = { kind: "user", userId: "u-author", roles: ["author"] } as const;
const OPERATOR = { kind: "operator", name: "cli" } as const;

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

async function provisionBoth(db: TestDatabase, a: TenantContext, b: TenantContext): Promise<void> {
  await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
  await provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-b" });
}

async function mappingsIn(db: TestDatabase, ctx: TenantContext): Promise<GroupMapping[]> {
  let mappings: GroupMapping[] | undefined;
  await withTenantTx(db.ownerPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      mappings = await listGroupMappings(tx, ctx);
    });
  });
  assert.ok(mappings !== undefined, "listGroupMappings resolves");
  return mappings;
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

test("C-3ba7ccd7 Map, replace, list", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionBoth(db, a, b);
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')",
      [a.tenantId],
    );

    let first: GroupMapping | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        first = await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-authors", roleId: "author" },
          ADMIN,
        );
      });
    });
    assert.deepEqual(first, {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: "author",
      teamId: null,
      reviewedBy: "u-admin",
    });

    let repeated: GroupMapping | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        repeated = await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-authors", roleId: "author" },
          ADMIN,
        );
      });
    });
    assert.deepEqual(repeated, first, "the repeated call answers the stored mapping");
    assert.equal(
      (await auditIn(db, a)).filter((row) => row.event_type === "identity.group_mapped").length,
      1,
      "the repeated call appends no event",
    );

    let replaced: GroupMapping | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        replaced = await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-authors", teamId: "finance" },
          ADMIN,
        );
      });
    });
    assert.deepEqual(replaced, {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: null,
      teamId: "finance",
      reviewedBy: "u-admin",
    });

    assert.deepEqual(await mappingsIn(db, a), [replaced]);
    assert.deepEqual(await mappingsIn(db, b), []);

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.group_mapped",
    );
    assert.equal(events.length, 2);
    assert.deepEqual(events[0]?.payload, {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: "author",
      teamId: null,
      revoked: 0,
    });
    assert.deepEqual(events[1]?.payload, {
      issuer: ISS,
      group: "ursitoare-authors",
      roleId: null,
      teamId: "finance",
      revoked: 0,
    });
  } finally {
    await db.close();
  }
});

test("C-64a88d7a Refusals and no elevation", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionBoth(db, a, b);
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')",
      [a.tenantId],
    );

    const invalid: { issuer?: string; group: string; roleId?: string; teamId?: string }[] = [
      { group: "both", roleId: "author", teamId: "finance" },
      { group: "neither" },
      { group: "" },
      { group: "g".repeat(256) },
      { group: "a\nb" },
    ];
    for (const input of invalid) {
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await assert.rejects(
          setGroupMapping(tx, a, { issuer: ISS, ...input }, ADMIN),
          { code: "RBAC_INVALID" },
          input.group,
        );
      });
    }

    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(tx, a, { issuer: ISS, group: "ghost-role", roleId: "ghost" }, ADMIN),
        { code: "RBAC_NOT_FOUND" },
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(tx, a, { issuer: ISS, group: "ghost-team", teamId: "ghost" }, ADMIN),
        { code: "RBAC_NOT_FOUND" },
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(
          tx,
          a,
          { issuer: "https://other.example", group: "foreign", roleId: "author" },
          ADMIN,
        ),
        { code: "RBAC_UNKNOWN_ISSUER" },
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "elevate-admin", roleId: "tenant_admin" },
          AUTHOR,
        ),
        { code: "RBAC_ELEVATION" },
      );
    });

    let ownRole: GroupMapping | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        ownRole = await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "author-group", roleId: "author" },
          AUTHOR,
        );
      });
    });
    assert.equal(ownRole?.roleId, "author");

    let operatorRole: GroupMapping | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        operatorRole = await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "operator-admin", roleId: "tenant_admin" },
          OPERATOR,
        );
      });
    });
    assert.equal(operatorRole?.roleId, "tenant_admin");
    assert.equal(operatorRole?.reviewedBy, "operator:cli");

    assert.deepEqual(
      (await mappingsIn(db, a)).map((row) => row.group).sort(),
      ["author-group", "operator-admin"],
      "the refusals wrote nothing",
    );
  } finally {
    await db.close();
  }
});

test("C-d442505b No demoting of the admin mapping", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')",
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u-admin', 'human', NULL, 'u-admin', 'active')`,
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.idp_group_map
         (tenant_id, issuer, group_name, role_id, reviewed_by)
       VALUES ($1, $2, 'ursitoare-admins', 'tenant_admin', 'operator:seed')`,
      [a.tenantId, ISS],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer)
       VALUES ($1, 'm-admin', 'u-admin', 'tenant_admin', 'idp_claim', $2)`,
      [a.tenantId, ISS],
    );

    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-admins", roleId: "author" },
          AUTHOR,
        ),
        { code: "RBAC_ELEVATION" },
        "replacing the admin mapping",
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        removeGroupMapping(tx, a, { issuer: ISS, group: "ursitoare-admins" }, AUTHOR),
        { code: "RBAC_ELEVATION" },
        "removing the admin mapping",
      );
    });
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.rejects(
        setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "team-finance", teamId: "finance" },
          AUTHOR,
        ),
        { code: "RBAC_ELEVATION" },
        "mapping a team without tenant_admin",
      );
    });

    const mapping = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query<{ role_id: string | null; team_id: string | null }>(
        `SELECT role_id, team_id FROM ursitoare.idp_group_map
         WHERE tenant_id = $1 AND issuer = $2 AND group_name = 'ursitoare-admins'`,
        [a.tenantId, ISS],
      );
      return result.rows[0];
    });
    assert.deepEqual(mapping, { role_id: "tenant_admin", team_id: null });

    const membership = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query<{ count: string }>(
        `SELECT count(*)::text AS count FROM ursitoare.membership
         WHERE tenant_id = $1 AND user_id = 'u-admin' AND role_id = 'tenant_admin'`,
        [a.tenantId],
      );
      return result.rows[0]?.count;
    });
    assert.equal(membership, "1", "u-admin keeps the membership");

    assert.deepEqual(await auditIn(db, a), [], "no event is appended");
  } finally {
    await db.close();
  }
});

test("C-24e66351 Removing revokes what the mapping granted", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u1', 'human', NULL, 'u1', 'active'),
              ($1, 'u2', 'human', NULL, 'u2', 'active')`,
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.idp_group_map
         (tenant_id, issuer, group_name, role_id, reviewed_by)
       VALUES ($1, $2, 'ursitoare-authors', 'author', 'operator:seed'),
              ($1, $2, 'ursitoare-writers', 'author', 'operator:seed')`,
      [a.tenantId, ISS],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer, granted_by)
       VALUES ($1, 'm-u1', 'u1', 'author', 'idp_claim', $2, NULL),
              ($1, 'm-u2', 'u2', 'author', 'local', '', 'u-admin')`,
      [a.tenantId, ISS],
    );

    let first: boolean | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        first = await removeGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-authors" },
          OPERATOR,
        );
      });
    });
    assert.equal(first, true);

    let second: boolean | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        second = await removeGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-authors" },
          OPERATOR,
        );
      });
    });
    assert.equal(second, false, "the second removal finds nothing");

    let missing: boolean | undefined;
    await withTenantTx(db.ownerPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        missing = await removeGroupMapping(tx, a, { issuer: ISS, group: "nope" }, OPERATOR);
      });
    });
    assert.equal(missing, false, "an unknown group answers false");

    const memberships = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query<{ user_id: string; role_id: string | null; source: string }>(
        `SELECT user_id, role_id, source FROM ursitoare.membership
         WHERE tenant_id = $1 ORDER BY user_id`,
        [a.tenantId],
      );
      return result.rows;
    });
    assert.deepEqual(
      memberships,
      [{ user_id: "u2", role_id: "author", source: "local" }],
      "u1 loses the idp_claim membership and u2 keeps its local one",
    );

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.group_unmapped",
    );
    assert.equal(events.length, 1);
    assert.deepEqual(events[0]?.payload, {
      issuer: ISS,
      group: "ursitoare-authors",
      revoked: 1,
    });
  } finally {
    await db.close();
  }
});
