import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { ReviewProfile, TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { upsertUserFromClaims } from "../index.ts";
import type { User } from "../index.ts";
import { setAccountState } from "./accounts.ts";
import { setReviewProfile } from "./review-profile.ts";

assert.equal(typeof setReviewProfile, "function");

const ISS = "https://idp.example/realms/ursitoare";
const T09 = "2026-10-25T09:00:00Z";
const T10 = "2026-10-25T10:00:00Z";
const T11 = "2026-10-25T11:00:00Z";

type AdminActor = Parameters<typeof setReviewProfile>[3];

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

function adminActor(user: User): AdminActor {
  return { kind: "user", userId: user.userId, roles: ["tenant_admin"] };
}

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  at: string,
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject }, { ids, clock: fixedClock(at) }),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function setProfile(
  db: TestDatabase,
  ctx: TenantContext,
  profile: ReviewProfile,
  actor: AdminActor,
  at: string,
): Promise<unknown> {
  let result: unknown;
  await assert.doesNotReject(async () => {
    result = await withTenantTx(db.appPool, ctx, (tx) =>
      setReviewProfile(tx, ctx, profile, actor, { clock: fixedClock(at) }),
    );
  });
  return result;
}

async function disableAccount(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  actor: AdminActor,
): Promise<void> {
  await withTenantTx(db.appPool, ctx, async (tx) => {
    await setAccountState(
      tx,
      ctx,
      { userId, kind: "human", state: "disabled" },
      actor,
      { clock: fixedClock(T10) },
    );
  });
}

async function ownerProfile(db: TestDatabase, tenantId: string): Promise<string | null> {
  const { rows } = await db.ownerPool.query<{ review_profile: string | null }>(
    "SELECT review_profile FROM ursitoare.tenant WHERE tenant_id = $1",
    [tenantId],
  );
  return rows[0]?.review_profile ?? null;
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

const MULTIPLE_HUMANS_WARNING = {
  code: "SOLO_TENANT_HAS_MANY_HUMANS",
  message: "This solo tenant has 3 active human members; each may review their own flows.",
  humanMembers: 3,
};

test("C-10655032 The review profile switches, warns and stays audited", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    assert.equal(a.reviewProfile, "solo", "tenant A starts solo");
    assert.equal(b.reviewProfile, "solo", "tenant B starts solo");
    const ids = sequentialIds();
    const ann = await signIn(db, a, "sub-ann", T09, ids);
    const bob = await signIn(db, a, "sub-bob", T09, ids);
    const carol = await signIn(db, a, "sub-carol", T09, ids);
    const actor = adminActor(carol);

    const toTeam = await setProfile(db, a, "team", actor, T10);
    assert.deepEqual(toTeam, {
      tenantId: "tenant_a",
      reviewProfile: "team",
      previous: "solo",
      changed: true,
      humanMembers: 3,
      warning: null,
    }, "put team on a solo tenant changes it without a warning");

    const toSolo = await setProfile(db, a, "solo", actor, T10);
    assert.deepEqual(toSolo, {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "team",
      changed: true,
      humanMembers: 3,
      warning: MULTIPLE_HUMANS_WARNING,
    }, "put solo on a team tenant with 3 active humans warns");

    const toSoloAgain = await setProfile(db, a, "solo", actor, T10);
    assert.deepEqual(toSoloAgain, {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "solo",
      changed: false,
      humanMembers: 3,
      warning: MULTIPLE_HUMANS_WARNING,
    }, "put solo again changes nothing and still warns");

    await disableAccount(db, a, ann.userId, actor);
    await disableAccount(db, a, bob.userId, actor);

    const soloWithOne = await setProfile(db, a, "solo", actor, T11);
    assert.deepEqual(soloWithOne, {
      tenantId: "tenant_a",
      reviewProfile: "solo",
      previous: "solo",
      changed: false,
      humanMembers: 1,
      warning: null,
    }, "with one active human the solo tenant warns no more");

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.review_profile_changed",
    );
    assert.equal(events.length, 2, "only the two real changes are audited");
    assert.deepEqual(events[0]?.target, { kind: "tenant", id: "tenant_a" });
    assert.deepEqual(events[0]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(events[0]?.payload, { from: "solo", to: "team", humanMembers: 3 });
    assert.deepEqual(events[1]?.payload, { from: "team", to: "solo", humanMembers: 3 });

    assert.deepEqual(
      await Promise.all([ownerProfile(db, "tenant_a"), ownerProfile(db, "tenant_b")]),
      ["solo", "solo"],
      "the owner reads solo for A and B",
    );
  } finally {
    await db.close();
  }
});

test("C-1801fd2c The review profile refuses an unknown profile", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const carol = await signIn(db, a, "sub-carol", T09);
    const actor = adminActor(carol);

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        setReviewProfile(tx, a, "duo" as unknown as ReviewProfile, actor, { clock: fixedClock(T10) }),
      ),
      { name: "AdminError", code: "ADMIN_INVALID" },
      "duo is a bad profile value",
    );

    assert.deepEqual(
      await Promise.all([ownerProfile(db, "tenant_a"), ownerProfile(db, "tenant_b")]),
      ["solo", "solo"],
      "no tenant changed its profile",
    );
  } finally {
    await db.close();
  }
});
