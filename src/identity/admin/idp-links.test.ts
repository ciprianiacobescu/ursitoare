import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { createServiceAccount, provisionTenantIdp, upsertUserFromClaims } from "../index.ts";
import type { User } from "../index.ts";
import { addIdpLink, listIdpLinks } from "./idp-links.ts";
import type { IdpLinkRecord } from "./idp-links.ts";

assert.equal(typeof listIdpLinks, "function");
assert.equal(typeof addIdpLink, "function");

const ISS = "https://idp.example/realms/ursitoare";
const UNROUTED = "https://other.example/realms/ursitoare";
const T08 = "2026-10-25T08:00:00Z";
const T09 = "2026-10-25T09:00:00Z";
const T10 = "2026-10-25T10:00:00Z";
const T11 = "2026-10-25T11:00:00Z";

type AdminActor = Parameters<typeof addIdpLink>[3];

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
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject.slice(4) }, {
        ids,
        clock: fixedClock(at),
      }),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function makeService(
  db: TestDatabase,
  ctx: TenantContext,
  input: { displayName: string; ownerUserId: string },
  actor: AdminActor,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) => createServiceAccount(tx, ctx, input));
  });
  assert.ok(user !== undefined, "createServiceAccount resolves");
  assert.equal(actor.kind, "user", "the actor is a user");
  return user;
}

async function listLinks(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
): Promise<IdpLinkRecord[]> {
  let links: IdpLinkRecord[] | undefined;
  await assert.doesNotReject(async () => {
    links = await withTenantTx(db.appPool, ctx, (tx) => listIdpLinks(tx, ctx, userId));
  });
  assert.ok(links !== undefined, "listIdpLinks resolves");
  return links;
}

async function addLink(
  db: TestDatabase,
  ctx: TenantContext,
  input: { userId: string; issuer: string; subject: string },
  actor: AdminActor,
  at: string,
): Promise<IdpLinkRecord> {
  let link: IdpLinkRecord | undefined;
  await assert.doesNotReject(async () => {
    link = await withTenantTx(db.appPool, ctx, (tx) =>
      addIdpLink(tx, ctx, input, actor, { clock: fixedClock(at) }),
    );
  });
  assert.ok(link !== undefined, "addIdpLink resolves");
  return link;
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

test("C-802ffb44 IdP links are listed and added", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const ids = sequentialIds();
    const ann = await signIn(db, a, "sub-ann", T09, ids);
    const carol = await signIn(db, a, "sub-carol", T08, ids);
    const actor = adminActor(carol);

    assert.deepEqual(await listLinks(db, a, ann.userId), [
      { issuer: ISS, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" },
    ]);

    const added = await addLink(
      db,
      a,
      { userId: ann.userId, issuer: ISS, subject: "sub-ann-2" },
      actor,
      T10,
    );
    assert.deepEqual(added, {
      issuer: ISS,
      subject: "sub-ann-2",
      linkedAt: "2026-10-25T10:00:00.000000Z",
    });

    assert.deepEqual(await listLinks(db, a, ann.userId), [
      { issuer: ISS, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" },
      added,
    ]);

    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        addIdpLink(
          tx,
          a,
          { userId: ann.userId, issuer: ISS, subject: "sub-ann-2" },
          actor,
          { clock: fixedClock(T11) },
        ),
        { name: "AdminError", code: "ADMIN_EXISTS" },
        "a held pair is refused",
      );
    });

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.idp_linked",
    );
    assert.equal(events.length, 1, "only the added link is audited");
    assert.deepEqual(events[0]?.target, { kind: "user", id: ann.userId });
    assert.deepEqual(events[0]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(events[0]?.payload, { issuer: ISS, subject: "sub-ann-2" });
  } finally {
    await db.close();
  }
});

