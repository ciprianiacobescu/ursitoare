import assert from "node:assert/strict";
import { test } from "node:test";

import type { Clock } from "../../core/index.ts";
import { sequentialIds } from "../../core/index.ts";
import {
  hashRouteKey,
  resolveTenantBy,
  withTenantTx,
  type TenantContext,
  type TenantPool,
} from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import {
  OidcError,
  createSession,
  principalOf,
  resolveSession,
  revokeSession,
  upsertUserFromClaims,
  type OidcOptions,
  type Principal,
  type SessionContext,
  type TokenClaims,
  type User,
} from "../index.ts";

const T0 = "2026-10-25T08:00:00.000Z";
const ISS = "https://idp.example/realms/ursitoare";

const ALICE: TokenClaims = {
  issuer: ISS,
  subject: "sub-alice",
  email: "alice@example.test",
  name: "Alice A",
  preferredUsername: "alice",
};

const MALLORY: TokenClaims = {
  issuer: ISS,
  subject: "sub-mallory",
  email: "mallory@example.test",
  name: "Mallory M",
  preferredUsername: "mallory",
};

interface MutableClock extends Clock {
  set(iso: string): void;
  advance(seconds: number): void;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    set(iso: string): void {
      millis = Date.parse(iso);
    },
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function afterSeconds(seconds: number): string {
  return new Date(Date.parse(T0) + seconds * 1000).toISOString();
}

function countingRandomBytes(): (size: number) => Uint8Array {
  let counter = 0;
  return (size: number): Uint8Array => {
    counter += 1;
    const bytes = new Uint8Array(size);
    bytes.fill(counter & 0xff);
    return bytes;
  };
}

function spyPool(): { pool: TenantPool; calls: () => number } {
  let count = 0;
  const pool: TenantPool = {
    connect: (() => {
      count += 1;
      return Promise.reject(new Error("spy pool must not connect"));
    }) as TenantPool["connect"],
  };
  return { pool, calls: () => count };
}

async function makeUser(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
  claims: TokenClaims,
  ids = sequentialIds(),
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, claims, { ids, clock }),
    );
  });
  assert.ok(user !== undefined, "the user is created");
  return user;
}

async function ownerRows(
  db: TestDatabase,
  ctx: TenantContext,
  sql: string,
  params: unknown[] = [],
): Promise<Record<string, unknown>[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query(sql, params);
    return result.rows as Record<string, unknown>[];
  });
}

async function create(
  pool: TenantPool,
  ctx: TenantContext,
  userId: string,
  opts: OidcOptions,
): Promise<string> {
  let created: { sessionId: string } | undefined;
  await assert.doesNotReject(async () => {
    created = await withTenantTx(pool, ctx, (tx) =>
      createSession(tx, ctx, { userId }, opts),
    );
  });
  assert.ok(created !== undefined, "createSession returns a session");
  return created.sessionId;
}

async function resolve(
  pool: TenantPool,
  cookie: string | undefined,
  clock: Clock,
): Promise<SessionContext | null> {
  let session: SessionContext | null | undefined;
  await assert.doesNotReject(async () => {
    session = await resolveSession(pool, cookie, { clock });
  });
  assert.ok(session !== undefined, "resolveSession resolves");
  return session;
}

async function revoke(
  pool: TenantPool,
  session: SessionContext,
  clock: Clock,
): Promise<boolean> {
  let result: boolean | undefined;
  await assert.doesNotReject(async () => {
    result = await revokeSession(pool, session, { clock });
  });
  assert.ok(result !== undefined, "revokeSession returns");
  return result;
}

async function principalFor(session: SessionContext): Promise<Principal> {
  let principal: Principal | undefined;
  await assert.doesNotReject(async () => {
    principal = principalOf(session);
  });
  assert.ok(principal !== undefined, "principalOf returns a principal");
  return principal;
}

async function setUserState(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  state: "active" | "disabled",
): Promise<void> {
  await withTenantTx(db.ownerPool, ctx, (tx) =>
    tx.query('UPDATE ursitoare."user" SET state = $1 WHERE tenant_id = $2 AND user_id = $3', [
      state,
      ctx.tenantId,
      userId,
    ]),
  );
}

