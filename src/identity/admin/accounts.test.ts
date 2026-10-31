import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { createServiceAccount, provisionTenantIdp, upsertUserFromClaims } from "../index.ts";
import type { User, UserKind } from "../index.ts";
import { grantRole } from "../rbac/grants.ts";
import { setGroupMapping } from "../rbac/group-map.ts";
import { syncMemberships } from "../rbac/sync.ts";
import { AdminError } from "./errors.ts";
import { getAccount, listAccounts, provisionServiceAccount, setAccountState } from "./accounts.ts";

assert.equal(typeof getAccount, "function");
assert.equal(typeof listAccounts, "function");
assert.equal(typeof provisionServiceAccount, "function");
assert.equal(typeof setAccountState, "function");
assert.equal(typeof AdminError, "function");

const ISS = "https://idp.example/realms/ursitoare";
const VALIDATION = { code: "ADMIN_INVALID" };
const NOT_FOUND = { code: "ADMIN_NOT_FOUND" };
const MISMATCH = { code: "ADMIN_TENANT_MISMATCH" };
const SELF_DISABLE = { code: "ADMIN_SELF_DISABLE" };
const OWNER_INVALID = { code: "IDENTITY_OWNER_INVALID" };

type AccountList = Awaited<ReturnType<typeof listAccounts>>;

type AdminActor = Parameters<typeof setAccountState>[3];

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
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, { issuer: ISS, subject, name: subject.slice(4) }, {
        ids,
        clock: fixedClock("2026-10-25T08:00:00Z"),
      }),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function readAccount(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  kind: UserKind,
): Promise<Awaited<ReturnType<typeof getAccount>>> {
  let value: Awaited<ReturnType<typeof getAccount>> | undefined;
  await assert.doesNotReject(async () => {
    value = await withTenantTx(db.appPool, ctx, (tx) => getAccount(tx, ctx, userId, kind));
  });
  assert.ok(value !== undefined, "getAccount resolves");
  return value;
}

async function listPage(
  db: TestDatabase,
  ctx: TenantContext,
  q: Parameters<typeof listAccounts>[2],
): Promise<AccountList> {
  let value: AccountList | undefined;
  await assert.doesNotReject(async () => {
    value = await withTenantTx(db.appPool, ctx, (tx) => listAccounts(tx, ctx, q));
  });
  assert.ok(value !== undefined, "listAccounts resolves");
  return value;
}

async function makeService(
  db: TestDatabase,
  ctx: TenantContext,
  input: { displayName: string; ownerUserId: string },
  actor: AdminActor,
): Promise<User | undefined> {
  let value: User | undefined;
  await assert.doesNotReject(async () => {
    value = await withTenantTx(db.appPool, ctx, (tx) =>
      provisionServiceAccount(tx, ctx, input, actor),
    );
  });
  return value;
}

async function changeState(
  db: TestDatabase,
  ctx: TenantContext,
  input: Parameters<typeof setAccountState>[2],
  actor: AdminActor,
): Promise<{ user: User; changed: boolean } | undefined> {
  let value: { user: User; changed: boolean } | undefined;
  await assert.doesNotReject(async () => {
    value = await withTenantTx(db.appPool, ctx, (tx) => setAccountState(tx, ctx, input, actor));
  });
  return value;
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

function assertAccountShape(item: unknown): void {
  assert.deepEqual(Object.keys(item as { userId?: unknown }).sort(), [
    "displayName",
    "email",
    "kind",
    "localRoles",
    "ownerUserId",
    "roles",
    "state",
    "teams",
    "userId",
  ]);
}

test("C-32b7b36c Accounts list and read", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const ann = await signIn(db, a, "sub-ann", ids);
    const bob = await signIn(db, a, "sub-bob", ids);
    const cat = await signIn(db, a, "sub-cat", ids);
    const carol = await signIn(db, a, "sub-carol", ids);
    let created: User | undefined;
    await assert.doesNotReject(async () => {
      created = await withTenantTx(db.appPool, a, (tx) =>
        createServiceAccount(tx, a, { displayName: "robot", ownerUserId: ann.userId }),
      );
    });
    assert.ok(created !== undefined, "createServiceAccount resolves");
    const robot: User = created;

    const first = await listPage(db, a, { kind: "human", limit: 2 });
    assert.deepEqual(
      first.users.map((row) => row.userId),
      [ann.userId, bob.userId],
      "the first page holds 2 humans ordered by userId",
    );
    assert.deepEqual(first.next, bob.userId);
    assertAccountShape(first.users[0]);
    assert.deepEqual(first.users[0], {
      userId: ann.userId,
      kind: "human",
      ownerUserId: null,
      displayName: "ann",
      email: null,
      state: "active",
      roles: [],
      teams: [],
      localRoles: [],
    });

    const second = await listPage(db, a, { kind: "human", limit: 2, after: first.next });
    assert.deepEqual(
      second.users.map((row) => row.userId),
      [cat.userId, carol.userId],
    );
    assert.equal(second.next, null);

    assert.deepEqual(await readAccount(db, a, ann.userId, "human"), first.users[0], "getAccount reads ann of the right kind");
    assert.equal(await readAccount(db, a, ann.userId, "service"), null, "a human is not found as a service account");
    assert.equal(await readAccount(db, a, robot.userId, "human"), null, "a service account is not found as a human");
    assert.deepEqual(await readAccount(db, a, robot.userId, "service"), {
      userId: robot.userId,
      kind: "service",
      ownerUserId: ann.userId,
      displayName: "robot",
      email: null,
      state: "active",
      roles: [],
      teams: [],
      localRoles: [],
    });
    assert.equal(await readAccount(db, a, "ghost", "human"), null, "an unknown valid id is not found");
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 0 }), VALIDATION, "limit 0");
      await assert.rejects(listAccounts(tx, a, { kind: "human", limit: 201 }), VALIDATION, "limit 201");
      await assert.rejects(
        listAccounts(tx, a, { kind: "human", limit: 50, after: "bad id" }),
        VALIDATION,
        "a bad after",
      );
    });
    await withTenantTx(db.appPool, b, async (tx) => {
      await assert.rejects(
        listAccounts(tx, a, { kind: "human", limit: 50 }),
        MISMATCH,
        "a tenant_b transaction with the tenant_a context",
      );
    });

    const outside = await listPage(db, b, { kind: "human", limit: 50 });
    assert.deepEqual(outside, { users: [], next: null }, "tenant B sees none of tenant A");
    assert.equal(await readAccount(db, b, ann.userId, "human"), null, "tenant B cannot read ann");

    assert.deepEqual(
      await listPage(db, a, { kind: "human", state: "disabled", limit: 50 }),
      { users: [], next: null },
      "the state filter finds no disabled human yet",
    );
  } finally {
    await db.close();
  }
});

