import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { createGrant } from "../grants/index.ts";
import type { GrantDeps, GrantRecord } from "../grants/index.ts";
import {
  createFlow,
  importCatalogue,
  loadRegistryCatalogue,
  saveFlowVersion,
  validateVersion,
} from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerGrantRoutes } from "./grant-routes.ts";
import { registerMeRoute } from "./me.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const AT = "2026-11-06T09:00:00.000000Z";
const FPA = "nf1_f24d1bc261f70ccadd830e24b3acb40edec5066462531278c03adc516dfeb51d";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";

const CAROL_ACTOR = { kind: "user", id: "carol" } as const;
const ALICE_ACTOR = { kind: "user", userId: "alice" } as const;

function G(n: number): string {
  return `grant_00000000-0000-7000-8000-${n.toString(16).padStart(12, "0")}`;
}

const ACME_BLOCKS: Record<string, BlockImport> = {
  "acme.lookup_vendor@1": {
    effect: "read",
    input: {
      type: "object",
      properties: {
        vendor_name: { type: "string" },
        limit: { type: "integer" },
        exact: { type: "boolean" },
        tags: { type: "array", items: { type: "string" } },
      },
      required: ["vendor_name"],
    },
    output: {
      type: "object",
      properties: { vendor_id: { type: "string" } },
      required: ["vendor_id"],
    },
  },
  "acme.create_payment@1": {
    effect: "pay",
    input: {
      type: "object",
      properties: {
        vendor_id: { type: "string" },
        amount: { type: "number" },
        currency: { type: "string" },
      },
      required: ["vendor_id", "amount", "currency"],
    },
    output: { type: "object" },
  },
  "acme.odd_args@1": {
    effect: "read",
    input: {
      type: "object",
      properties: { "Vendor-Id": { type: "string" }, vendor_ok: { type: "string" } },
    },
    output: { type: "object" },
  },
};

interface FlowDoc {
  ursitoare: string;
  flow: string;
  version: string;
  inputs: Record<string, unknown>;
  start: string;
  nodes: Record<string, Record<string, unknown>>;
}

const F1_DOC: FlowDoc = {
  ursitoare: "0.1",
  flow: "pay-run",
  version: "1.0.0",
  inputs: {
    type: "object",
    properties: { vendor_name: { type: "string" }, amount: { type: "number" } },
    required: ["vendor_name", "amount"],
  },
  start: "lookup",
  nodes: {
    lookup: {
      kind: "block",
      uses: "acme.lookup_vendor@1",
      with: { vendor_name: "${{ inputs.vendor_name }}" },
      next: "approval",
    },
    approval: {
      kind: "human.approval",
      assignee_role: "approver",
      summary: "Pay ${{ inputs.amount }} to ${{ nodes.lookup.output.vendor_id }}?",
      timeout: "PT48H",
      cases: { approved: "pay", rejected: "stop", timeout: "stop" },
    },
    pay: {
      kind: "block",
      uses: "acme.create_payment@1",
      with: {
        vendor_id: "${{ nodes.lookup.output.vendor_id }}",
        amount: "${{ inputs.amount }}",
        currency: "EUR",
      },
      next: "done",
    },
    done: { kind: "end", status: "completed" },
    stop: { kind: "end", status: "failed" },
  },
};

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  h1: string;
  sessions: Record<string, Session>;
}

async function setup(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  for (const [ctx, who] of [
    [a, ["alice", "bob", "carol"]],
    [b, ["mallory"]],
  ] as [TenantContext, string[]][]) {
    await withTenantTx(db.appPool, ctx, async (tx) => {
      for (const name of who) {
        await tx.query(
          `INSERT INTO ursitoare."user" (tenant_id, user_id, kind, display_name)
           VALUES ($1, $2, 'human', $2)`,
          [ctx.tenantId, name],
        );
      }
    });
  }
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    CLOCK,
  );
  await seedFlowActors(
    db,
    b,
    [{ subject: "mallory", roles: ["tenant_admin"], teams: [] }],
    CLOCK,
  );
  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, CLOCK);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", CLOCK);
  for (const ctx of [a, b]) {
    await importCatalogue(db.appPool, ctx, ACME_BLOCKS, CAROL_ACTOR, { clock: CLOCK });
  }
  await withTenantTx(db.appPool, a, (tx) =>
    createFlow(tx, a, { name: "pay-run", ownerTeam: "finance" }, ALICE_ACTOR, { clock: CLOCK }),
  );
  const catalogue = await loadRegistryCatalogue(db.appPool, a);
  const h1 = await withTenantTx(db.appPool, a, async (tx) => {
    const saved = await saveFlowVersion(
      tx,
      a,
      { flowId: "pay-run", format: "json", text: JSON.stringify(F1_DOC) },
      ALICE_ACTOR,
      { clock: CLOCK },
    );
    await validateVersion(
      tx,
      a,
      { flowId: "pay-run", hash: saved.version.hash, catalogue },
      ALICE_ACTOR,
      { clock: CLOCK },
    );
    return saved.version.hash;
  });
  return { db, a, b, h1, sessions };
}

