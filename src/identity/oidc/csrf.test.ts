import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";

import { fixedClock, sequentialIds } from "../../core/index.ts";
import type { Clock } from "../../core/index.ts";
import { withTenantTx, type TenantContext } from "../../tenancy/index.ts";
import { withTestDatabase, type TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import {
  OidcError,
  createSession,
  issueCsrfToken,
  resolveSession,
  revokeSession,
  upsertUserFromClaims,
  verifyCsrfToken,
  type OidcOptions,
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

async function makeUser(
  db: TestDatabase,
  ctx: TenantContext,
  clock: Clock,
  claims: TokenClaims,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(tx, ctx, claims, { ids: sequentialIds(), clock }),
    );
  });
  assert.ok(user !== undefined, "the user is created");
  return user;
}

async function create(
  db: TestDatabase,
  ctx: TenantContext,
  userId: string,
  opts: OidcOptions,
): Promise<string> {
  let created: { sessionId: string } | undefined;
  await assert.doesNotReject(async () => {
    created = await withTenantTx(db.appPool, ctx, (tx) =>
      createSession(tx, ctx, { userId }, opts),
    );
  });
  assert.ok(created !== undefined, "createSession returns a session");
  return created.sessionId;
}

async function resolve(
  db: TestDatabase,
  cookie: string,
  clock: Clock,
): Promise<SessionContext | null> {
  let session: SessionContext | null | undefined;
  await assert.doesNotReject(async () => {
    session = await resolveSession(db.appPool, cookie, { clock });
  });
  assert.ok(session !== undefined, "resolveSession resolves");
  return session;
}

async function issue(
  db: TestDatabase,
  session: SessionContext,
  opts: OidcOptions,
): Promise<string> {
  let token: string | undefined;
  await assert.doesNotReject(async () => {
    token = await issueCsrfToken(db.appPool, session, opts);
  });
  assert.ok(token !== undefined, "issueCsrfToken returns a token");
  return token;
}

async function verify(
  db: TestDatabase,
  session: SessionContext,
  token: string | undefined,
): Promise<boolean> {
  let result: boolean | undefined;
  await assert.doesNotReject(async () => {
    result = await verifyCsrfToken(db.appPool, session, token);
  });
  assert.ok(result !== undefined, "verifyCsrfToken returns");
  return result;
}

async function sessionRows(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<Record<string, unknown>[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const result = await tx.query("SELECT * FROM ursitoare.session WHERE tenant_id = $1", [
      ctx.tenantId,
    ]);
    return result.rows as Record<string, unknown>[];
  });
}

function assertNoColumnHolds(
  rows: readonly Record<string, unknown>[],
  token: string,
): void {
  for (const row of rows) {
    for (const value of Object.values(row)) {
      const candidates: string[] =
        typeof value === "string"
          ? [value]
          : value instanceof Buffer
            ? [value.toString("hex"), value.toString("base64url"), value.toString("utf8")]
            : [];
      for (const candidate of candidates) {
        assert.notEqual(candidate, token, "no session column holds a CSRF token");
      }
    }
  }
}

test("C-00d9c51c Issue and verify CSRF tokens", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const clock = fixedClock(T0);
    const alice = await makeUser(db, a, clock, ALICE);
    const opts: OidcOptions = { clock };

    const sessionId = await create(db, a, alice.userId, opts);
    const session = await resolve(db, sessionId, clock);
    assert.ok(session !== null, "the live session resolves");

    const first = await issue(db, session, opts);
    const second = await issue(db, session, opts);
    assert.match(first, /^[A-Za-z0-9_-]{43}$/, "the first token has 43 characters");
    assert.match(second, /^[A-Za-z0-9_-]{43}$/, "the second token has 43 characters");
    assert.notEqual(first, second, "a new token replaces the previous one");

    const rows = await sessionRows(db, a);
    assert.equal(rows.length, 1);
    const stored = rows[0]?.["csrf_token_hash"];
    assert.ok(stored instanceof Buffer, "the stored hash is a bytea");
    assert.equal(
      stored.equals(createHash("sha256").update(second, "utf8").digest()),
      true,
      "the stored hash is the SHA-256 of the second token",
    );
    assertNoColumnHolds(rows, first);
    assertNoColumnHolds(rows, second);

    assert.equal(await verify(db, session, first), false, "the replaced token is refused");
    assert.equal(await verify(db, session, second), true, "the current token is accepted");
    assert.equal(await verify(db, session, undefined), false, "an absent token is refused");
    assert.equal(await verify(db, session, ""), false, "an empty token is refused");
    assert.equal(await verify(db, session, "wrong-token"), false, "a wrong token is refused");

    const revoked = await revokeSession(db.appPool, session, { clock });
    assert.equal(revoked, true, "the session is revoked");
    assert.equal(
      await verify(db, session, second),
      false,
      "a revoked session accepts no token",
    );

    await assert.rejects(
      issueCsrfToken(db.appPool, session, opts),
      (error: unknown) => {
        assert.ok(error instanceof OidcError, "issueCsrfToken rejects with an OidcError");
        assert.equal(error.code, "SESSION_NOT_FOUND");
        return true;
      },
    );
  } finally {
    await db.close();
  }
});
