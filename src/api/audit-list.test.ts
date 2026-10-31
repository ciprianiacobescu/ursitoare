import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { AuditEventInput, KeyMaterial } from "../audit/index.ts";
import { appendAuditCommitted } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
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
import { registerAuditRoutes } from "./audit-routes.ts";
import type { AuditApiDeps } from "./audit-routes.ts";
import { deriveCursorKey, encodeCursor } from "./cursor.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerAuditRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const UTC_EXAMPLE = "must be a UTC time such as 2026-10-25T09:00:00Z";
const SHORT_KEY = `${"zq".repeat(15)}x`;
const KEY: KeyMaterial = { reveal: () => "k".repeat(64) };

const engineDirs: string[] = [];

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface AuditItem {
  seq: string;
  at: string;
  eventType: string;
  actor: unknown;
  target: unknown;
  payload: Record<string, unknown>;
  origin: "ursitoare" | "mintkey";
  mk: { traceId: string | null; requestId: string | null; jti: string | null } | null;
  prevHash: string;
  hash: string;
}

interface PageBody<T> {
  items: T[];
  next_cursor: string | null;
}

interface ErrorBody {
  error: { code: string; message: string; details?: unknown };
}

interface ErrorField {
  field?: string;
  message?: string;
}

interface HarnessOptions {
  restricted?: boolean;
  engineKey?: KeyMaterial | null;
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  key: KeyMaterial | null;
  alice: Session;
  mallory: Session;
}

const FIVE_EVENTS: readonly AuditEventInput[] = [
  {
    eventType: "role.granted",
    actor: { kind: "user", id: "u_1" },
    target: { kind: "role", id: "r_1" },
  },
  {
    eventType: "role.revoked",
    actor: { kind: "user", id: "u_1" },
    target: { kind: "role", id: "r_1" },
  },
  {
    eventType: "role.granted",
    actor: { kind: "user", id: "u_2" },
    target: { kind: "role", id: "r_2" },
  },
  {
    eventType: "team.created",
    actor: { kind: "user", id: "u_2" },
    target: { kind: "team", id: "t_1" },
  },
  {
    eventType: "role.granted",
    actor: { kind: "user", id: "u_1" },
    target: { kind: "role", id: "r_2" },
  },
];

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function makeServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
}

async function makeEngine(clock: Clock, restricted: boolean): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-audit-list-src-"));
  engineDirs.push(srcDir);
  return createPolicyEngine({
    srcDir,
    tenantPolicies: restricted
      ? [
          {
            id: "t-flow",
            layer: "tenant",
            text: '@id("t-flow") permit (principal, action == Action::"read_flow", resource);',
          },
        ]
      : [
          {
            id: "t-all",
            layer: "tenant",
            text: '@id("t-all") permit (principal, action, resource);',
          },
        ],
    clock,
    ids: sequentialIds(restricted ? 1000 : 200),
    logger: silentLogger(),
  });
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

async function createHarness(options: HarnessOptions = {}): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(T0);
  const engine = await makeEngine(clock, options.restricted === true);
  const server = await makeServer();
  const engineKey = options.engineKey === undefined ? KEY : options.engineKey;

  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");

  const deps: AuditApiDeps = { pool: db.appPool, clock, engineKey };
  assert.doesNotThrow(() => {
    registerAuditRoutes(server, deps);
  }, "registerAuditRoutes");

  const alice = await session(db, a, "alice", clock);
  const mallory = await session(db, b, "mallory", clock);

  return { db, server, a, b, clock, key: engineKey, alice, mallory };
}

async function closeHarness(harness: Harness): Promise<void> {
  await harness.server.close();
  await harness.db.close();
}

async function appendAt(
  db: TestDatabase,
  ctx: TenantContext,
  seq: number,
  event: AuditEventInput,
): Promise<string> {
  const result = await appendAuditCommitted(db.appPool, ctx, event, {
    clock: fixedClock(`2026-10-25T09:00:0${String(seq)}.000Z`),
  });
  return result.hash;
}