async function silentServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
}

async function engineOf(): Promise<PolicyEngine> {
  return createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock: CLOCK,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
}

interface GrantBody {
  subject: Record<string, unknown>;
  tool: string;
  scope: Record<string, unknown>;
  args: Record<string, unknown>[];
  versionHash?: string;
}

function b1(): GrantBody {
  return {
    subject: { kind: "role", role: "author" },
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
    args: [{ arg: "amount", op: "lte", value: 1000.5 }],
  };
}

function anyBody(): GrantBody {
  return {
    subject: { kind: "role", role: "author" },
    tool: "acme.lookup_vendor@1",
    scope: { kind: "any_step" },
    args: [],
  };
}



type Method = "GET" | "POST" | "DELETE";

interface Injected {
  statusCode: number;
  headers: Record<string, unknown>;
  json: () => unknown;
}

async function call(
  server: FastifyInstance,
  method: Method,
  url: string,
  session: Session | null,
  payload?: unknown,
  extraHeaders: Record<string, string> = {},
): Promise<Injected> {
  let headers: Record<string, string> = {};
  if (session !== null) {
    headers = { cookie: session.cookie, "x-csrf-token": session.csrfToken };
  }
  headers = { ...headers, ...extraHeaders };
  const options: {
    method: Method;
    url: string;
    headers: Record<string, string>;
    payload?: object;
  } = { method, url, headers };
  if (payload !== undefined) {
    options.payload = payload as object;
  }
  return (await server.inject(options)) as unknown as Injected;
}

function asError(res: Injected): {
  status: number;
  code: string;
  details: Record<string, unknown> | undefined;
} {
  assert.ok(res.statusCode >= 400, `expected an error status, got ${res.statusCode}`);
  const body = res.json() as { error?: { code?: unknown; details?: Record<string, unknown> } };
  assert.equal(
    typeof body?.error?.code,
    "string",
    `the body of status ${res.statusCode} is an error envelope`,
  );
  return {
    status: res.statusCode,
    code: body.error?.code as string,
    details: body.error?.details,
  };
}

function firstFieldOf(res: Injected): { field: string; message: string } {
  const { details } = asError(res);
  const fields = details?.fields as { field: unknown; message: unknown }[] | undefined;
  assert.ok(Array.isArray(fields) && fields.length > 0, "the error carries a fields list");
  const entry = fields[0] as { field: unknown; message: unknown };
  assert.equal(typeof entry.field, "string", "the field of the first error entry");
  assert.equal(typeof entry.message, "string", "the message of the first error entry");
  return { field: entry.field as string, message: entry.message as string };
}

async function countGrants(hx: Harness): Promise<number> {
  const rows = await withTenantTx(hx.db.appPool, hx.a, async (tx) =>
    await tx.query("SELECT count(*)::int AS count FROM ursitoare.\"grant\"", []),
  );
  const first = rows.rows[0] as { count: number } | undefined;
  assert.ok(first !== undefined, "the grant row count is readable");
  return first.count;
}

