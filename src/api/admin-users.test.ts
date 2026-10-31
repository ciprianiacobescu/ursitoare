import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { Clock } from "../core/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import {
  createServiceAccount,
  createTeam,
  grantRole,
  provisionTenantIdp,
  setGroupMapping,
  syncMemberships,
  upsertUserFromClaims,
} from "../identity/index.ts";
import type { User } from "../identity/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerAdminRoutes } from "./admin-routes.ts";
import type { AdminApiDeps } from "./admin-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const T08 = "2026-10-25T08:00:00Z";
const T09 = "2026-10-25T09:00:00Z";
const ISS = "https://idp.example/realms/ursitoare";
const UNROUTED = "https://other.example/realms/ursitoare";
const OPERATOR = { kind: "operator", name: "cli" } as const;

const engineDirs: string[] = [];

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface AccountBody {
  userId: string;
  kind: "human" | "service";
  ownerUserId: string | null;
  displayName: string;
  email: string | null;
  state: "active" | "disabled";
  roles: string[];
  teams: string[];
  localRoles: string[];
}

interface PageBody<T> {
  items: T[];
  next_cursor: string | null;
}

interface IdpLinkBody {
  issuer: string;
  subject: string;
  linkedAt: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
  clock: MutableClock;
}

interface AuditRow {
  event_type: string;
  actor: unknown;
  target: unknown;
  payload: unknown;
}

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function permitAllEngine(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-admin-users-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function testServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = mutableClock(T0);
  const engine = await permitAllEngine(clock);
  const server = await testServer();

  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");

  const deps: AdminApiDeps = {
    pool: db.appPool,
    clock,
    ids: sequentialIds(5000),
    engineKey: { reveal: () => "k".repeat(64) },
  };
  assert.doesNotThrow(() => {
    registerAdminRoutes(server, deps);
  }, "registerAdminRoutes");

  return { db, server, a, b, clock };
}

async function closeHarness(harness: Harness): Promise<void> {
  await harness.server.close();
  await harness.db.close();
}

async function session(
  db: TestDatabase,
  ctx: TenantContext,
  subject: string,
  clock: Clock,
): Promise<Session> {
  let created: Session | undefined;
  await assert.doesNotReject(async () => {
    created = await createTestSession(db, ctx, subject, clock);
  });
  assert.ok(created !== undefined, "createTestSession returns a session");
  return created;
}

async function signIn(
  db: TestDatabase,
  ctx: TenantContext,
  issuer: string,
  subject: string,
  at: string,
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) =>
      upsertUserFromClaims(
        tx,
        ctx,
        { issuer, subject, name: subject },
        { clock: fixedClock(at) },
      ),
    );
  });
  assert.ok(user !== undefined, "upsertUserFromClaims resolves");
  return user;
}

async function makeServiceAccount(
  db: TestDatabase,
  ctx: TenantContext,
  input: { displayName: string; ownerUserId: string },
): Promise<User> {
  let user: User | undefined;
  await assert.doesNotReject(async () => {
    user = await withTenantTx(db.appPool, ctx, (tx) => createServiceAccount(tx, ctx, input));
  });
  assert.ok(user !== undefined, "createServiceAccount resolves");
  return user;
}

function getHeaders(actor: Session): Record<string, string> {
  return { cookie: actor.cookie };
}