async function fiveEvents(db: TestDatabase, ctx: TenantContext): Promise<string[]> {
  const hashes: string[] = [];
  for (let index = 0; index < FIVE_EVENTS.length; index += 1) {
    const event = FIVE_EVENTS[index];
    assert.ok(event !== undefined, "fixture event exists");
    hashes.push(await appendAt(db, ctx, index + 1, event));
  }
  return hashes;
}

function nth<T>(values: readonly T[], index: number): T {
  const value = values[index];
  assert.ok(value !== undefined, `fixture value ${index} exists`);
  return value;
}

async function get(
  server: FastifyInstance,
  url: string,
  headers: Record<string, string> = {},
) {
  return server.inject({ method: "GET", url, headers });
}

function pageOf(response: { json: () => unknown }): PageBody<AuditItem> {
  return response.json() as PageBody<AuditItem>;
}

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

function firstField(response: { json: () => unknown }): ErrorField {
  const details = errorOf(response).details as { fields?: ErrorField[] } | undefined;
  return details?.fields?.[0] ?? {};
}

function seqs(items: readonly AuditItem[]): string[] {
  return items.map((item) => item.seq);
}

function withCursor(path: string, cursor: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;
}

function tamper(cursor: string): string {
  const last = cursor.slice(-1);
  return `${cursor.slice(0, -1)}${last === "A" ? "B" : "A"}`;
}

function assertCursorInvalid(response: { statusCode: number; json: () => unknown }): void {
  assert.equal(response.statusCode, 400, "the cursor is refused with 400");
  const error = errorOf(response);
  assert.equal(error.code, "CURSOR_INVALID", "the cursor is refused with CURSOR_INVALID");
  assert.equal(error.message, "Cursor is invalid", "the message is the fixed one");
  assert.equal(error.details, undefined, "the refusal carries no details");
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-330a8744 newest first with the full item", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    const hashes = await fiveEvents(db, a);

    const response = await get(server, "/api/v1/audit?limit=2", { cookie: alice.cookie });
    assert.equal(response.statusCode, 200, "the list answers 200");
    const page = pageOf(response);
    assert.deepEqual(seqs(page.items), ["5", "4"], "the newest page holds seq 5 then 4");
    assert.equal(typeof page.next_cursor, "string", "the page carries a next cursor");
    assert.notEqual(page.next_cursor, "", "the next cursor is not empty");

    assert.deepEqual(page.items[0], {
      seq: "5",
      at: "2026-10-25T09:00:05.000000Z",
      eventType: "role.granted",
      actor: { kind: "user", id: "u_1" },
      target: { kind: "role", id: "r_2" },
      payload: {},
      origin: "ursitoare",
      mk: null,
      prevHash: nth(hashes, 3),
      hash: nth(hashes, 4),
    });
  } finally {
    await closeHarness(harness);
  }
});

test("C-ddc14b4a a full walk in both directions with after_seq", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await fiveEvents(db, a);
    const headers = { cookie: alice.cookie };

    const first = await get(server, "/api/v1/audit?limit=2", headers);
    assert.equal(first.statusCode, 200);
    const firstPage = pageOf(first);
    assert.deepEqual(seqs(firstPage.items), ["5", "4"], "the first page is 5 then 4");
    assert.equal(typeof firstPage.next_cursor, "string", "the first page has a cursor");

    const second = await get(server, withCursor("/api/v1/audit?limit=2", firstPage.next_cursor ?? ""), headers);
    assert.equal(second.statusCode, 200);
    const secondPage = pageOf(second);
    assert.deepEqual(seqs(secondPage.items), ["3", "2"], "the second page is 3 then 2");
    assert.equal(typeof secondPage.next_cursor, "string", "the second page has a cursor");

    const third = await get(server, withCursor("/api/v1/audit?limit=2", secondPage.next_cursor ?? ""), headers);
    assert.equal(third.statusCode, 200);
    const thirdPage = pageOf(third);
    assert.deepEqual(seqs(thirdPage.items), ["1"], "the last page is 1");
    assert.equal(thirdPage.next_cursor, null, "the last page ends the walk");

    const ascending = await get(server, "/api/v1/audit?order=asc&limit=2", headers);
    assert.equal(ascending.statusCode, 200);
    assert.deepEqual(seqs(pageOf(ascending).items), ["1", "2"], "ascending starts at the oldest");

    const ascendingAfter = await get(server, "/api/v1/audit?order=asc&after_seq=3", headers);
    assert.equal(ascendingAfter.statusCode, 200);
    assert.deepEqual(seqs(pageOf(ascendingAfter).items), ["4", "5"], "ascending after 3 is 4 then 5");

    const afterTip = await get(server, "/api/v1/audit?after_seq=5", headers);
    assert.equal(afterTip.statusCode, 200);
    assert.deepEqual(afterTip.json(), { items: [], next_cursor: null }, "nothing follows seq 5");
  } finally {
    await closeHarness(harness);
  }
});