test("C-8028b9c3 the grant routes require deploy_policy and map the module errors", async () => {
  const hx = await setup();
  const server = await silentServer();
  try {
    const engine = await engineOf();
    const pep = { pool: hx.db.appPool, engine, clock: CLOCK, publicBaseUrl: BASE_URL };
    installPep(server, pep);
    registerMeRoute(server, pep);
    assert.doesNotThrow(() => {
      registerGrantRoutes(server, {
        pool: hx.db.appPool,
        clock: CLOCK,
        ids: sequentialIds(0),
        engineKey: { reveal: () => "k".repeat(64) },
      });
    }, "registerGrantRoutes registers the grant routes");

    const sessions = hx.sessions;
    const carol = sessions["carol"] as Session;
    const alice = sessions["alice"] as Session;
    const bob = sessions["bob"] as Session;
    const mallory = sessions["mallory"] as Session;

    const g0: GrantRecord = {
      id: G(0),
      subject: { kind: "role", role: "author" },
      tool: "acme.create_payment@1",
      scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
      args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      fingerprints: [FPA],
      state: "active",
      createdBy: carol.userId,
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    };
    const g1: GrantRecord = {
      id: G(1),
      subject: { kind: "user", userId: "bob" },
      tool: "acme.lookup_vendor@1",
      scope: { kind: "any_step" },
      args: [],
      fingerprints: [],
      state: "active",
      createdBy: bob.userId,
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    };

    const aliceGet = await call(server, "GET", "/api/v1/grants", alice);
    assert.equal(aliceGet.statusCode, 403, "alice GET is refused");
    assert.equal(asError(aliceGet).code, "FORBIDDEN");
    const alicePost = await call(server, "POST", "/api/v1/grants", alice, b1());
    assert.equal(alicePost.statusCode, 403, "alice POST is refused");
    assert.equal(asError(alicePost).code, "FORBIDDEN");

    const created = await call(server, "POST", "/api/v1/grants", carol, b1());
    assert.equal(created.statusCode, 201, "carol creates the first grant");
    assert.deepEqual(created.json() as GrantRecord, g0);

    const argType = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      { ...anyBody(), args: [{ arg: "limit", op: "eq", value: "5" }] },
    );
    assert.equal(argType.statusCode, 422, "the string value is not coerced to a number");
    const argTypeErr = asError(argType);
    assert.equal(argTypeErr.code, "OPERATION_REFUSED");
    assert.deepEqual(argTypeErr.details, { reason: "arg_type" });

    const nine = Array.from({ length: 9 }, (_nothing, index) => ({
      arg: "amount",
      op: "lte",
      value: index,
    }));
    const ajvRows: [Record<string, unknown>, string][] = [
      [{ ...(b1() as unknown as Record<string, unknown>), extra: 1 }, "body/extra"],
      [{ ...b1(), subject: { kind: "team", role: "x" } }, "body/subject/kind"],
      [{ ...b1(), subject: { kind: "role", role: "Bad" } }, "body/subject/role"],
      [{ ...b1(), args: nine }, "body/args"],
      [{ ...b1(), args: [{ arg: "amount", op: "lt", value: 1 }] }, "body/args/0/op"],
      [{ ...b1(), versionHash: "abc" }, "body/versionHash"],
      [
        {
          subject: { kind: "role", role: "author" },
          tool: "acme.create_payment@1",
          scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
        },
        "body/args",
      ],
    ];
    for (const [body, field] of ajvRows) {
      const res = await call(server, "POST", "/api/v1/grants", carol, body);
      assert.equal(res.statusCode, 400, `the bad body for ${field} is refused`);
      assert.equal(asError(res).code, "VALIDATION_FAILED");
      assert.equal(firstFieldOf(res).field, field);
    }
    const moduleRows: [Record<string, unknown>, string][] = [
      [{ ...b1(), args: [{ arg: "amount", op: "lte", value: [1] }] }, "body/args"],
      [{ ...anyBody(), versionHash: hx.h1 }, "body/versionHash"],
      [{ ...b1(), subject: { kind: "role" } }, "body/subject"],
    ];
    for (const [body, field] of moduleRows) {
      const res = await call(server, "POST", "/api/v1/grants", carol, body);
      assert.equal(res.statusCode, 400, `the module refuses ${field}`);
      assert.equal(asError(res).code, "VALIDATION_FAILED");
      const entry = firstFieldOf(res);
      assert.equal(entry.field, field);
      assert.equal(entry.message, "is invalid");
    }

    const ghost = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      { ...b1(), subject: { kind: "role", role: "ghost" } },
    );
    assert.equal(ghost.statusCode, 422, "the ghost role is refused");
    const ghostErr = asError(ghost);
    assert.equal(ghostErr.code, "OPERATION_REFUSED");
    assert.deepEqual(ghostErr.details, { reason: "role_unknown" });
    const badValue = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      { ...b1(), args: [{ arg: "currency", op: "eq", value: "a\\b" }] },
    );
    assert.equal(badValue.statusCode, 422, "the value with a backslash is refused");
    const badValueErr = asError(badValue);
    assert.equal(badValueErr.code, "OPERATION_REFUSED");
    assert.deepEqual(badValueErr.details, { reason: "value_invalid" });

    const bobCreate = await call(
      server,
      "POST",
      "/api/v1/grants",
      bob,
      {
        subject: { kind: "user", userId: "bob" },
        tool: "acme.lookup_vendor@1",
        scope: { kind: "any_step" },
        args: [],
      },
    );
    assert.equal(bobCreate.statusCode, 201, "bob creates the second grant");
    assert.deepEqual(bobCreate.json() as GrantRecord, g1);

    const page1 = await call(server, "GET", "/api/v1/grants?limit=1", carol);
    assert.equal(page1.statusCode, 200, "the first page answers");
    const page1Body = page1.json() as { items: unknown[]; next_cursor: unknown };
    assert.deepEqual(page1Body.items, [{ grant: g0, status: "active" }]);
    assert.equal(typeof page1Body.next_cursor, "string", "the first page carries a cursor");
    const cursor = page1Body.next_cursor as string;
    const page2 = await call(
      server,
      "GET",
      `/api/v1/grants?limit=1&cursor=${encodeURIComponent(cursor)}`,
      carol,
    );
    assert.equal(page2.statusCode, 200, "the second page answers");
    const page2Body = page2.json() as { items: unknown[]; next_cursor: unknown };
    assert.deepEqual(page2Body.items, [{ grant: g1, status: "active" }]);
    assert.equal(page2Body.next_cursor, null);
    const malloryList = await call(server, "GET", "/api/v1/grants", mallory);
    assert.equal(malloryList.statusCode, 200, "the tenant admin of tenant B lists");
    assert.deepEqual(malloryList.json() as unknown, { items: [], next_cursor: null });
    const crossDelete = await call(server, "DELETE", `/api/v1/grants/${G(0)}`, mallory);
    assert.equal(crossDelete.statusCode, 404, "a delete of another tenant is not found");
    assert.equal(asError(crossDelete).code, "NOT_FOUND");

    const confirmed = await call(server, "POST", `/api/v1/grants/${G(0)}/confirm`, carol, {});
    assert.equal(confirmed.statusCode, 200, "the confirm answers the record");
    assert.deepEqual(confirmed.json() as GrantRecord, g0);
    const badHash = await call(
      server,
      "POST",
      `/api/v1/grants/${G(0)}/confirm`,
      carol,
      { versionHash: "x" },
    );
    assert.equal(badHash.statusCode, 400, "a malformed confirm hash is refused");
    assert.equal(asError(badHash).code, "VALIDATION_FAILED");
    assert.equal(firstFieldOf(badHash).field, "body/versionHash");
    const noBody = await call(server, "POST", `/api/v1/grants/${G(0)}/confirm`, carol);
    assert.equal(noBody.statusCode, 400, "a missing confirm body is refused");
    assert.equal(asError(noBody).code, "VALIDATION_FAILED");
    assert.equal(firstFieldOf(noBody).field, "body");

    const recon = await call(
      server,
      "GET",
      `/api/v1/grants/reconfirmations?from=${hx.h1}&to=${hx.h1}`,
      carol,
    );
    assert.equal(recon.statusCode, 200, "same hashes list nothing");
    assert.deepEqual(recon.json() as unknown, { items: [] });
    const reconNoTo = await call(
      server,
      "GET",
      `/api/v1/grants/reconfirmations?from=${hx.h1}`,
      carol,
    );
    assert.equal(reconNoTo.statusCode, 400, "a missing to hash is refused");
    assert.equal(asError(reconNoTo).code, "VALIDATION_FAILED");
    assert.equal(firstFieldOf(reconNoTo).field, "querystring/to");
    const reconBadTo = await call(
      server,
      "GET",
      `/api/v1/grants/reconfirmations?from=${hx.h1}&to=nope`,
      carol,
    );
    assert.equal(reconBadTo.statusCode, 400, "a malformed to hash is refused");
    assert.equal(asError(reconBadTo).code, "VALIDATION_FAILED");
    assert.equal(firstFieldOf(reconBadTo).field, "querystring/to");
    const reconGhost = await call(
      server,
      "GET",
      `/api/v1/grants/reconfirmations?from=${hx.h1}&to=sha256:${"1".repeat(64)}`,
      carol,
    );
    assert.equal(reconGhost.statusCode, 404, "an unknown hash is not found");
    assert.equal(asError(reconGhost).code, "NOT_FOUND");

    const revoke = await call(server, "DELETE", `/api/v1/grants/${G(0)}`, carol);
    assert.equal(revoke.statusCode, 200, "the revoke answers the record");
    const revokedBody: GrantRecord = {
      ...g0,
      state: "revoked",
      revokedBy: carol.userId,
      revokedAt: AT,
    };
    assert.deepEqual(revoke.json() as GrantRecord, revokedBody);
    const revokeAgain = await call(server, "DELETE", `/api/v1/grants/${G(0)}`, carol);
    assert.equal(revokeAgain.statusCode, 200, "the second revoke is idempotent");
    assert.deepEqual(revokeAgain.json() as GrantRecord, revokedBody);
    const delBadShape = await call(server, "DELETE", `/api/v1/grants/nope`, carol);
    assert.equal(delBadShape.statusCode, 400, "a grant id outside the pattern is refused");
    assert.equal(asError(delBadShape).code, "VALIDATION_FAILED");
    assert.equal(firstFieldOf(delBadShape).field, "params/id");
    const delGhost = await call(server, "DELETE", `/api/v1/grants/grant_zzz`, carol);
    assert.equal(delGhost.statusCode, 404, "an unknown grant is not found");
    assert.equal(asError(delGhost).code, "NOT_FOUND");

    const meCarol = await call(server, "GET", "/api/v1/me", carol);
    assert.equal(meCarol.statusCode, 200, "carol answers /me");
    const meCarolBody = meCarol.json() as { capabilities: unknown };
    assert.ok(
      Array.isArray(meCarolBody.capabilities) &&
        meCarolBody.capabilities.includes("deploy_policy"),
      "carol holds the deploy_policy capability",
    );
    const meAlice = await call(server, "GET", "/api/v1/me", alice);
    assert.equal(meAlice.statusCode, 200, "alice answers /me");
    const meAliceBody = meAlice.json() as { capabilities: unknown };
    assert.ok(
      Array.isArray(meAliceBody.capabilities) &&
        !meAliceBody.capabilities.includes("deploy_policy"),
      "alice does not hold the deploy_policy capability",
    );
  } finally {
    await server.close();
    await hx.db.close();
  }
});