function writeHeaders(actor: Session): Record<string, string> {
  return {
    cookie: actor.cookie,
    "x-csrf-token": actor.csrfToken,
    "content-type": "application/json",
  };
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

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-32b7b36c users are listed paged filtered and read by id", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, clock } = harness;
    const carol = await session(db, a, "carol", clock);
    const ann = await session(db, a, "ann", clock);
    const bob = await session(db, a, "bob", clock);
    const cat = await session(db, a, "cat", clock);
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: ann.userId,
    });

    const first = await server.inject({
      method: "GET",
      url: "/api/v1/users?limit=2",
      headers: getHeaders(carol),
    });
    assert.equal(first.statusCode, 200);
    const firstPage = first.json() as PageBody<AccountBody>;
    assert.equal(firstPage.items.length, 2, "the first page holds two users");
    assert.equal(typeof firstPage.next_cursor, "string", "the first page carries a cursor");

    const second = await server.inject({
      method: "GET",
      url: `/api/v1/users?limit=2&cursor=${encodeURIComponent(firstPage.next_cursor ?? "")}`,
      headers: getHeaders(carol),
    });
    assert.equal(second.statusCode, 200);
    const secondPage = second.json() as PageBody<AccountBody>;
    assert.equal(secondPage.items.length, 2, "the second page holds two users");
    assert.equal(secondPage.next_cursor, null, "the second page ends the list");

    const all = [...firstPage.items, ...secondPage.items];
    const expectedIds = [ann.userId, bob.userId, cat.userId, carol.userId].sort();
    assert.deepEqual(
      all.map((item) => item.userId),
      expectedIds,
      "the pages hold every human once in userId order",
    );
    assert.ok(
      all.every((item) => item.kind === "human"),
      "service accounts are not listed as users",
    );

    const itemKeys = [
      "displayName",
      "email",
      "kind",
      "localRoles",
      "ownerUserId",
      "roles",
      "state",
      "teams",
      "userId",
    ];
    for (const item of all) {
      assert.deepEqual(Object.keys(item).sort(), itemKeys, "the item has exactly the account fields");
      assert.equal(item.ownerUserId, null, "a human has no owner");
      assert.deepEqual(item.roles, [], "a plain human holds no roles");
      assert.deepEqual(item.teams, [], "a plain human holds no teams");
      assert.deepEqual(item.localRoles, [], "a plain human holds no local roles");
    }

    const disabled = await server.inject({
      method: "GET",
      url: "/api/v1/users?state=disabled",
      headers: getHeaders(carol),
    });
    assert.equal(disabled.statusCode, 200);
    assert.deepEqual(disabled.json(), { items: [], next_cursor: null });

    const zero = await server.inject({
      method: "GET",
      url: "/api/v1/users?limit=0",
      headers: getHeaders(carol),
    });
    assert.equal(zero.statusCode, 400);
    assert.equal(errorOf(zero).code, "VALIDATION_FAILED");

    const readAnn = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}`,
      headers: getHeaders(carol),
    });
    assert.equal(readAnn.statusCode, 200);
    assert.equal((readAnn.json() as AccountBody).userId, ann.userId);

    const readService = await server.inject({
      method: "GET",
      url: `/api/v1/users/${service.userId}`,
      headers: getHeaders(carol),
    });
    assert.equal(readService.statusCode, 404);
    assert.equal(errorOf(readService).code, "NOT_FOUND");

    const readUnknown = await server.inject({
      method: "GET",
      url: "/api/v1/users/nobody",
      headers: getHeaders(carol),
    });
    assert.equal(readUnknown.statusCode, 404);
    assert.equal(errorOf(readUnknown).code, "NOT_FOUND");

    const readBadId = await server.inject({
      method: "GET",
      url: "/api/v1/users/bad%20id",
      headers: getHeaders(carol),
    });
    assert.equal(readBadId.statusCode, 400);
    assert.equal(errorOf(readBadId).code, "VALIDATION_FAILED");
  } finally {
    await closeHarness(harness);
  }
});

test("C-c6c6a2a5 accounts carry roles teams and local roles across states", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b, clock } = harness;
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const carol = await session(db, a, "carol", clock);
    const ann = await session(db, a, "ann", clock);
    const bob = await session(db, a, "bob", clock);

    await withTenantTx(db.appPool, a, async (tx) => {
      await createTeam(tx, a, { teamId: "finance" }, OPERATOR);
      await setGroupMapping(
        tx,
        a,
        { issuer: ISS, group: "ursitoare-approvers", roleId: "approver" },
        OPERATOR,
      );
      await setGroupMapping(
        tx,
        a,
        { issuer: ISS, group: "ursitoare-finance", teamId: "finance" },
        OPERATOR,
      );
      await grantRole(tx, a, { userId: ann.userId, roleId: "author" }, OPERATOR);
      await syncMemberships(tx, a, ann.userId, {
        issuer: ISS,
        groups: ["ursitoare-approvers", "ursitoare-finance"],
      });
    });

    const patched = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${ann.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(patched.statusCode, 200);
    assert.equal((patched.json() as AccountBody).state, "disabled");

    const listed = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: getHeaders(carol),
    });
    assert.equal(listed.statusCode, 200);
    const list = listed.json() as PageBody<AccountBody>;
    const annItem = list.items.find((item) => item.userId === ann.userId);
    assert.ok(annItem !== undefined, "ann is in the list");
    assert.equal(annItem.state, "disabled");
    assert.deepEqual(annItem.roles, ["approver", "author"]);
    assert.deepEqual(annItem.teams, ["finance"]);
    assert.deepEqual(annItem.localRoles, ["author"]);
    const bobItem = list.items.find((item) => item.userId === bob.userId);
    assert.ok(bobItem !== undefined, "bob is in the list");
    assert.deepEqual(bobItem.roles, []);
    assert.deepEqual(bobItem.teams, []);
    assert.deepEqual(bobItem.localRoles, []);

    const read = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}`,
      headers: getHeaders(carol),
    });
    assert.equal(read.statusCode, 200);
    const readAnn = read.json() as AccountBody;
    assert.equal(readAnn.state, "disabled");
    assert.deepEqual(readAnn.roles, ["approver", "author"]);
    assert.deepEqual(readAnn.teams, ["finance"]);
    assert.deepEqual(readAnn.localRoles, ["author"]);

    const zed = await session(db, b, "zed", clock);
    const bList = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: getHeaders(zed),
    });
    assert.equal(bList.statusCode, 200);
    const bUsers = (bList.json() as PageBody<AccountBody>).items.map((item) => item.userId);
    assert.deepEqual(bUsers, [zed.userId], "tenant B sees only its own user");
    assert.ok(
      !bUsers.includes(ann.userId) && !bUsers.includes(bob.userId),
      "tenant B sees none of tenant A's rows",
    );
  } finally {
    await closeHarness(harness);
  }
});

