import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { provisionTenantIdp, upsertUserFromClaims } from "../index.ts";
import type { IdentityOptions, User } from "../index.ts";
import { setGroupMapping, type GroupMapping } from "./group-map.ts";
import { loadMemberships, type MembershipSet } from "./memberships.ts";
import { groupsFromIdToken, syncMemberships, type SyncResult } from "./sync.ts";

const ISS = "https://idp.example/realms/ursitoare";
const OPERATOR = { kind: "operator", name: "seed" } as const;

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

function base64url(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function token(payload: unknown): string {
  return `${base64url({ alg: "none", typ: "JWT" })}.${base64url(payload)}.signature`;
}

function claim(idToken: string): string[] {
  let result: string[] | undefined;
  assert.doesNotThrow(() => {
    result = groupsFromIdToken(idToken);
  });
  return result as string[];
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

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  opts: IdentityOptions,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject }, opts),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function mapGroup(
  db: TestDatabase,
  ctx: TenantContext,
  input: { issuer: string; group: string; roleId?: string; teamId?: string },
): Promise<GroupMapping> {
  let mapping: GroupMapping | undefined;
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await assert.doesNotReject(async () => {
      mapping = await setGroupMapping(tx, ctx, input, OPERATOR);
    });
  });
  assert.ok(mapping !== undefined, "setGroupMapping resolves");
  return mapping;
}

async function syncGroups(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  groups: readonly string[],
  opts: IdentityOptions,
): Promise<SyncResult> {
  let result: SyncResult | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) =>
      syncMemberships(tx, ctx, userId, { issuer: ISS, groups }, opts),
    );
  });
  assert.ok(result !== undefined, "syncMemberships resolves");
  return result;
}

async function load(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<MembershipSet> {
  let result: MembershipSet | undefined;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) => loadMemberships(tx, ctx, userId));
  });
  assert.ok(result !== undefined, "loadMemberships resolves");
  return result;
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

test("C-658fd38c The claim", () => {
  const many = Array.from({ length: 1200 }, (_, index) => `g${String(index).padStart(4, "0")}`);

  assert.deepEqual(
    claim(
      token({
        groups: ["ursitoare-authors", "team-finance", "ursitoare-authors", 5, "", " x", "a\nb"],
      }),
    ),
    ["ursitoare-authors", "team-finance"],
  );
  assert.deepEqual(claim(token({ sub: "no-groups" })), []);
  assert.deepEqual(claim(token({ groups: "ursitoare-admins" })), []);
  assert.deepEqual(claim("a.b"), []);
  assert.deepEqual(claim("nope"), []);
  assert.deepEqual(claim(token({ groups: many })), many.slice(0, 1000));
});

test("C-48073cfd Add, keep, replace, remove", async () => {
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
    await mapGroup(db, a, { issuer: ISS, group: "ursitoare-authors", roleId: "author" });
    await mapGroup(db, a, { issuer: ISS, group: "team-finance", teamId: "finance" });
    await mapGroup(db, a, { issuer: ISS, group: "ursitoare-approvers", roleId: "approver" });

    let nowMs = Date.parse("2026-10-25T08:00:00Z");
    const clock = {
      now(): Date {
        return new Date(nowMs);
      },
    };
    const ids = sequentialIds();
    const u1 = await signIn(db, a, "sub-u1", { clock, ids });

    const first = await syncGroups(
      db,
      a,
      u1.userId,
      ["ursitoare-authors", "team-finance", "other"],
      { clock, ids },
    );
    assert.deepEqual(first, { added: ["role:author", "team:finance"], removed: [] });
    assert.deepEqual(await load(db, a, u1.userId), { roles: ["author"], teams: ["finance"] });

    nowMs = Date.parse("2026-10-25T09:00:00Z");
    const second = await syncGroups(
      db,
      a,
      u1.userId,
      ["ursitoare-authors", "team-finance", "other"],
      { clock, ids },
    );
    assert.deepEqual(second, { added: [], removed: [] });
    assert.deepEqual(await load(db, a, u1.userId), { roles: ["author"], teams: ["finance"] });
    const synced = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ synced_at: Date }>(
        `SELECT synced_at FROM ursitoare.membership
         WHERE tenant_id = $1 AND user_id = $2 ORDER BY membership_id`,
        [a.tenantId, u1.userId],
      );
      return result.rows.map((row) => row.synced_at.toISOString());
    });
    assert.deepEqual(synced, ["2026-10-25T09:00:00.000Z", "2026-10-25T09:00:00.000Z"]);

    nowMs = Date.parse("2026-10-25T10:00:00Z");
    const third = await syncGroups(db, a, u1.userId, ["ursitoare-approvers"], { clock, ids });
    assert.deepEqual(third, {
      added: ["role:approver"],
      removed: ["role:author", "team:finance"],
    });
    assert.deepEqual(await load(db, a, u1.userId), { roles: ["approver"], teams: [] });

    nowMs = Date.parse("2026-10-25T11:00:00Z");
    const fourth = await syncGroups(db, a, u1.userId, [], { clock, ids });
    assert.deepEqual(fourth, { added: [], removed: ["role:approver"] });
    assert.deepEqual(await load(db, a, u1.userId), { roles: [], teams: [] });

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.memberships_synced",
    );
    assert.equal(events.length, 3);
    for (const event of events) {
      assert.deepEqual(event.target, { kind: "user", id: u1.userId });
      assert.deepEqual(event.actor, { kind: "system", id: "oidc" });
    }
    assert.deepEqual(
      events.map((row) => row.payload),
      [
        { added: ["role:author", "team:finance"], removed: [] },
        { added: ["role:approver"], removed: ["role:author", "team:finance"] },
        { added: [], removed: ["role:approver"] },
      ],
    );
  } finally {
    await db.close();
  }
});

