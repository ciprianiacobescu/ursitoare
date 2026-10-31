import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { anchorHead, appendAuditCommitted, verifyChain } from "../audit/index.ts";
import type { AuditEventInput, ChainReport, KeyMaterial } from "../audit/index.ts";
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
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerAuditRoutes, "function");
assert.equal(typeof verifyChain, "function");
assert.equal(typeof anchorHead, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const CHECKED_AT = "2026-10-25T09:00:00.000000Z";
const KEY: KeyMaterial = { reveal: () => "k".repeat(64) };

const engineDirs: string[] = [];

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface VerifyBody {
  ok: boolean;
  checked: number;
  firstBadSeq: string | null;
  reason: string | null;
  fromSeq: string;
  anchorsChecked: boolean;
  anchorsVerified: number;
  checkedAt: string;
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
  verify?: typeof verifyChain;
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  engine: PolicyEngine;
  a: TenantContext;
  b: TenantContext;
  clock: Clock;
  key: KeyMaterial | null;
  alice: Session;
  mallory: Session;
}

interface VerifyCall {
  tenantId: string;
  opts: unknown;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-audit-verify-src-"));
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

async function serverOn(
  db: TestDatabase,
  engine: PolicyEngine,
  clock: Clock,
  engineKey: KeyMaterial | null,
  verify?: typeof verifyChain,
): Promise<FastifyInstance> {
  const server = await makeServer();
  assert.doesNotThrow(() => {
    installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");

  const deps: AuditApiDeps = { pool: db.appPool, clock, engineKey };
  if (verify !== undefined) {
    deps.verify = verify;
  }
  assert.doesNotThrow(() => {
    registerAuditRoutes(server, deps);
  }, "registerAuditRoutes");
  return server;
}

async function createHarness(options: HarnessOptions = {}): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(T0);
  const engine = await makeEngine(clock, options.restricted === true);
  const engineKey = options.engineKey === undefined ? KEY : options.engineKey;
  const server = await serverOn(db, engine, clock, engineKey, options.verify);
  const alice = await session(db, a, "alice", clock);
  const mallory = await session(db, b, "mallory", clock);
  return { db, server, engine, a, b, clock, key: engineKey, alice, mallory };
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
): Promise<void> {
  await appendAuditCommitted(db.appPool, ctx, event, {
    clock: fixedClock(`2026-10-25T09:00:0${String(seq)}.000Z`),
  });
}

async function fiveEvents(db: TestDatabase, ctx: TenantContext): Promise<void> {
  for (let index = 0; index < FIVE_EVENTS.length; index += 1) {
    const event = FIVE_EVENTS[index];
    assert.ok(event !== undefined, "fixture event exists");
    await appendAt(db, ctx, index + 1, event);
  }
}

async function get(
  server: FastifyInstance,
  url: string,
  headers: Record<string, string> = {},
) {
  return server.inject({ method: "GET", url, headers });
}

function bodyOf(response: { json: () => unknown }): VerifyBody {
  return response.json() as VerifyBody;
}

function errorOf(response: { json: () => unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

function firstField(response: { json: () => unknown }): ErrorField {
  const details = errorOf(response).details as { fields?: ErrorField[] } | undefined;
  return details?.fields?.[0] ?? {};
}

async function tamper(
  db: TestDatabase,
  tenantId: string,
  sql: string,
  params: unknown[] = [],
  triggers: string[] = ["audit_event_append_only"],
): Promise<void> {
  const client = await db.ownerPool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.tenant_id', $1, true)", [tenantId]);
    for (const trigger of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event DISABLE TRIGGER ${trigger}`);
    }
    await client.query(sql, params);
    for (const trigger of triggers) {
      await client.query(`ALTER TABLE ursitoare.audit_event ENABLE TRIGGER ${trigger}`);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

async function decisionRow(
  db: TestDatabase,
  ctx: TenantContext,
  decisionId: string,
): Promise<{ action: string; decision: string }> {
  let row: { action: string; decision: string } | undefined;
  await assert.doesNotReject(async () => {
    row = await withTenantTx(db.appPool, ctx, async (tx) => {
      const result = await tx.query<{ action: string; decision: string }>(
        "SELECT action, decision FROM ursitoare.policy_decision WHERE tenant_id = $1 AND decision_id = $2",
        [ctx.tenantId, decisionId],
      );
      return result.rows[0];
    });
  }, "the refusal recorded a decision row");
  assert.ok(row !== undefined, "the refusal recorded a decision row");
  return row;
}

async function deniedEvent(
  db: TestDatabase,
  ctx: TenantContext,
): Promise<{ event_type: string; target: unknown } | undefined> {
  let denied: { event_type: string; target: unknown } | undefined;
  await assert.doesNotReject(async () => {
    denied = await withTenantTx(db.appPool, ctx, async (tx) => {
      const result = await tx.query<{ event_type: string; target: unknown }>(
        "SELECT event_type, target FROM ursitoare.audit_event WHERE tenant_id = $1 AND event_type = 'authz.denied' LIMIT 1",
        [ctx.tenantId],
      );
      return result.rows[0];
    });
  }, "the authz.denied event is readable");
  return denied;
}

function recordingVerify(calls: VerifyCall[], report: ChainReport): typeof verifyChain {
  return (_pool, ctx, opts) => {
    calls.push({ tenantId: ctx.tenantId, opts });
    return Promise.resolve(report);
  };
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

test("C-c69a42aa verify answers intact, part-way and empty chains", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await assert.doesNotReject(() => fiveEvents(db, a), "the fixture appends five events");
    const headers = { cookie: alice.cookie };

    const intact = await get(server, "/api/v1/audit/verify", headers);
    assert.equal(intact.statusCode, 200, "an intact chain verifies with 200");
    assert.deepEqual(bodyOf(intact), {
      ok: true,
      checked: 5,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    const partWay = await get(server, "/api/v1/audit/verify?from_seq=3", headers);
    assert.equal(partWay.statusCode, 200, "a part-way walk answers 200");
    assert.deepEqual(bodyOf(partWay), {
      ok: true,
      checked: 3,
      firstBadSeq: null,
      reason: null,
      fromSeq: "3",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    const aboveTip = await get(server, "/api/v1/audit/verify?from_seq=6", headers);
    assert.equal(aboveTip.statusCode, 200, "a start above the tip answers 200");
    assert.deepEqual(bodyOf(aboveTip), {
      ok: true,
      checked: 0,
      firstBadSeq: null,
      reason: null,
      fromSeq: "6",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });
  } finally {
    await closeHarness(harness);
  }

  const empty = await createHarness();
  try {
    const response = await get(empty.server, "/api/v1/audit/verify", {
      cookie: empty.alice.cookie,
    });
    assert.equal(response.statusCode, 200, "an empty chain verifies with 200");
    assert.deepEqual(bodyOf(response), {
      ok: true,
      checked: 0,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });
  } finally {
    await closeHarness(empty);
  }
});

test("C-f001a03d anchors are counted, never assumed", async () => {
  const harness = await createHarness();
  try {
    const { db, server, engine, clock, a, key, alice } = harness;
    await assert.doesNotReject(() => fiveEvents(db, a), "the fixture appends five events");
    const headers = { cookie: alice.cookie };
    assert.ok(key !== null, "the harness carries an engine key");

    const before = await get(server, "/api/v1/audit/verify", headers);
    assert.equal(before.statusCode, 200, "the first walk answers 200");
    assert.deepEqual(bodyOf(before), {
      ok: true,
      checked: 5,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    await assert.doesNotReject(async () => {
      await anchorHead(db.appPool, a, key, { clock: fixedClock("2026-10-25T09:00:06.000Z") });
    }, "anchorHead writes the anchor");

    const afterAnchor = await get(server, "/api/v1/audit/verify", headers);
    assert.equal(afterAnchor.statusCode, 200, "the second walk answers 200");
    assert.deepEqual(bodyOf(afterAnchor), {
      ok: true,
      checked: 5,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: true,
      anchorsVerified: 1,
      checkedAt: CHECKED_AT,
    });

    const aboveAnchor = await get(server, "/api/v1/audit/verify?from_seq=6", headers);
    assert.equal(aboveAnchor.statusCode, 200, "the walk above the anchor answers 200");
    assert.deepEqual(bodyOf(aboveAnchor), {
      ok: true,
      checked: 0,
      firstBadSeq: null,
      reason: null,
      fromSeq: "6",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    const keyless = await serverOn(db, engine, clock, null);
    try {
      const response = await get(keyless, "/api/v1/audit/verify", headers);
      assert.equal(response.statusCode, 200, "the keyless server answers 200");
      assert.deepEqual(bodyOf(response), {
        ok: true,
        checked: 5,
        firstBadSeq: null,
        reason: null,
        fromSeq: "1",
        anchorsChecked: false,
        anchorsVerified: 0,
        checkedAt: CHECKED_AT,
      });
    } finally {
      await keyless.close();
    }
  } finally {
    await closeHarness(harness);
  }
});

test("C-f4460a58 tampered chains answer ok false with the first bad seq", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, alice } = harness;
    await assert.doesNotReject(() => fiveEvents(db, a), "the fixture appends five events");
    const headers = { cookie: alice.cookie };

    await assert.doesNotReject(
      () =>
        tamper(
          db,
          a.tenantId,
          "UPDATE ursitoare.audit_event SET event_type = 'role.revoked' WHERE seq = 4",
        ),
      "the owner changes event_type of seq 4",
    );

    const hashed = await get(server, "/api/v1/audit/verify", headers);
    assert.equal(hashed.statusCode, 200, "a broken chain is a 200, not an error");
    assert.deepEqual(bodyOf(hashed), {
      ok: false,
      checked: 3,
      firstBadSeq: "4",
      reason: "hash",
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    await assert.doesNotReject(
      () => tamper(db, a.tenantId, "DELETE FROM ursitoare.audit_event WHERE seq = 3"),
      "the owner deletes seq 3",
    );

    const gapped = await get(server, "/api/v1/audit/verify", headers);
    assert.equal(gapped.statusCode, 200, "a gapped chain is a 200, not an error");
    assert.deepEqual(bodyOf(gapped), {
      ok: false,
      checked: 2,
      firstBadSeq: "3",
      reason: "gap",
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });
  } finally {
    await closeHarness(harness);
  }
});

test("C-bfe35eee options reach verifyChain and bad input is refused", async () => {
  const keyedCalls: VerifyCall[] = [];
  const keyed = await createHarness({
    verify: recordingVerify(keyedCalls, { ok: true, checked: 42 }),
  });
  try {
    const response = await get(keyed.server, "/api/v1/audit/verify?from_seq=3", {
      cookie: keyed.alice.cookie,
    });
    assert.equal(response.statusCode, 200, "the recording verify answers 200");
    assert.deepEqual(bodyOf(response), {
      ok: true,
      checked: 42,
      firstBadSeq: null,
      reason: null,
      fromSeq: "3",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    const first = keyedCalls[0];
    assert.ok(first !== undefined, "the route called verifyChain once");
    assert.equal(first.tenantId, "tenant_a", "the walk runs for the caller's tenant");
    assert.deepEqual(
      first.opts,
      { fromSeq: 3n, engineKey: KEY },
      "the options carry fromSeq and the engine key",
    );

    const badCases: { url: string; field: string }[] = [
      { url: "/api/v1/audit/verify?from_seq=0", field: "querystring/from_seq" },
      { url: "/api/v1/audit/verify?from_seq=1.5", field: "querystring/from_seq" },
      {
        url: "/api/v1/audit/verify?from_seq=9223372036854775808",
        field: "querystring/from_seq",
      },
      { url: "/api/v1/audit/verify?batch_size=5", field: "querystring/batch_size" },
    ];
    for (const entry of badCases) {
      const bad = await get(keyed.server, entry.url, { cookie: keyed.alice.cookie });
      assert.equal(bad.statusCode, 400, `${entry.url} answers 400`);
      assert.equal(errorOf(bad).code, "VALIDATION_FAILED", `${entry.url} is a validation failure`);
      assert.equal(firstField(bad).field, entry.field, `${entry.url} names ${entry.field} first`);
    }
    assert.equal(keyedCalls.length, 1, "bad input never reaches verifyChain");
  } finally {
    await closeHarness(keyed);
  }

  const keylessCalls: VerifyCall[] = [];
  const keyless = await createHarness({
    engineKey: null,
    verify: recordingVerify(keylessCalls, { ok: true, checked: 42 }),
  });
  try {
    const response = await get(keyless.server, "/api/v1/audit/verify", {
      cookie: keyless.alice.cookie,
    });
    assert.equal(response.statusCode, 200, "the keyless walk answers 200");
    assert.deepEqual(bodyOf(response), {
      ok: true,
      checked: 42,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });

    const first = keylessCalls[0];
    assert.ok(first !== undefined, "the keyless route called verifyChain once");
    assert.deepEqual(first.opts, { fromSeq: 1n }, "the options carry no engine key property");
  } finally {
    await closeHarness(keyless);
  }
});

test("C-bfe35eee a failing verify answers INTERNAL and the next succeeds", async () => {
  let attempt = 0;
  const harness = await createHarness({
    engineKey: null,
    verify: () => {
      attempt += 1;
      if (attempt === 1) {
        return Promise.reject(new Error("db down"));
      }
      return Promise.resolve({ ok: true, checked: 9 });
    },
  });
  try {
    const headers = { cookie: harness.alice.cookie };

    const failing = await get(harness.server, "/api/v1/audit/verify", headers);
    assert.equal(failing.statusCode, 500, "a rejected walk is an internal error");
    assert.equal(errorOf(failing).code, "INTERNAL", "the failure is INTERNAL");
    assert.equal(
      JSON.stringify(failing.json()).includes("db down"),
      false,
      "the failure does not carry the driver message",
    );

    const next = await get(harness.server, "/api/v1/audit/verify", headers);
    assert.equal(next.statusCode, 200, "the next walk succeeds");
    assert.deepEqual(bodyOf(next), {
      ok: true,
      checked: 9,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });
    assert.equal(attempt, 2, "verifyChain ran once per request");
  } finally {
    await closeHarness(harness);
  }
});

test("C-26fdf915 the verify route answers without an engine key", async () => {
  const harness = await createHarness({ engineKey: null });
  try {
    const { db, server, a, alice } = harness;
    await assert.doesNotReject(() => fiveEvents(db, a), "the fixture appends five events");
    const response = await get(server, "/api/v1/audit/verify", { cookie: alice.cookie });
    assert.equal(response.statusCode, 200, "verify works without an engine key");
    assert.deepEqual(bodyOf(response), {
      ok: true,
      checked: 5,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    });
  } finally {
    await closeHarness(harness);
  }
});

test("C-abef4e43 the verify route needs a session and read_audit", async () => {
  const harness = await createHarness({ restricted: true });
  try {
    const { db, server, a, alice } = harness;

    const anonymous = await get(server, "/api/v1/audit/verify");
    assert.equal(anonymous.statusCode, 401, "no cookie is unauthenticated");
    assert.equal(errorOf(anonymous).code, "UNAUTHENTICATED");

    const forbidden = await get(server, "/api/v1/audit/verify", { cookie: alice.cookie });
    assert.equal(forbidden.statusCode, 403, "a policy without read_audit forbids the call");
    const error = errorOf(forbidden);
    assert.equal(error.code, "FORBIDDEN");
    const details = error.details as { decisionId?: unknown } | undefined;
    assert.equal(typeof details?.decisionId, "string", "the refusal names its decision id");
    const decisionId = details?.decisionId as string;

    const decision = await decisionRow(db, a, decisionId);
    assert.equal(decision.action, "read_audit");
    assert.equal(decision.decision, "deny");

    const denied = await deniedEvent(db, a);
    assert.ok(denied !== undefined, "the refusal appended an authz.denied event");
    assert.deepEqual(denied.target, { kind: "action", id: "read_audit" });
  } finally {
    await closeHarness(harness);
  }
});

test("C-2b77706e the verify route stays in the tenant", async () => {
  const harness = await createHarness();
  try {
    const { db, server, a, b, mallory } = harness;
    await assert.doesNotReject(() => fiveEvents(db, a), "the fixture appends five events");
    await assert.doesNotReject(
      async () => {
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
      },
      "the fixture appends tenant B's two events",
    );

    for (const headers of [
      { cookie: mallory.cookie },
      { cookie: mallory.cookie, "x-tenant-id": "tenant_a" },
    ]) {
      const response = await get(server, "/api/v1/audit/verify", headers);
      assert.equal(response.statusCode, 200, "tenant B verifies its own chain");
      assert.equal(response.headers["cache-control"], "no-store", "the answer is not cached");
      const body = bodyOf(response);
      assert.equal(body.ok, true);
      assert.equal(body.checked, 2, "only tenant B's two events are walked");
      assert.notEqual(body.checked, 5, "tenant A's chain is never walked");
      assert.equal(body.fromSeq, "1");
    }
  } finally {
    await closeHarness(harness);
  }
});