test("C-9733f98e users are disabled and enabled with suspended then restored sessions", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, clock } = harness;
    const carol = await session(db, a, "carol", clock);
    const bob = await session(db, a, "bob", clock);
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: carol.userId,
    });

    const disabledOnce = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${bob.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(disabledOnce.statusCode, 200);
    assert.equal((disabledOnce.json() as AccountBody).state, "disabled");

    const disabledTwice = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${bob.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(disabledTwice.statusCode, 200);
    assert.equal((disabledTwice.json() as AccountBody).state, "disabled");

    const selfDisable = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${carol.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(selfDisable.statusCode, 422);
    const refusal = errorOf(selfDisable);
    assert.equal(refusal.code, "OPERATION_REFUSED");
    assert.deepEqual(refusal.details, { reason: "self_disable" });

    const carolRead = await server.inject({
      method: "GET",
      url: `/api/v1/users/${carol.userId}`,
      headers: getHeaders(carol),
    });
    assert.equal(carolRead.statusCode, 200);
    assert.equal((carolRead.json() as AccountBody).state, "active");

    const badState = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${bob.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "deleted" }),
    });
    assert.equal(badState.statusCode, 400);
    assert.equal(errorOf(badState).code, "VALIDATION_FAILED");

    const suspended = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: getHeaders(bob),
    });
    assert.equal(suspended.statusCode, 401);
    assert.equal(errorOf(suspended).code, "UNAUTHENTICATED");

    const enabled = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${bob.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "active" }),
    });
    assert.equal(enabled.statusCode, 200);
    assert.equal((enabled.json() as AccountBody).state, "active");

    const restored = await server.inject({
      method: "GET",
      url: "/api/v1/users",
      headers: getHeaders(bob),
    });
    assert.equal(restored.statusCode, 200, "bob's same session works again");

    const wrongKind = await server.inject({
      method: "PATCH",
      url: `/api/v1/users/${service.userId}`,
      headers: writeHeaders(carol),
      payload: JSON.stringify({ state: "disabled" }),
    });
    assert.equal(wrongKind.statusCode, 404);
    assert.equal(errorOf(wrongKind).code, "NOT_FOUND");

    const changes = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.user_state_changed",
    );
    assert.equal(changes.length, 2, "one event per real change");
    assert.deepEqual(changes[0]?.target, { kind: "user", id: bob.userId });
    assert.deepEqual(changes[0]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(changes[0]?.payload, { from: "active", to: "disabled", kind: "human" });
    assert.deepEqual(changes[1]?.target, { kind: "user", id: bob.userId });
    assert.deepEqual(changes[1]?.actor, { kind: "user", id: carol.userId });
    assert.deepEqual(changes[1]?.payload, { from: "disabled", to: "active", kind: "human" });
  } finally {
    await closeHarness(harness);
  }
});