test("C-2630a7e0 free-form payload and a Mintkey event survive", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await fiveEvents(db, a);
    await appendAt(db, a, 6, {
      eventType: "sink.received",
      actor: { kind: "system", id: "sys" },
      origin: "mintkey",
      mk: { traceId: "t1", requestId: "r1", jti: "j1" },
    });
    await appendAt(db, a, 7, {
      eventType: "note.added",
      actor: { kind: "system", id: "sys" },
      payload: { n: { deep: [1, "x"] }, ok: true },
    });

    const response = await get(server, "/api/v1/audit?limit=50", { cookie: alice.cookie });
    assert.equal(response.statusCode, 200);
    const page = pageOf(response);
    assert.deepEqual(seqs(page.items), ["7", "6", "5", "4", "3", "2", "1"]);

    const newest = page.items[0];
    const mintkey = page.items[1];
    assert.ok(newest !== undefined, "the newest event is present");
    assert.ok(mintkey !== undefined, "the Mintkey event is present");
    assert.equal(newest.eventType, "note.added");
    assert.deepEqual(newest.payload, { n: { deep: [1, "x"] }, ok: true });
    assert.equal(newest.mk, null);
    assert.equal(mintkey.eventType, "sink.received");
    assert.equal(mintkey.origin, "mintkey");
    assert.deepEqual(mintkey.mk, { traceId: "t1", requestId: "r1", jti: "j1" });
    for (const item of page.items.slice(2)) {
      assert.equal(item.mk, null, `seq ${item.seq} has no Mintkey fields`);
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-dfa2a3a0 each filter and a combination", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await fiveEvents(db, a);
    const headers = { cookie: alice.cookie };

    const cases: { url: string; expected: string[] }[] = [
      { url: "/api/v1/audit?event_type=role.granted", expected: ["5", "3", "1"] },
      { url: "/api/v1/audit?actor_id=u_2", expected: ["4", "3"] },
      { url: "/api/v1/audit?target_kind=role&target_id=r_2", expected: ["5", "3"] },
      {
        url: "/api/v1/audit?from=2026-10-25T09:00:02Z&to=2026-10-25T09:00:04Z",
        expected: ["3", "2"],
      },
      { url: "/api/v1/audit?event_type=role.granted&actor_id=u_1", expected: ["5", "1"] },
      { url: "/api/v1/audit?from=2026-10-25T09:00:04.000000Z", expected: ["5", "4"] },
    ];

    for (const entry of cases) {
      const response = await get(server, entry.url, headers);
      assert.equal(response.statusCode, 200, `${entry.url} answers 200`);
      assert.deepEqual(seqs(pageOf(response).items), entry.expected, `${entry.url} filters exactly`);
    }

    const empty = await get(server, "/api/v1/audit?event_type=team.deleted", headers);
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), { items: [], next_cursor: null }, "no match is an empty page");
  } finally {
    await closeHarness(harness);
  }
});

