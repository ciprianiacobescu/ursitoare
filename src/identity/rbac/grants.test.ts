import assert from "node:assert/strict";
import { test } from "node:test";

import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { createServiceAccount, upsertUserFromClaims } from "../index.ts";
import type { User } from "../index.ts";
import { grantRole, revokeRole } from "./grants.ts";
import { loadMemberships, type MembershipSet } from "./memberships.ts";

const ISS = "https://idp.example/realms/ursitoare";
const ADMIN = { kind: "user", userId: "u-admin", roles: ["tenant_admin"] } as const;
const AUTHOR_ONLY = { kind: "user", userId: "u-author", roles: ["author"] } as const;
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

async function membershipCount(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[],
): Promise<number> {
  return withTenantTx(db.appPool, ctx, async (tx) => {
    const result = await tx.query<{ n: number | null }>(sql, params);
    return result.rows[0]?.n ?? -1;
  });
}

async function membershipsOf(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<MembershipSet> {
  let memberships: MembershipSet | undefined;
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      memberships = await loadMemberships(tx, ctx, userId);
    });
  });
  assert.ok(memberships !== undefined, "loadMemberships resolves");
  return memberships;
}

async function signInUser(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject }),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function createService(
  db: TestDatabase,
  ctx: TenantContext,
  ownerUserId: string,
): Promise<User> {
  let created: User | undefined;
  await assert.doesNotReject(async () => {
    created = await withTenantTx(db.appPool, ctx, (tx) =>
      createServiceAccount(tx, ctx, { displayName: "robot", ownerUserId }),
    );
  });
  assert.ok(created !== undefined, "createServiceAccount resolves");
  return created;
}

test("C-959908eb Grant and revoke on a service account", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u-owner', 'human', NULL, 'u-owner', 'active')`,
      [a.tenantId],
    );
    const svc = await createService(db, a, "u-owner");

    let grantedTwice: ("granted" | "exists" | undefined)[] = [];
    for (let i = 0; i < 2; i += 1) {
      let result: "granted" | "exists" | undefined;
      await withTenantTx(db.appPool, a, async (tx) => {
        await assert.doesNotReject(async () => {
          result = await grantRole(tx, a, { userId: svc.userId, roleId: "author" }, ADMIN);
        });
      });
      assert.ok(result !== undefined, "grantRole resolves");
      grantedTwice = [...grantedTwice, result];
    }
    assert.deepEqual(grantedTwice, ["granted", "exists"]);

    assert.deepEqual(await membershipsOf(db, a, svc.userId), {
      roles: ["author"],
      teams: [],
    });

    let revokedTwice: (boolean | undefined)[] = [];
    for (let i = 0; i < 2; i += 1) {
      let revoked: boolean | undefined;
      await withTenantTx(db.appPool, a, async (tx) => {
        await assert.doesNotReject(async () => {
          revoked = await revokeRole(tx, a, { userId: svc.userId, roleId: "author" }, ADMIN);
        });
      });
      assert.ok(revoked !== undefined, "revokeRole resolves a boolean");
      revokedTwice = [...revokedTwice, revoked];
    }
    assert.deepEqual(revokedTwice, [true, false]);

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.role_granted" || row.event_type === "identity.role_revoked",
    );
    assert.deepEqual(events.map((row) => row.event_type), [
      "identity.role_granted",
      "identity.role_revoked",
    ]);
    assert.deepEqual(events[0]?.actor, { kind: "user", id: "u-admin" });
    assert.deepEqual(events[0]?.target, { kind: "user", id: svc.userId });
    assert.deepEqual(events[0]?.payload, { roleId: "author", via: "admin" });

    assert.deepEqual(await membershipsOf(db, a, svc.userId), { roles: [], teams: [] });
  } finally {
    await db.close();
  }
});