test("C-802ffb44 idp links are listed and added idempotently", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, clock } = harness;
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const ann = await signIn(db, a, ISS, "sub-ann", T09);
    const carol = await session(db, a, "carol", clock);

    const first = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: getHeaders(carol),
    });
    assert.equal(first.statusCode, 200);
    const firstPage = first.json() as PageBody<IdpLinkBody>;
    assert.deepEqual(firstPage, {
      items: [{ issuer: ISS, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" }],
      next_cursor: null,
    });

    const created = await server.inject({
      method: "POST",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: { ...writeHeaders(carol), "idempotency-key": "k1" },
      payload: JSON.stringify({ issuer: ISS, subject: "sub-ann-2" }),
    });
    assert.equal(created.statusCode, 201);
    const createdLink = created.json() as IdpLinkBody;
    assert.deepEqual(createdLink, {
      issuer: ISS,
      subject: "sub-ann-2",
      linkedAt: "2026-10-25T09:00:00.000000Z",
    });

    const replayed = await server.inject({
      method: "POST",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: { ...writeHeaders(carol), "idempotency-key": "k1" },
      payload: JSON.stringify({ issuer: ISS, subject: "sub-ann-2" }),
    });
    assert.equal(replayed.statusCode, 201);
    assert.deepEqual(replayed.json(), createdLink);
    assert.equal(replayed.headers["idempotent-replayed"], "true");

    const last = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: getHeaders(carol),
    });
    assert.equal(last.statusCode, 200);
    assert.deepEqual((last.json() as PageBody<IdpLinkBody>).items, [
      { issuer: ISS, subject: "sub-ann", linkedAt: "2026-10-25T09:00:00.000000Z" },
      createdLink,
    ]);

    const events = (await auditIn(db, a)).filter(
      (row) => row.event_type === "identity.idp_linked",
    );
    assert.equal(events.length, 1, "only the added link is audited");
    assert.deepEqual(events[0]?.target, { kind: "user", id: ann.userId });
    assert.deepEqual(events[0]?.payload, { issuer: ISS, subject: "sub-ann-2" });
  } finally {
    await closeHarness(harness);
  }
});

test("C-a63083c0 idp link refusals link nothing", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, clock } = harness;
    await provisionTenantIdp(db.ownerPool, a, { issuer: ISS, organization: "org-a" });
    const ann = await signIn(db, a, ISS, "sub-ann", T08);
    await signIn(db, a, ISS, "sub-bob", T08);
    const carol = await session(db, a, "carol", clock);
    const service = await makeServiceAccount(db, a, {
      displayName: "Nightly bot",
      ownerUserId: carol.userId,
    });

    async function post(
      userId: string,
      input: { issuer: string; subject: string },
      key: string,
    ) {
      return server.inject({
        method: "POST",
        url: `/api/v1/users/${userId}/idp-links`,
        headers: { ...writeHeaders(carol), "idempotency-key": key },
        payload: JSON.stringify(input),
      });
    }

    const held = await post(ann.userId, { issuer: ISS, subject: "sub-ann" }, "k-again");
    assert.equal(held.statusCode, 409);
    assert.equal(errorOf(held).code, "ALREADY_EXISTS");

    const otherHuman = await post(ann.userId, { issuer: ISS, subject: "sub-bob" }, "k-bob");
    assert.equal(otherHuman.statusCode, 409);
    assert.equal(errorOf(otherHuman).code, "ALREADY_EXISTS");

    const unrouted = await post(
      ann.userId,
      { issuer: UNROUTED, subject: "sub-new" },
      "k-unrouted",
    );
    assert.equal(unrouted.statusCode, 422);
    assert.equal(errorOf(unrouted).code, "UNKNOWN_ISSUER");

    const padded = await post(ann.userId, { issuer: ISS, subject: " x" }, "k-padded");
    assert.equal(padded.statusCode, 400);
    assert.equal(errorOf(padded).code, "VALIDATION_FAILED");

    const wrongKind = await post(
      service.userId,
      { issuer: ISS, subject: "sub-svc" },
      "k-service",
    );
    assert.equal(wrongKind.statusCode, 422);
    const wrongKindError = errorOf(wrongKind);
    assert.equal(wrongKindError.code, "OPERATION_REFUSED");
    assert.deepEqual(wrongKindError.details, { reason: "wrong_kind" });

    const unknown = await post("ghost", { issuer: ISS, subject: "sub-ghost" }, "k-ghost");
    assert.equal(unknown.statusCode, 404);
    assert.equal(errorOf(unknown).code, "NOT_FOUND");

    const serviceLinks = await server.inject({
      method: "GET",
      url: `/api/v1/users/${service.userId}/idp-links`,
      headers: getHeaders(carol),
    });
    assert.equal(serviceLinks.statusCode, 404);
    assert.equal(errorOf(serviceLinks).code, "NOT_FOUND");

    const links = await server.inject({
      method: "GET",
      url: `/api/v1/users/${ann.userId}/idp-links`,
      headers: getHeaders(carol),
    });
    assert.equal(links.statusCode, 200);
    assert.deepEqual((links.json() as PageBody<IdpLinkBody>).items, [
      { issuer: ISS, subject: "sub-ann", linkedAt: "2026-10-25T08:00:00.000000Z" },
    ]);
  } finally {
    await closeHarness(harness);
  }
});