test("C-a17dc1c2 refused values through the server", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await fiveEvents(db, a);
    const headers = { cookie: alice.cookie };

    const cases: { url: string; field: string; message?: string }[] = [
      { url: "/api/v1/audit?limit=0", field: "querystring/limit" },
      { url: "/api/v1/audit?event_type=Role", field: "querystring/event_type" },
      {
        url: `/api/v1/audit?event_type=${encodeURIComponent("x' OR '1'='1")}`,
        field: "querystring/event_type",
      },
      { url: "/api/v1/audit?actor_id=", field: "querystring/actor_id" },
      { url: "/api/v1/audit?after_seq=-1", field: "querystring/after_seq" },
      {
        url: "/api/v1/audit?after_seq=9223372036854775808",
        field: "querystring/after_seq",
      },
      {
        url: "/api/v1/audit?from=2026-02-30T00:00:00Z",
        field: "querystring/from",
        message: UTC_EXAMPLE,
      },
      {
        url: "/api/v1/audit?from=2026-10-25",
        field: "querystring/from",
        message: UTC_EXAMPLE,
      },
      {
        url: "/api/v1/audit?from=2026-10-25T09:00:00.1Z",
        field: "querystring/from",
        message: UTC_EXAMPLE,
      },
      {
        url: "/api/v1/audit?from=2026-10-25T09:00:00Z&to=2026-10-25T09:00:00Z",
        field: "querystring/to",
      },
      { url: "/api/v1/audit?order=up", field: "querystring/order" },
      { url: "/api/v1/audit?tenant_id=tenant_b", field: "querystring/tenant_id" },
      { url: "/api/v1/audit?event_type=a&event_type=b", field: "querystring/event_type" },
    ];

    for (const entry of cases) {
      const response = await get(server, entry.url, headers);
      assert.equal(response.statusCode, 400, `${entry.url} answers 400`);
      const error = errorOf(response);
      assert.equal(error.code, "VALIDATION_FAILED", `${entry.url} is a validation failure`);
      const field = firstField(response);
      assert.equal(field.field, entry.field, `${entry.url} names ${entry.field} first`);
      if (entry.message !== undefined) {
        assert.equal(field.message, entry.message, `${entry.url} carries the fixed message`);
      }
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-7141a311 refused cursors", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice, key } = harness;
    await fiveEvents(db, a);
    assert.ok(key !== null, "the harness carries an engine key");
    const headers = { cookie: alice.cookie };

    const first = await get(server, "/api/v1/audit?limit=2", headers);
    assert.equal(first.statusCode, 200);
    const realCursor = pageOf(first).next_cursor;
    assert.equal(typeof realCursor, "string", "the fixture produced a real cursor");

    const cursorKey = deriveCursorKey(key);
    const foreignList = encodeCursor(cursorKey, {
      tenantId: "tenant_a",
      scope: "decisions.desc",
      position: ["2026-10-25T08:00:04.000000Z", "d_4"],
    });
    const wrongOrder = encodeCursor(cursorKey, {
      tenantId: "tenant_a",
      scope: "audit.asc",
      position: ["1"],
    });
    const foreignTenant = encodeCursor(cursorKey, {
      tenantId: "tenant_b",
      scope: "audit.desc",
      position: ["1"],
    });
    const wrongPositions = [
      encodeCursor(cursorKey, { tenantId: "tenant_a", scope: "audit.desc", position: ["abc"] }),
      encodeCursor(cursorKey, {
        tenantId: "tenant_a",
        scope: "audit.desc",
        position: ["9223372036854775808"],
      }),
      encodeCursor(cursorKey, {
        tenantId: "tenant_a",
        scope: "audit.desc",
        position: ["1", "2"],
      }),
    ];

    const cursors = [
      tamper(realCursor ?? ""),
      foreignList,
      wrongOrder,
      foreignTenant,
      ...wrongPositions,
    ];
    for (const cursor of cursors) {
      assertCursorInvalid(await get(server, withCursor("/api/v1/audit", cursor), headers));
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-26fdf915 no engine key serves one page and a short key throws", async () => {
  const harness = await createHarness({ engineKey: null });
  try {
    const { db, server, a, alice } = harness;
    await fiveEvents(db, a);
    const headers = { cookie: alice.cookie };

    const full = await get(server, "/api/v1/audit?limit=50", headers);
    assert.equal(full.statusCode, 200, "a list that fits one page is served");
    const fullPage = pageOf(full);
    assert.equal(fullPage.items.length, 5, "the page holds all five events");
    assert.equal(fullPage.next_cursor, null, "a single page has no cursor");

    for (const url of ["/api/v1/audit?limit=2", "/api/v1/audit?cursor=abc"]) {
      const response = await get(server, url, headers);
      assert.equal(response.statusCode, 503, `${url} needs the engine key`);
      const error = errorOf(response);
      assert.equal(error.code, "ENGINE_KEY_REQUIRED");
      assert.equal(error.message, "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)");
    }
  } finally {
    await closeHarness(harness);
  }

  const server = await makeServer();
  try {
    const deps: AuditApiDeps = {
      pool: null,
      clock: fixedClock(T0),
      engineKey: { reveal: () => SHORT_KEY },
    };
    assert.throws(
      () => {
        registerAuditRoutes(server, deps);
      },
      (error: unknown) =>
        error instanceof RangeError && !error.message.includes(SHORT_KEY),
      "a short engine key throws a RangeError that does not reveal it",
    );
  } finally {
    await server.close();
  }
});

test("C-abef4e43 the audit route needs a session and read_audit", async () => {
  const harness = await createHarness({ restricted: true });
  try {
    const { db, server, a, alice } = harness;

    const anonymous = await get(server, "/api/v1/audit");
    assert.equal(anonymous.statusCode, 401, "no cookie is unauthenticated");
    assert.equal(errorOf(anonymous).code, "UNAUTHENTICATED");

    const forbidden = await get(server, "/api/v1/audit", { cookie: alice.cookie });
    assert.equal(forbidden.statusCode, 403, "a policy without read_audit forbids the call");
    const error = errorOf(forbidden);
    assert.equal(error.code, "FORBIDDEN");
    const details = error.details as { decisionId?: unknown } | undefined;
    assert.equal(typeof details?.decisionId, "string", "the refusal names its decision id");
    const decisionId = details?.decisionId as string;

    const decision = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ action: string; decision: string }>(
        "SELECT action, decision FROM ursitoare.policy_decision WHERE tenant_id = $1 AND decision_id = $2",
        [a.tenantId, decisionId],
      );
      return result.rows[0];
    });
    assert.ok(decision !== undefined, "the refusal recorded a decision");
    assert.equal(decision.action, "read_audit");
    assert.equal(decision.decision, "deny");

    const events = await withTenantTx(db.appPool, a, async (tx) => {
      const result = await tx.query<{ event_type: string; target: unknown }>(
        "SELECT event_type, target FROM ursitoare.audit_event WHERE tenant_id = $1 ORDER BY seq",
        [a.tenantId],
      );
      return result.rows;
    });
    const denied = events.find((event) => event.event_type === "authz.denied");
    assert.ok(denied !== undefined, "the refusal appended an authz.denied event");
    assert.deepEqual(denied.target, { kind: "action", id: "read_audit" });
  } finally {
    await closeHarness(harness);
  }
});