test("C-cf182e1b a replayed create returns the same grant and the record commits with it", async () => {
  const hx = await setup();
  const server = await silentServer();
  try {
    const engine = await engineOf();
    installPep(server, {
      pool: hx.db.appPool,
      engine,
      clock: CLOCK,
      publicBaseUrl: BASE_URL,
    });
    assert.doesNotThrow(() => {
      registerGrantRoutes(server, {
        pool: hx.db.appPool,
        clock: CLOCK,
        ids: sequentialIds(0),
        engineKey: { reveal: () => "k".repeat(64) },
      });
    }, "registerGrantRoutes registers the grant routes");

    const carol = hx.sessions["carol"] as Session;
    const g0: GrantRecord = {
      id: G(0),
      subject: { kind: "role", role: "author" },
      tool: "acme.create_payment@1",
      scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
      args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      fingerprints: [FPA],
      state: "active",
      createdBy: carol.userId,
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    };

    const first = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      b1(),
      { "idempotency-key": "k-1" },
    );
    assert.equal(first.statusCode, 201, "the keyed create answers 201");
    const firstBody = first.json() as GrantRecord;
    assert.deepEqual(firstBody, g0);

    const replay = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      b1(),
      { "idempotency-key": "k-1" },
    );
    assert.equal(replay.statusCode, 201, "the replay answers 201");
    assert.deepEqual(replay.json() as GrantRecord, firstBody);
    assert.equal(
      replay.headers["idempotent-replayed"],
      "true",
      "the replay is marked",
    );

    const reused = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      {
        subject: { kind: "role", role: "author" },
        tool: "acme.lookup_vendor@1",
        scope: { kind: "any_step" },
        args: [],
      },
      { "idempotency-key": "k-1" },
    );
    assert.equal(reused.statusCode, 422, "a different body for the same key is refused");
    assert.equal(asError(reused).code, "IDEMPOTENCY_KEY_REUSED");

    const ghost = await call(
      server,
      "POST",
      "/api/v1/grants",
      carol,
      { ...b1(), subject: { kind: "role", role: "ghost" } },
      { "idempotency-key": "k-2" },
    );
    assert.equal(ghost.statusCode, 422, "the refused create with k-2 is refused");
    const ghostErr = asError(ghost);
    assert.equal(ghostErr.code, "OPERATION_REFUSED");
    assert.deepEqual(ghostErr.details, { reason: "role_unknown" });

    assert.equal(await countGrants(hx), 1, "exactly one grant row exists");
    const events = await listAuditEvents(hx.db.appPool, hx.a, {
      filter: { eventType: "grants.created" },
      order: "asc",
      limit: 200,
    });
    assert.equal(events.length, 1, "exactly one grants.created event exists");
    const target = (events[0] as { target?: { kind?: unknown; id?: unknown } } | undefined)?.target;
    assert.equal(target?.kind, "grant", "the audit event targets a grant");
    assert.equal(target?.id, G(0), "the audit event targets the created grant");
    const keys = await withTenantTx(hx.db.appPool, hx.a, async (tx) =>
      await tx.query("SELECT key, state FROM ursitoare.idempotency_key ORDER BY key", []),
    );
    assert.deepEqual(
      (keys.rows as { key: string; state: string }[]).map((row) => row.state),
      ["done"],
      "the k-1 record is done and k-2 left no record",
    );
  } finally {
    await server.close();
    await hx.db.close();
  }
});