test("C-4cd3fa8b Humans and elevation", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const alice = await signInUser(db, a, "alice-sub");
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u-owner', 'human', NULL, 'u-owner', 'active')`,
      [a.tenantId],
    );
    const svc = await createService(db, a, "u-owner");

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        grantRole(tx, a, { userId: alice.userId, roleId: "author" }, ADMIN),
        { code: "RBAC_DIRECT_GRANT_REFUSED" },
      );
    });

    let granted: "granted" | "exists" | undefined;
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        granted = await grantRole(tx, a, { userId: alice.userId, roleId: "author" }, OPERATOR);
      });
    });
    assert.equal(granted, "granted");

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        grantRole(tx, a, { userId: svc.userId, roleId: "approver" }, AUTHOR_ONLY),
        { code: "RBAC_ELEVATION" },
      );
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        granted = await grantRole(tx, a, { userId: svc.userId, roleId: "author" }, AUTHOR_ONLY);
      });
    });
    assert.equal(granted, "granted");

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        grantRole(
          tx,
          a,
          { userId: svc.userId, roleId: "author" },
          { kind: "service", userId: svc.userId, roles: ["tenant_admin"] } as const,
        ),
        { code: "RBAC_ELEVATION" },
      );
    });

    const grantedEvents = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.role_granted",
    );
    const operatorEvent = grantedEvents.find((row) => {
      const actor = row.actor as { kind: string; id: string };
      return actor.kind === "system" && actor.id === "operator:cli";
    });
    assert.ok(operatorEvent !== undefined, "the operator grant is audited");
    assert.deepEqual(operatorEvent.actor, { kind: "system", id: "operator:cli" });
    assert.deepEqual(operatorEvent.payload, { roleId: "author", via: "operator" });
    assert.deepEqual(operatorEvent.target, { kind: "user", id: alice.userId });
  } finally {
    await db.close();
  }
});

test("C-f3ce9a1e Missing, invalid, concurrent, disabled", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u-owner', 'human', NULL, 'u-owner', 'active')`,
      [a.tenantId],
    );
    const svc = await createService(db, a, "u-owner");

    for (const target of ["user", "role"] as const) {
      const value = target === "user" ? { userId: "ghost", roleId: "author" } : { userId: svc.userId, roleId: "ghost" };
      await withTenantTx(db.appPool, a, async (tx) => {
        await assert.rejects(grantRole(tx, a, value, ADMIN), { code: "RBAC_NOT_FOUND" });
      });
      await withTenantTx(db.appPool, a, async (tx) => {
        await assert.rejects(revokeRole(tx, a, value, OPERATOR), { code: "RBAC_NOT_FOUND" });
      });
    }
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        grantRole(tx, a, { userId: svc.userId, roleId: "Bad Role" }, ADMIN),
        { code: "RBAC_INVALID" },
      );
      await assert.rejects(
        revokeRole(tx, a, { userId: svc.userId, roleId: "Bad Role" }, OPERATOR),
        { code: "RBAC_INVALID" },
      );
    });

    const settled = await Promise.allSettled([
      withTenantTx(db.appPool, a, (tx) =>
        grantRole(tx, a, { userId: svc.userId, roleId: "author" }, ADMIN),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        grantRole(tx, a, { userId: svc.userId, roleId: "author" }, ADMIN),
      ),
    ]);
    assert.deepEqual(
      settled.map((outcome) => outcome.status),
      ["fulfilled", "fulfilled"],
    );
    const values = settled
      .map((outcome) =>
        outcome.status === "fulfilled"
          ? outcome.value
          : `rejected: ${String((outcome as { reason?: unknown }).reason)}`,
      )
      .sort();
    assert.deepEqual(values, ["exists", "granted"]);

    assert.equal(
      await membershipCount(
        db,
        a,
        `SELECT count(*)::int AS n FROM ursitoare.membership
         WHERE user_id = $1 AND role_id = 'author' AND source = 'local'`,
        [svc.userId],
      ),
      1,
    );
    assert.equal(
      (await auditIn(db, a)).filter((row) => row.event_type === "identity.role_granted").length,
      1,
    );

    await ownerExec(
      db,
      a,
      `UPDATE ursitoare."user" SET state = 'disabled' WHERE user_id = $1`,
      [svc.userId],
    );
    assert.deepEqual(await membershipsOf(db, a, svc.userId), { roles: [], teams: [] });
    await ownerExec(
      db,
      a,
      `UPDATE ursitoare."user" SET state = 'active' WHERE user_id = $1`,
      [svc.userId],
    );
    assert.deepEqual(await membershipsOf(db, a, svc.userId), {
      roles: ["author"],
      teams: [],
    });

    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, owner_user_id, display_name, state)
       VALUES ($1, 'u2', 'human', NULL, 'u2', 'active')`,
      [a.tenantId],
    );
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer)
       VALUES ($1, 'm-idp-only', 'u2', 'author', 'idp_claim', $2)`,
      [a.tenantId, ISS],
    );
    let revoked: boolean | undefined;
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        revoked = await revokeRole(tx, a, { userId: "u2", roleId: "author" }, OPERATOR);
      });
    });
    assert.equal(revoked, false);
    assert.equal(
      await membershipCount(
        db,
        a,
        `SELECT count(*)::int AS n FROM ursitoare.membership
         WHERE user_id = 'u2' AND role_id = 'author' AND source = 'idp_claim'`,
        [],
      ),
      1,
    );
  } finally {
    await db.close();
  }
});