test("C-2b77706e another tenant's caller sees only its own rows", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b, alice, mallory } = harness;
    await fiveEvents(db, a);
    await appendAt(db, b, 1, {
      eventType: "role.granted",
      actor: { kind: "user", id: "m_1" },
      target: { kind: "role", id: "r_9" },
    });
    await appendAt(db, b, 2, {
      eventType: "role.granted",
      actor: { kind: "user", id: "m_1" },
      target: { kind: "role", id: "r_9" },
    });

    for (const headers of [
      { cookie: mallory.cookie },
      { cookie: mallory.cookie, "x-tenant-id": "tenant_a" },
    ]) {
      const response = await get(server, "/api/v1/audit?limit=50", headers);
      assert.equal(response.statusCode, 200, "tenant B reads its own list");
      assert.equal(response.headers["cache-control"], "no-store", "the list is not cached");
      const page = pageOf(response);
      assert.deepEqual(seqs(page.items), ["2", "1"], "only tenant B's two events are listed");
      assert.equal(page.next_cursor, null);
    }

    const spoofed = await get(server, "/api/v1/audit?tenant_id=tenant_a", {
      cookie: mallory.cookie,
    });
    assert.equal(spoofed.statusCode, 400, "a tenant query parameter is refused");
    assert.equal(errorOf(spoofed).code, "VALIDATION_FAILED");
    assert.equal(firstField(spoofed).field, "querystring/tenant_id");

    const aliceList = await get(server, "/api/v1/audit?limit=50", { cookie: alice.cookie });
    assert.equal(aliceList.statusCode, 200);
    assert.equal(pageOf(aliceList).items.length, 5, "tenant A still sees its five events");
  } finally {
    await closeHarness(harness);
  }
});