test("C-99e7d850 Other sources are untouched", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const u1 = await signIn(db, a, "sub-u1", {
      clock: fixedClock("2026-10-25T08:00:00Z"),
      ids: sequentialIds(),
    });
    await ownerExec(
      db,
      a,
      `INSERT INTO ursitoare.membership
         (tenant_id, membership_id, user_id, role_id, source, source_issuer, granted_by)
       VALUES ($1, 'm-idp2', $2, 'author', 'idp_claim', 'https://idp2.example', NULL),
              ($1, 'm-local', $2, 'auditor', 'local', '', 'u-admin')`,
      [a.tenantId, u1.userId],
    );

    const result = await syncGroups(db, a, u1.userId, [], {
      clock: fixedClock("2026-10-25T10:00:00Z"),
      ids: sequentialIds(),
    });
    assert.deepEqual(result, { added: [], removed: [] });

    const rows = await withTenantTx(db.appPool, a, async (tx) => {
      const found = await tx.query<{ membership_id: string }>(
        `SELECT membership_id FROM ursitoare.membership
         WHERE tenant_id = $1 AND user_id = $2 ORDER BY membership_id`,
        [a.tenantId, u1.userId],
      );
      return found.rows.map((row) => row.membership_id);
    });
    assert.deepEqual(rows, ["m-idp2", "m-local"], "both rows remain");

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.memberships_synced",
    );
    assert.deepEqual(events, [], "no memberships_synced event is appended");
  } finally {
    await db.close();
  }
});

test("C-50042352 Bad input and tenants", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await provisionTenantIdp(db.ownerPool, b, { issuer: ISS, organization: "org-b" });
    await ownerExec(
      db,
      a,
      "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')",
      [a.tenantId],
    );
    await mapGroup(db, a, { issuer: ISS, group: "team-finance", teamId: "finance" });
    await mapGroup(db, b, { issuer: ISS, group: "ursitoare-authors", roleId: "author" });

    const opts: IdentityOptions = {
      clock: fixedClock("2026-10-25T10:00:00Z"),
      ids: sequentialIds(),
    };
    const ua = await signIn(db, a, "sub-a", opts);
    const ub = await signIn(db, b, "sub-b", opts);

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        syncMemberships(tx, a, "ghost", { issuer: ISS, groups: [] }, opts),
        { code: "RBAC_NOT_FOUND" },
        "an unknown user",
      );
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        syncMemberships(tx, a, ua.userId, { issuer: "", groups: [] }, opts),
        { code: "RBAC_INVALID" },
        "an empty issuer",
      );
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        syncMemberships(
          tx,
          a,
          ua.userId,
          { issuer: ISS, groups: "ursitoare-authors" as unknown as string[] },
          opts,
        ),
        { code: "RBAC_INVALID" },
        "a string instead of a group list",
      );
    });
    await withTenantTx(db.appPool, b, async (tx) => {
      await assert.rejects(
        syncMemberships(tx, a, ua.userId, { issuer: ISS, groups: [] }, opts),
        { code: "RBAC_TENANT_MISMATCH" },
        "a tenant_b transaction with the tenant_a context",
      );
    });

    const synced = await syncGroups(
      db,
      b,
      ub.userId,
      ["ursitoare-authors", "team-finance"],
      opts,
    );
    assert.deepEqual(synced, { added: ["role:author"], removed: [] });
    assert.deepEqual(await load(db, b, ub.userId), { roles: ["author"], teams: [] });

    const finance = await withTenantTx(db.appPool, b, async (tx) => {
      const found = await tx.query(
        "SELECT 1 FROM ursitoare.team WHERE tenant_id = $1 AND team_id = 'finance'",
        [b.tenantId],
      );
      return found.rowCount;
    });
    assert.equal(finance, 0, "tenant_b has no team finance");
  } finally {
    await db.close();
  }
});