test("C-a63083c0 IdP links refuse held pairs and bad targets", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const ids = sequentialIds();
    const ann = await signIn(db, a, "sub-ann", T08, ids);
    const bob = await signIn(db, a, "sub-bob", T08, ids);
    const carol = await signIn(db, a, "sub-carol", T08, ids);
    const actor = adminActor(carol);
    const service = await makeService(
      db,
      a,
      { displayName: "Nightly bot", ownerUserId: ann.userId },
      actor,
    );
    assert.deepEqual(await listLinks(db, a, bob.userId), [
      { issuer: ISS, subject: "sub-bob", linkedAt: "2026-10-25T08:00:00.000000Z" },
    ]);

    await withTenantTx(db.appPool, a, async (tx) => {
      const cases: {
        input: { userId: string; issuer: string; subject: string };
        code: string;
        why: string;
      }[] = [
        {
          input: { userId: ann.userId, issuer: ISS, subject: "sub-ann" },
          code: "ADMIN_EXISTS",
          why: "a held pair",
        },
        {
          input: { userId: ann.userId, issuer: ISS, subject: "sub-bob" },
          code: "ADMIN_EXISTS",
          why: "bob's own pair for ann",
        },
        {
          input: { userId: ann.userId, issuer: UNROUTED, subject: "sub-new" },
          code: "ADMIN_UNKNOWN_ISSUER",
          why: "an issuer with no tenant_idp row",
        },
        {
          input: { userId: ann.userId, issuer: ISS, subject: " x" },
          code: "ADMIN_INVALID",
          why: "a padded subject",
        },
        {
          input: { userId: service.userId, issuer: ISS, subject: "sub-svc" },
          code: "ADMIN_WRONG_KIND",
          why: "a service account",
        },
        {
          input: { userId: "ghost", issuer: ISS, subject: "sub-ghost" },
          code: "ADMIN_NOT_FOUND",
          why: "an unknown id",
        },
        {
          input: { userId: "ghost", issuer: UNROUTED, subject: "sub-ghost" },
          code: "ADMIN_NOT_FOUND",
          why: "the user is checked before the issuer",
        },
        {
          input: { userId: service.userId, issuer: UNROUTED, subject: "sub-svc" },
          code: "ADMIN_WRONG_KIND",
          why: "the kind is checked before the issuer",
        },
        {
          input: { userId: service.userId, issuer: ISS, subject: "sub-ann" },
          code: "ADMIN_WRONG_KIND",
          why: "the kind is checked before the held pair",
        },
      ];
      for (const item of cases) {
        await assert.rejects(
          addIdpLink(tx, a, item.input, actor, { clock: fixedClock(T10) }),
          { name: "AdminError", code: item.code },
          item.why,
        );
      }
      await assert.rejects(
        listIdpLinks(tx, a, service.userId),
        { name: "AdminError", code: "ADMIN_NOT_FOUND" },
        "links of a service account",
      );
      await assert.rejects(
        listIdpLinks(tx, a, "ghost"),
        { name: "AdminError", code: "ADMIN_NOT_FOUND" },
        "links of an unknown id",
      );
    });

    const stored = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query<{ subject: string }>(
        `SELECT subject FROM ursitoare.idp_link WHERE tenant_id = $1 ORDER BY subject`,
        [a.tenantId],
      );
      return result.rows.map((row) => row.subject);
    });
    assert.deepEqual(stored, ["sub-ann", "sub-bob", "sub-carol"], "nothing was linked");
    assert.deepEqual(
      (await auditIn(db, a)).filter((row) => row.event_type === "identity.idp_linked"),
      [],
      "no refused link is audited",
    );
  } finally {
    await db.close();
  }
});

test("C-a63083c0 Concurrent identical IdP links resolve once", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const ids = sequentialIds();
    const ann = await signIn(db, a, "sub-ann", T08, ids);
    const carol = await signIn(db, a, "sub-carol", T08, ids);
    const actor = adminActor(carol);
    const input = { userId: ann.userId, issuer: ISS, subject: "sub-race" };

    const settled = await Promise.allSettled([
      withTenantTx(db.appPool, a, (tx) =>
        addIdpLink(tx, a, input, actor, { clock: fixedClock(T10) }),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        addIdpLink(tx, a, input, actor, { clock: fixedClock(T10) }),
      ),
    ]);
    assert.equal(
      settled.filter((outcome) => outcome.status === "fulfilled").length,
      1,
      "one call wins",
    );
    const rejected = settled.filter((outcome) => outcome.status === "rejected");
    assert.equal(rejected.length, 1, "the other call is refused");
    const reason = (rejected[0] as PromiseRejectedResult).reason as {
      name?: string;
      code?: string;
    };
    assert.equal(reason.name, "AdminError");
    assert.equal(reason.code, "ADMIN_EXISTS");

    const stored = await withTenantTx(db.ownerPool, a, async (tx) => {
      const result = await tx.query<{ subject: string }>(
        `SELECT subject FROM ursitoare.idp_link WHERE tenant_id = $1 AND subject = 'sub-race'`,
        [a.tenantId],
      );
      return result.rows.map((row) => row.subject);
    });
    assert.deepEqual(stored, ["sub-race"], "one link is stored");
    assert.equal(
      (await auditIn(db, a)).filter((row) => row.event_type === "identity.idp_linked").length,
      1,
      "one link is audited",
    );
  } finally {
    await db.close();
  }
});