test("C-c6c6a2a5 Accounts hold roles teams and local roles", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    await ownerExec(db, a, "INSERT INTO ursitoare.team (tenant_id, team_id) VALUES ($1, 'finance')", [
      a.tenantId,
    ]);
    const OPERATOR = { kind: "operator", name: "seed" } as const;
    const opts = {
      clock: fixedClock("2026-10-25T08:00:00Z"),
      ids: sequentialIds(),
    };
    const ann = await signIn(db, a, "sub-ann", opts.ids);
    const bob = await signIn(db, a, "sub-bob", opts.ids);
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.doesNotReject(async () => {
        await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "ursitoare-approvers", roleId: "approver" },
          OPERATOR,
        );
        await setGroupMapping(
          tx,
          a,
          { issuer: ISS, group: "team-finance", teamId: "finance" },
          OPERATOR,
        );
      });
      let granted: "granted" | "exists" | undefined;
      await assert.doesNotReject(async () => {
        granted = await grantRole(tx, a, { userId: ann.userId, roleId: "author" }, OPERATOR);
      });
      assert.equal(granted, "granted", "the operator grant holds");
      await assert.doesNotReject(async () => {
        await syncMemberships(
          tx,
          a,
          ann.userId,
          { issuer: ISS, groups: ["ursitoare-approvers", "team-finance"] },
          opts,
        );
      });
    });
    await ownerExec(
      db,
      a,
      `UPDATE ursitoare."user" SET state = 'disabled' WHERE user_id = $1`,
      [ann.userId],
    );

    assert.deepEqual(await readAccount(db, a, ann.userId, "human"), {
      userId: ann.userId,
      kind: "human",
      ownerUserId: null,
      displayName: "ann",
      email: null,
      state: "disabled",
      roles: ["approver", "author"],
      teams: ["finance"],
      localRoles: ["author"],
    });
    assert.deepEqual(await readAccount(db, a, bob.userId, "human"), {
      userId: bob.userId,
      kind: "human",
      ownerUserId: null,
      displayName: "bob",
      email: null,
      state: "active",
      roles: [],
      teams: [],
      localRoles: [],
    });

    const outside = await listPage(db, b, { kind: "human", limit: 50 });
    assert.deepEqual(outside, { users: [], next: null }, "tenant B sees none of tenant A's accounts");
  } finally {
    await db.close();
  }
});

