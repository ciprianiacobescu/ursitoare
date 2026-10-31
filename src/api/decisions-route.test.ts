import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { appendAuditCommitted } from "../audit/index.ts";
import type { KeyMaterial } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, recordDecision } from "../pdp/index.ts";
import type { Decision, PolicyEngine, PolicyRequest } from "../pdp/index.ts";
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
const ROUTE = "/api/v1/policy-decisions";
const KEY: KeyMaterial = { reveal: () => "k".repeat(64) };

const POLICY_SET_VERSION = "b".repeat(64);
const AT_4 = "2026-10-25T08:00:04.000000Z";
const OWN_AT = "2026-10-25T09:00:00.000000Z";

const PERMIT = {
  method: "GET",
  host: "tool.test",
  path: "/x",
  bodyDigest: "a".repeat(64),
  serviceId: "svc_1",
  ttlSeconds: 30,
} as const;

const engineDirs: string[] = [];

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface DecisionItem {
  decisionId: string;
  decidedAt: string;
  runId: string | null;
  nodeId: string | null;
  action: string;
  principal: string;
  resource: string;
  decision: string;
  reasons: string[];
  errors: string[];
  policySetVersion: string;
  requestDigest: string;
  permit: Record<string, unknown> | null;
}

interface PageBody {
  items: DecisionItem[];
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

function requestFor(action: string, principalId: string, tenantId: string): PolicyRequest {
  return {
    principal: { type: "User", id: principalId },
    action,
    resource: { type: "Tenant", id: tenantId },
    context: {},
    entities: [],
  };
}

function invokeToolRequest(): PolicyRequest {
  return requestFor("invoke_tool", "tenant_a/u_1", "tenant_a");
}

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
  const srcDir = await mkdtemp(join(tmpdir(), "api-decisions-src-"));
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

async function record(
  db: TestDatabase,
  ctx: TenantContext,
  decision: Decision,
  req: PolicyRequest,
  extra?: { runId?: string; nodeId?: string },
): Promise<void> {
  const recorded = await withTenantTx(db.appPool, ctx, (tx) =>
    recordDecision(tx, ctx, decision, req, extra),
  );
  assert.equal(recorded, true, `decision ${decision.decisionId} was recorded`);
}

async function seedDecisions(db: TestDatabase, a: TenantContext): Promise<void> {
  await record(db, a, {
    decision: "deny",
    decisionId: "d_1",
    decidedAt: "2026-10-25T08:00:01.000Z",
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
  }, requestFor("start_run", "tenant_a/u_9", "tenant_a"));
  await record(db, a, {
    decision: "allow",
    decisionId: "d_2",
    decidedAt: "2026-10-25T08:00:02.000Z",
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
  }, requestFor("read_flow", "tenant_a/u_1", "tenant_a"), { runId: "run_1" });
  await record(db, a, {
    decision: "allow",
    decisionId: "d_3",
    decidedAt: "2026-10-25T08:00:02.000Z",
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
  }, requestFor("read_flow", "tenant_a/u_1", "tenant_a"));
  await record(db, a, {
    decision: "allow",
    decisionId: "d_4",
    decidedAt: "2026-10-25T08:00:04.000Z",
    reasons: [],
    errors: [],
    policySetVersion: POLICY_SET_VERSION,
    permit: { ...PERMIT },
  }, invokeToolRequest(), { runId: "run_1", nodeId: "n_1" });
}

async function appendAt(
  db: TestDatabase,
  ctx: TenantContext,
  at: string,
): Promise<void> {
  await appendAuditCommitted(db.appPool, ctx, {
    eventType: "role.granted",
    actor: { kind: "user", id: "u_1" },
    target: { kind: "role", id: "r_1" },
  }, { clock: fixedClock(at) });
}

async function get(
  server: FastifyInstance,
  url: string,
  headers: Record<string, string> = {},
) {
  return server.inject({ method: "GET", url, headers });
}

function pageOf(response: { json: () => unknown }): PageBody {
  return response.json() as PageBody;
}

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

function firstField(response: { json: () => unknown }): ErrorField {
  const details = errorOf(response).details as { fields?: ErrorField[] } | undefined;
  return details?.fields?.[0] ?? {};
}

function ids(items: readonly DecisionItem[]): string[] {
  return items.map((item) => item.decisionId);
}

function withCursor(path: string, cursor: string): string {
  return `${path}${path.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;
}

function tamper(cursor: string): string {
  const last = cursor.slice(-1);
  return `${cursor.slice(0, -1)}${last === "A" ? "B" : "A"}`;
}

async function walkAll(
  server: FastifyInstance,
  path: string,
  headers: Record<string, string>,
): Promise<DecisionItem[]> {
  const items: DecisionItem[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 12; page += 1) {
    const url: string = cursor === null ? path : withCursor(path, cursor);
    const response = await get(server, url, headers);
    assert.equal(response.statusCode, 200, `${url} answers 200`);
    const body = pageOf(response);
    items.push(...body.items);
    if (body.next_cursor === null) {
      return items;
    }
    cursor = body.next_cursor;
  }
  assert.fail("the walk did not terminate within twelve pages");
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

test("C-590617af newest policy decisions page holds the full item", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await seedDecisions(db, a);

    const response = await get(
      server,
      `${ROUTE}?limit=2&to=2026-10-25T09:00:00Z`,
      { cookie: alice.cookie },
    );
    assert.equal(response.statusCode, 200, "the list answers 200");
    const page = pageOf(response);
    assert.deepEqual(ids(page.items), ["d_4", "d_3"], "the newest page holds d_4 then d_3");
    assert.equal(typeof page.next_cursor, "string", "the page carries a next cursor");
    assert.notEqual(page.next_cursor, "", "the next cursor is not empty");

    const item = page.items[0];
    assert.ok(item !== undefined, "the newest item exists");
    assert.deepEqual(item, {
      decisionId: "d_4",
      decidedAt: AT_4,
      runId: "run_1",
      nodeId: "n_1",
      action: "invoke_tool",
      principal: 'User::"tenant_a/u_1"',
      resource: 'Tenant::"tenant_a"',
      decision: "allow",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
      requestDigest: item.requestDigest,
      permit: { ...PERMIT },
    });
    assert.match(item.policySetVersion, /^[0-9a-f]{64}$/, "policySetVersion is 64 hex");
    assert.match(item.requestDigest, /^[0-9a-f]{64}$/, "requestDigest is 64 hex");
  } finally {
    await closeHarness(harness);
  }
});

test("C-3d923c6a policy decision ties both directions and the call's own row", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await seedDecisions(db, a);
    const headers = { cookie: alice.cookie };

    const descending = await walkAll(server, `${ROUTE}?limit=1&to=2026-10-25T09:00:00Z`, headers);
    assert.deepEqual(ids(descending), ["d_4", "d_3", "d_2", "d_1"], "descending walk is full");

    const ascending = await walkAll(
      server,
      `${ROUTE}?limit=1&order=asc&to=2026-10-25T09:00:00Z`,
      headers,
    );
    assert.deepEqual(ids(ascending), ["d_1", "d_2", "d_3", "d_4"], "ascending walk is full");

    const own = await get(server, `${ROUTE}?limit=1`, headers);
    assert.equal(own.statusCode, 200, "the unfiltered list answers 200");
    const page = pageOf(own);
    const item = page.items[0];
    assert.ok(item !== undefined, "the unfiltered page starts with a row");
    assert.notEqual(item.decisionId, "d_4", "the first row is not the fixture's newest");
    assert.equal(item.action, "read_audit", "the first row is the call's own decision");
    assert.equal(item.decision, "allow", "the call's own row is an allow");
    assert.equal(item.resource, 'Tenant::"tenant_a"', "the call's own row is on the tenant");
    assert.equal(item.decidedAt, OWN_AT, "the call's own row carries the clock's time");
    assert.equal(ids(page.items).filter((id) => id.startsWith("d_")).length, 0, "limit 1 excludes the fixture");
  } finally {
    await closeHarness(harness);
  }
});

test("C-d6210b1c each policy decision filter answers through the route", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await seedDecisions(db, a);
    const headers = { cookie: alice.cookie };

    const cases: { url: string; expected: string[] }[] = [
      { url: `${ROUTE}?decision=deny&to=2026-10-25T09:00:00Z`, expected: ["d_1"] },
      { url: `${ROUTE}?action=read_flow`, expected: ["d_3", "d_2"] },
      { url: `${ROUTE}?run_id=run_1`, expected: ["d_4", "d_2"] },
      { url: `${ROUTE}?decision_id=d_2`, expected: ["d_2"] },
      {
        url: `${ROUTE}?principal=${encodeURIComponent('User::"tenant_a/u_9"')}`,
        expected: ["d_1"],
      },
      {
        url: `${ROUTE}?from=2026-10-25T08:00:02Z&to=2026-10-25T08:00:04Z`,
        expected: ["d_3", "d_2"],
      },
    ];

    for (const entry of cases) {
      const response = await get(server, entry.url, headers);
      assert.equal(response.statusCode, 200, `${entry.url} answers 200`);
      assert.deepEqual(ids(pageOf(response).items), entry.expected, `${entry.url} filters exactly`);
    }

    const refusals: { url: string; field: string }[] = [
      { url: `${ROUTE}?decision=maybe`, field: "querystring/decision" },
      { url: `${ROUTE}?action=`, field: "querystring/action" },
      { url: `${ROUTE}?tenant_id=tenant_b`, field: "querystring/tenant_id" },
    ];
    for (const entry of refusals) {
      const response = await get(server, entry.url, headers);
      assert.equal(response.statusCode, 400, `${entry.url} answers 400`);
      assert.equal(errorOf(response).code, "VALIDATION_FAILED", `${entry.url} is refused`);
      assert.equal(firstField(response).field, entry.field, `${entry.url} names ${entry.field}`);
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-7141a311 the policy decision route refuses foreign cursors", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice, key } = harness;
    await seedDecisions(db, a);
    await appendAt(db, a, "2026-10-25T09:00:01Z");
    await appendAt(db, a, "2026-10-25T09:00:02Z");
    assert.ok(key !== null, "the harness carries an engine key");
    const headers = { cookie: alice.cookie };

    const first = await get(server, "/api/v1/audit?limit=1", headers);
    assert.equal(first.statusCode, 200, "the audit route produced a page");
    const auditCursor = pageOf(first).next_cursor;
    assert.equal(typeof auditCursor, "string", "the audit page carries a cursor");

    const cursorKey = deriveCursorKey(key);
    const badDateCursor = encodeCursor(cursorKey, {
      tenantId: "tenant_a",
      scope: "decisions.desc",
      position: ["2026-02-30T00:00:00.000000Z", "d_1"],
    });

    for (const cursor of [tamper(auditCursor ?? ""), badDateCursor]) {
      assertCursorInvalid(await get(server, withCursor(ROUTE, cursor), headers));
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-26fdf915 the policy decision list without an engine key serves one page", async () => {
  const harness = await createHarness({ engineKey: null });
  try {
    const { db, server, a, alice } = harness;
    await seedDecisions(db, a);
    const headers = { cookie: alice.cookie };

    const full = await get(server, `${ROUTE}?limit=50&to=2026-10-25T09:00:00Z`, headers);
    assert.equal(full.statusCode, 200, "a list that fits one page is served");
    const fullPage = pageOf(full);
    assert.deepEqual(ids(fullPage.items), ["d_4", "d_3", "d_2", "d_1"], "all four rows are served");
    assert.equal(fullPage.next_cursor, null, "a single page has no cursor");

    const second = await get(server, `${ROUTE}?limit=2&to=2026-10-25T09:00:00Z`, headers);
    assert.equal(second.statusCode, 503, "a second page needs the engine key");
    const error = errorOf(second);
    assert.equal(error.code, "ENGINE_KEY_REQUIRED");
    assert.equal(error.message, "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)");
  } finally {
    await closeHarness(harness);
  }
});

test("C-abef4e43 the policy decision route needs a session and read_audit", async () => {
  const harness = await createHarness({ restricted: true });
  try {
    const { db, server, a, alice } = harness;

    const anonymous = await get(server, ROUTE);
    assert.equal(anonymous.statusCode, 401, "no cookie is unauthenticated");
    assert.equal(errorOf(anonymous).code, "UNAUTHENTICATED");

    const forbidden = await get(server, ROUTE, { cookie: alice.cookie });
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

test("C-2b77706e another tenant's caller sees only its own policy decisions", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b, mallory, alice } = harness;
    await seedDecisions(db, a);
    await record(db, b, {
      decision: "allow",
      decisionId: "b_1",
      decidedAt: "2026-10-25T08:00:01.000Z",
      reasons: [],
      errors: [],
      policySetVersion: POLICY_SET_VERSION,
    }, requestFor("start_run", "tenant_b/m_1", "tenant_b"));

    for (const headers of [
      { cookie: mallory.cookie },
      { cookie: mallory.cookie, "x-tenant-id": "tenant_a" },
    ]) {
      const response = await get(server, `${ROUTE}?to=2026-10-25T09:00:00Z`, headers);
      assert.equal(response.statusCode, 200, "tenant B reads its own list");
      assert.equal(response.headers["cache-control"], "no-store", "the list is not cached");
      assert.deepEqual(ids(pageOf(response).items), ["b_1"], "only tenant B's rows are listed");
    }

    const foreign = await get(server, `${ROUTE}?decision_id=d_2`, { cookie: mallory.cookie });
    assert.equal(foreign.statusCode, 200, "the foreign id filter still answers 200");
    assert.deepEqual(foreign.json(), { items: [], next_cursor: null }, "no tenant B row matches");

    const aList = await get(server, `${ROUTE}?to=2026-10-25T09:00:00Z`, { cookie: alice.cookie });
    assert.equal(aList.statusCode, 200, "tenant A still reads its own list");
    assert.deepEqual(ids(pageOf(aList).items), ["d_4", "d_3", "d_2", "d_1"]);
  } finally {
    await closeHarness(harness);
  }
});