test("C-b4562a26 C-a4347c4a Create and resolve", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionId = await create(db.appPool, a, alice.userId, opts);
    assert.equal(sessionId.length, 43, "the session id is 43 characters");

    const hash = hashRouteKey(sessionId);
    const rows = await ownerRows(
      db,
      a,
      `SELECT session_id_hash, user_id, created_at, last_seen_at, expires_at,
              idle_timeout_s, end_session_hint, revoked_at
         FROM ursitoare.session`,
    );
    assert.equal(rows.length, 1);
    const row = rows[0];
    assert.ok(row !== undefined, "the session row exists");
    assert.ok(row["session_id_hash"] instanceof Buffer);
    assert.ok(
      (row["session_id_hash"] as Buffer).equals(hash),
      "the row stores hashRouteKey of the session id",
    );
    assert.equal(row["user_id"], alice.userId);
    assert.equal((row["created_at"] as Date).toISOString(), T0);
    assert.equal((row["last_seen_at"] as Date).toISOString(), T0);
    assert.equal(
      (row["expires_at"] as Date).toISOString(),
      afterSeconds(43200),
      "the session expires 12 hours after creation",
    );
    assert.equal(row["idle_timeout_s"], 1800);
    assert.equal(row["end_session_hint"], null);
    assert.equal(row["revoked_at"], null);

    const tenant = await resolveTenantBy(db.appPool, "session", sessionId);
    assert.deepEqual(tenant, a, "the route finds tenant a");

    const session = await resolve(db.appPool, sessionId, clock);
    assert.ok(session !== null, "the live session resolves");
    assert.deepEqual(session.tenant, a);
    assert.equal(session.userId, alice.userId);
    assert.equal(session.sessionRef, hash.toString("hex"));
    assert.equal(session.endSessionHint, null);

    assert.deepEqual(await principalFor(session), {
      tenantId: a.tenantId,
      userId: alice.userId,
      kind: "human",
      sessionId: hash.toString("hex"),
      roles: [],
      teams: [],
      actorChain: [],
    });
  } finally {
    await db.close();
  }
});

test("C-a4347c4a Nothing to look up", async () => {
  const clock = mutableClock(T0);
  const { pool, calls } = spyPool();
  const malformed = [
    undefined,
    "",
    "a".repeat(42),
    "a".repeat(44),
    `${"a".repeat(42)}!`,
  ];
  for (const cookie of malformed) {
    const session = await resolve(pool, cookie, clock);
    assert.equal(session, null, "a malformed cookie resolves to null");
  }
  assert.equal(calls(), 0, "a malformed cookie never opens a connection");

  const db = await withTestDatabase();
  try {
    await seedTwoTenants(db);
    const session = await resolve(db.appPool, "A".repeat(43), clock);
    assert.equal(session, null, "an unknown valid-looking id resolves to null");
  } finally {
    await db.close();
  }
});

test("C-95bce1e1 Idle timeout revokes and removes the route", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const early = await create(db.appPool, a, alice.userId, opts);
    const late = await create(db.appPool, a, alice.userId, opts);

    clock.set(afterSeconds(1799));
    const resolved = await resolve(db.appPool, early, clock);
    assert.ok(resolved !== null, "a session used before the idle timeout resolves");

    clock.set(afterSeconds(1801));
    const idle = await resolve(db.appPool, late, clock);
    assert.equal(idle, null, "a session idle for more than the timeout is refused");
    assert.equal(
      await resolveTenantBy(db.appPool, "session", late),
      null,
      "the idle session loses its route",
    );
    assert.notEqual(
      await resolveTenantBy(db.appPool, "session", early),
      null,
      "the other session keeps its route",
    );
  } finally {
    await db.close();
  }
});

test("C-95bce1e1 Absolute expiry after long use", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionId = await create(db.appPool, a, alice.userId, opts);
    for (let elapsed = 1740; elapsed < 43200; elapsed += 1740) {
      clock.set(afterSeconds(elapsed));
      const session = await resolve(db.appPool, sessionId, clock);
      assert.ok(session !== null, `the session still resolves at ${elapsed} s`);
    }

    clock.set(afterSeconds(43200));
    const expired = await resolve(db.appPool, sessionId, clock);
    assert.equal(expired, null, "the session expires 12 hours after creation");
    assert.equal(
      await resolveTenantBy(db.appPool, "session", sessionId),
      null,
      "the expired session loses its route",
    );
  } finally {
    await db.close();
  }
});

test("C-95bce1e1 Revoke twice", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionId = await create(db.appPool, a, alice.userId, opts);
    const session = await resolve(db.appPool, sessionId, clock);
    assert.ok(session !== null, "the session resolves before revocation");

    assert.equal(await revoke(db.appPool, session, clock), true, "the first revoke changes the row");
    assert.equal(await revoke(db.appPool, session, clock), false, "the second revoke changes nothing");

    const rows = await ownerRows(
      db,
      a,
      "SELECT revoked_at FROM ursitoare.session WHERE tenant_id = $1",
      [a.tenantId],
    );
    assert.equal(rows.length, 1);
    assert.ok(rows[0]?.["revoked_at"] instanceof Date, "the row is revoked");

    assert.equal(await resolve(db.appPool, sessionId, clock), null);
    assert.equal(await resolveTenantBy(db.appPool, "session", sessionId), null);
  } finally {
    await db.close();
  }
});

test("C-95bce1e1 Disabled user loses the session until re-enabled", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionId = await create(db.appPool, a, alice.userId, opts);
    const live = await resolve(db.appPool, sessionId, clock);
    assert.ok(live !== null, "the active user resolves");

    await setUserState(db, a, alice.userId, "disabled");
    assert.equal(await resolve(db.appPool, sessionId, clock), null, "a disabled user is refused");

    await setUserState(db, a, alice.userId, "active");
    const reenabled = await resolve(db.appPool, sessionId, clock);
    assert.ok(reenabled !== null, "a re-enabled user resolves again");
  } finally {
    await db.close();
  }
});