test("C-9733f98e Account state changes", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const bob = await signIn(db, a, "sub-bob", ids);
    const carol = await signIn(db, a, "sub-carol", ids);
    const carolActor = adminActor(carol);
    let created: User | undefined;
    await assert.doesNotReject(async () => {
      created = await withTenantTx(db.appPool, a, (tx) =>
        createServiceAccount(tx, a, { displayName: "robot", ownerUserId: bob.userId }),
      );
    });
    assert.ok(created !== undefined);
    const robot: User = created;

    const settled = await Promise.allSettled([
      withTenantTx(db.appPool, a, (tx) =>
        setAccountState(tx, a, { userId: bob.userId, kind: "human", state: "disabled" }, carolActor),
      ),
      withTenantTx(db.appPool, a, (tx) =>
        setAccountState(tx, a, { userId: bob.userId, kind: "human", state: "disabled" }, carolActor),
      ),
    ]);
    assert.deepEqual(
      settled.map((outcome) => outcome.status),
      ["fulfilled", "fulfilled"],
    );
    const changed = settled
      .map((outcome) =>
        outcome.status === "fulfilled"
          ? (outcome.value as { changed: boolean }).changed
          : undefined,
      )
      .sort();
    assert.deepEqual(changed, [false, true], "one call changes the state, the repeat does not");

    const repeat = await changeState(
      db,
      a,
      { userId: bob.userId, kind: "human", state: "disabled" },
      carolActor,
    );
    assert.deepEqual(repeat, {
      user: {
        userId: bob.userId,
        kind: "human",
        ownerUserId: null,
        displayName: "bob",
        email: null,
        state: "disabled",
      },
      changed: false,
    }, "a same-state call is not a change");
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        setAccountState(tx, a, { userId: carol.userId, kind: "human", state: "disabled" }, carolActor),
        SELF_DISABLE,
        "carol cannot disable herself",
      );
      await assert.rejects(
        setAccountState(tx, a, { userId: "ghost", kind: "human", state: "disabled" }, carolActor),
        NOT_FOUND,
        "an absent id",
      );
      await assert.rejects(
        setAccountState(tx, a, { userId: robot.userId, kind: "human", state: "disabled" }, carolActor),
        NOT_FOUND,
        "a service account's id through the human kind",
      );
      await assert.rejects(
        setAccountState(tx, a, { userId: bob.userId, kind: "service", state: "disabled" }, carolActor),
        NOT_FOUND,
        "a human's id through the service kind",
      );
    });

    const enabling = await changeState(
      db,
      a,
      { userId: bob.userId, kind: "human", state: "active" },
      carolActor,
    );
    assert.ok(enabling !== undefined, "the enable resolves");
    assert.equal(enabling.changed, true);
    assert.equal(enabling.user.state, "active");

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.user_state_changed",
    );
    assert.equal(events.length, 2, "one event per real change, none for the repeats");
    assert.deepEqual(events[0]?.target, { kind: "user", id: bob.userId });
    assert.deepEqual(events[0]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(events[0]?.payload, { from: "active", to: "disabled", kind: "human" });
    assert.deepEqual(events[1]?.payload, { from: "disabled", to: "active", kind: "human" });
  } finally {
    await db.close();
  }
});

test("C-8087d00f Service account provisioning and owners", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const ids = sequentialIds();
    const carol = await signIn(db, a, "sub-carol", ids);
    const bob = await signIn(db, a, "sub-bob", ids);
    const carolActor = adminActor(carol);

    const first = await makeService(
      db,
      a,
      { displayName: "Nightly bot", ownerUserId: carol.userId },
      carolActor,
    );
    assert.ok(first !== undefined, "provisionServiceAccount resolves");
    assert.match(
      first.userId,
      /^svc_[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    assert.deepEqual(
      {
        kind: first.kind,
        ownerUserId: first.ownerUserId,
        displayName: first.displayName,
        email: first.email,
        state: first.state,
      },
      {
        kind: "service",
        ownerUserId: carol.userId,
        displayName: "Nightly bot",
        email: null,
        state: "active",
      },
    );

    const second = await makeService(
      db,
      a,
      { displayName: "Morning bot", ownerUserId: bob.userId },
      carolActor,
    );
    assert.ok(second !== undefined);
    assert.equal(second.ownerUserId, bob.userId, "a service account can be owned by bob");

    await ownerExec(
      db,
      a,
      `UPDATE ursitoare."user" SET state = 'disabled' WHERE user_id = $1`,
      [bob.userId],
    );
    await withTenantTx(db.appPool, a, async (tx) => {
      await assert.rejects(
        provisionServiceAccount(
          tx,
          a,
          { displayName: "robot", ownerUserId: bob.userId },
          carolActor,
        ),
        OWNER_INVALID,
        "an inactive owner",
      );
      await assert.rejects(
        provisionServiceAccount(
          tx,
          a,
          { displayName: "robot", ownerUserId: second.userId },
          carolActor,
        ),
        OWNER_INVALID,
        "a service owner",
      );
    });
    await withTenantTx(db.appPool, a, async (tx) => {
      const res = await tx.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM ursitoare.\"user\" WHERE kind = 'service'",
      );
      assert.equal((res.rows[0] as { n: number }).n, 2, "nothing is stored by the bad owners");
    });

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.service_account_created",
    );
    assert.equal(events.length, 2, "one event per created service account");
    assert.deepEqual(
      events.map((row) => row.target),
      [{ kind: "user", id: first.userId }, { kind: "user", id: second.userId }],
    );
    assert.deepEqual(
      events.map((row) => row.payload),
      [
        { ownerUserId: carol.userId, displayName: "Nightly bot" },
        { ownerUserId: bob.userId, displayName: "Morning bot" },
      ],
    );
  } finally {
    await db.close();
  }
});