test("C-35c16816 the grant routes degrade without a pool or an engine key", async () => {
  const bare = await silentServer();
  try {
    installPep(bare, {
      pool: null,
      engine: null,
      clock: CLOCK,
      publicBaseUrl: BASE_URL,
    });
    assert.doesNotThrow(() => {
      registerGrantRoutes(bare, {
        pool: null,
        clock: CLOCK,
        ids: sequentialIds(0),
        engineKey: { reveal: () => "k".repeat(64) },
      });
    }, "registerGrantRoutes mounts with a null pool");
    for (const [method, url] of [
      ["GET", "/api/v1/grants"],
      ["POST", "/api/v1/grants"],
      ["DELETE", `/api/v1/grants/${G(0)}`],
      ["POST", `/api/v1/grants/${G(0)}/confirm`],
      ["GET", "/api/v1/grants/reconfirmations?from=x&to=y"],
    ] as [Method, string][]) {
      const res = await call(bare, method, url, null);
      assert.equal(res.statusCode, 503, `${method} ${url} answers 503 without a PEP pool`);
      const error = asError(res);
      assert.equal(error.code, "AUTHZ_UNAVAILABLE");
    }
  } finally {
    await bare.close();
  }

  const hx = await setup();
  try {
    const engine = await engineOf();
    const pep = { pool: hx.db.appPool, engine, clock: CLOCK, publicBaseUrl: BASE_URL };

    const noPool = await silentServer();
    try {
      installPep(noPool, pep);
      assert.doesNotThrow(() => {
        registerGrantRoutes(noPool, {
          pool: null,
          clock: CLOCK,
          ids: sequentialIds(0),
          engineKey: { reveal: () => "k".repeat(64) },
        });
      }, "registerGrantRoutes mounts with a null deps pool");
      const carol = hx.sessions["carol"] as Session;
      const alice = hx.sessions["alice"] as Session;
      const carolPost = await call(noPool, "POST", "/api/v1/grants", carol, b1());
      assert.equal(carolPost.statusCode, 503, "carol gets 503 without a deps pool");
      assert.equal(asError(carolPost).code, "AUTHZ_UNAVAILABLE");
      const alicePost = await call(noPool, "POST", "/api/v1/grants", alice, b1());
      assert.equal(alicePost.statusCode, 403, "alice is still refused by the PEP");
      assert.equal(asError(alicePost).code, "FORBIDDEN");
    } finally {
      await noPool.close();
    }

    const grantDeps = (seed: number): GrantDeps => ({
      ids: sequentialIds(seed),
      clock: CLOCK,
      catalogueFor: (ctx) => loadRegistryCatalogue(hx.db.appPool, ctx),
    });
    const nodeRecord = (id: number, carolUserId: string): GrantRecord => ({
      id: G(id),
      subject: { kind: "role", role: "author" },
      tool: "acme.create_payment@1",
      scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
      args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      fingerprints: [FPA],
      state: "active",
      createdBy: carolUserId,
      createdAt: AT,
      revokedBy: null,
      revokedAt: null,
    });

    const seeded0 = await withTenantTx(hx.db.appPool, hx.a, (tx) =>
      createGrant(tx, hx.a, {
        subject: { kind: "role", role: "author" },
        tool: "acme.create_payment@1",
        scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
        args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      }, CAROL_ACTOR, grantDeps(0)),
    );
    const seeded1 = await withTenantTx(hx.db.appPool, hx.a, (tx) =>
      createGrant(tx, hx.a, {
        subject: { kind: "role", role: "author" },
        tool: "acme.create_payment@1",
        scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
        args: [{ arg: "amount", op: "lte", value: 1000.5 }],
      }, CAROL_ACTOR, grantDeps(1)),
    );

    const noKey = await silentServer();
    try {
      installPep(noKey, pep);
      assert.doesNotThrow(() => {
        registerGrantRoutes(noKey, {
          pool: hx.db.appPool,
          clock: CLOCK,
          ids: sequentialIds(2),
          engineKey: null,
        });
      }, "registerGrantRoutes mounts without an engine key");
      const carol = hx.sessions["carol"] as Session;

      const limitOne = await call(noKey, "GET", "/api/v1/grants?limit=1", carol);
      assert.equal(limitOne.statusCode, 503, "paging without the key is refused");
      assert.equal(asError(limitOne).code, "ENGINE_KEY_REQUIRED");
      const cursorGuest = await call(noKey, "GET", "/api/v1/grants?cursor=abc", carol);
      assert.equal(cursorGuest.statusCode, 503, "a cursor without the key is refused");
      assert.equal(asError(cursorGuest).code, "ENGINE_KEY_REQUIRED");

      const both = await call(noKey, "GET", "/api/v1/grants?limit=2", carol);
      assert.equal(both.statusCode, 200, "two rows fit the page limit without the key");
      assert.deepEqual(both.json() as unknown, {
        items: [
          { grant: seeded0, status: "active" },
          { grant: seeded1, status: "active" },
        ],
        next_cursor: null,
      });

      const second = await call(noKey, "POST", "/api/v1/grants", carol, b1());
      assert.equal(second.statusCode, 201, "the unkeyed create without the engine key answers");
      assert.deepEqual(
        second.json() as GrantRecord,
        nodeRecord(2, carol.userId),
        "the created grant is the third of the sequence",
      );

      const confirm = await call(noKey, "POST", `/api/v1/grants/${G(0)}/confirm`, carol, {});
      assert.equal(confirm.statusCode, 200, "the confirm answers without the engine key");
      assert.deepEqual(confirm.json() as GrantRecord, seeded0);

      const recon = await call(
        noKey,
        "GET",
        `/api/v1/grants/reconfirmations?from=${hx.h1}&to=${hx.h1}`,
        carol,
      );
      assert.equal(recon.statusCode, 200, "the reconfirmations answer without the engine key");
      assert.deepEqual(recon.json() as unknown, { items: [] });

      const del = await call(noKey, "DELETE", `/api/v1/grants/${G(1)}`, carol);
      assert.equal(del.statusCode, 200, "the revoke answers without the engine key");
      const revoked1: GrantRecord = {
        ...seeded1,
        state: "revoked",
        revokedBy: carol.userId,
        revokedAt: AT,
      };
      assert.deepEqual(del.json() as GrantRecord, revoked1);
    } finally {
      await noKey.close();
    }
  } finally {
    await hx.db.close();
  }
});