test("C-70cd8356 last_seen_at slides at most once a minute", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionId = await create(db.appPool, a, alice.userId, opts);

    clock.set(afterSeconds(30));
    const atThirty = await resolve(db.appPool, sessionId, clock);
    assert.ok(atThirty !== null);
    const rowsAtThirty = await ownerRows(
      db,
      a,
      "SELECT last_seen_at FROM ursitoare.session WHERE tenant_id = $1",
      [a.tenantId],
    );
    assert.equal(
      (rowsAtThirty[0]?.["last_seen_at"] as Date).toISOString(),
      T0,
      "a use within a minute does not slide last_seen_at",
    );

    clock.set(afterSeconds(60));
    const atSixty = await resolve(db.appPool, sessionId, clock);
    assert.ok(atSixty !== null);
    const rowsAtSixty = await ownerRows(
      db,
      a,
      "SELECT last_seen_at FROM ursitoare.session WHERE tenant_id = $1",
      [a.tenantId],
    );
    assert.equal(
      (rowsAtSixty[0]?.["last_seen_at"] as Date).toISOString(),
      afterSeconds(60),
      "a use after a minute slides last_seen_at to the clock",
    );
  } finally {
    await db.close();
  }
});

test("C-3df7fca5 Reaping revokes twenty and keeps the new session", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const created: string[] = [];
    for (let index = 0; index < 25; index += 1) {
      created.push(await create(db.appPool, a, alice.userId, opts));
    }
    assert.equal(new Set(created).size, 25, "every session has its own id");

    clock.set(afterSeconds(43201));
    const fresh = await create(db.appPool, a, alice.userId, opts);

    const rows = await ownerRows(
      db,
      a,
      "SELECT encode(session_id_hash, 'hex') AS hash, revoked_at FROM ursitoare.session",
    );
    assert.equal(rows.length, 26);
    const revoked = rows.filter((row) => row["revoked_at"] !== null);
    const live = rows.filter((row) => row["revoked_at"] === null);
    assert.equal(revoked.length, 20, "reaping revokes twenty expired sessions");
    assert.equal(live.length, 6, "the five other expired sessions and the new one stay live");

    const idByHash = new Map(
      created.map((sessionId) => [hashRouteKey(sessionId).toString("hex"), sessionId]),
    );
    for (const row of revoked) {
      const sessionId = idByHash.get(row["hash"] as string);
      assert.ok(sessionId !== undefined, "the revoked row belongs to a created session");
      assert.equal(
        await resolveTenantBy(db.appPool, "session", sessionId),
        null,
        "a reaped session loses its route",
      );
    }

    const freshRow = rows.find(
      (row) => row["hash"] === hashRouteKey(fresh).toString("hex"),
    );
    assert.ok(freshRow !== undefined);
    assert.equal(freshRow["revoked_at"], null, "the new session is live");
    assert.ok((await resolve(db.appPool, fresh, clock)) !== null);

    const routeRows = await ownerRows(
      db,
      a,
      "SELECT count(*)::text AS count FROM ursitoare.tenant_route WHERE kind = 'session'",
    );
    assert.equal(Number(routeRows[0]?.["count"]), 6, "only live session routes remain");
  } finally {
    await db.close();
  }
});

test("C-3df7fca5 Session routes keep tenants apart", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const mallory = await makeUser(db, b, clock, MALLORY);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    const sessionA = await create(db.appPool, a, alice.userId, opts);
    const sessionB = await create(db.appPool, b, mallory.userId, opts);

    const resolvedA = await resolve(db.appPool, sessionA, clock);
    const resolvedB = await resolve(db.appPool, sessionB, clock);
    assert.ok(resolvedA !== null);
    assert.ok(resolvedB !== null);
    assert.equal(resolvedA.tenant.tenantId, a.tenantId);
    assert.equal(resolvedA.userId, alice.userId);
    assert.equal(resolvedB.tenant.tenantId, b.tenantId);
    assert.equal(resolvedB.userId, mallory.userId);

    const countA = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ count: string }>(
        "SELECT count(*)::text AS count FROM ursitoare.session",
      );
      return Number(result.rows[0]?.count);
    });
    assert.equal(countA, 1, "tenant a sees only its own session");
  } finally {
    await db.close();
  }
});

test("C-3df7fca5 createSession refuses another tenant context", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const clock = mutableClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock, randomBytes: countingRandomBytes() };

    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) =>
        createSession(tx, a, { userId: alice.userId }, opts),
      ),
      (error: unknown) => {
        assert.ok(error instanceof OidcError, "the call rejects with an OidcError");
        assert.equal(error.code, "SESSION_TENANT_MISMATCH");
        return true;
      },
    );

    const rows = await ownerRows(
      db,
      a,
      "SELECT count(*)::text AS count FROM ursitoare.session",
    );
    assert.equal(Number(rows[0]?.["count"]), 0, "no session is written for the other tenant");
  } finally {
    await db.close();
  }
});
