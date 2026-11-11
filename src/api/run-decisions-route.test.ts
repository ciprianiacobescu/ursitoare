import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { testRunInvokers } from "../interpreter/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir, recordDecision } from "../pdp/index.ts";
import type { Decision, PolicyEngine, PolicyRequest } from "../pdp/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import { createEffectIntents, createRunStore } from "../runs/index.ts";
import type { TenantPool } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import {
  PAY_ONCE_INPUT,
  PAY_ONCE_PAID_OUTPUT,
} from "../../test/support/crash/pay-once.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { seedMockRunFlows } from "../../test/support/mock-run-seed.ts";
import type { MockRunSeed } from "../../test/support/mock-run-seed.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerDryRunRoutes } from "./dry-run-routes.ts";
import { installPep } from "./pep.ts";
import { registerRunDecisionRoutes } from "./run-decisions.ts";
import { buildServer } from "./server.ts";
import { registryVersionLoader } from "./test-run-routes.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const RUN_0 = "run_00000000-0000-7000-8000-000000000000";
const RUN_1 = "run_00000000-0000-7000-8000-000000000001";
const FK = { pay: [{ output: PAY_ONCE_PAID_OUTPUT }] };
const S = "87caf624-f579-8435-9540-24d6eb57aeff";
const V64 = "b".repeat(64);
const PL = {
  method: "POST",
  host: "tools.fake.test",
  path: "/blocks/erp.lookup_vendor@1",
  bodyDigest: "9".repeat(64),
  serviceId: S,
  ttlSeconds: 60,
};
const PP = { ...PL, path: "/blocks/erp.create_payment@1" };
const KEY: KeyMaterial = { reveal: () => "k".repeat(40) };

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface DecisionItem {
  decisionId: string;
  decidedAt: string;
  nodeId: string | null;
  resource: string;
  decision: string;
  reasons: string[];
  policySetVersion: string;
  permit: Record<string, unknown> | null;
}

interface PageBody {
  items: DecisionItem[];
  next_cursor: string | null;
}

interface Field {
  field: string;
  message: string;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: { fields?: Field[] };
  };
}

interface Stack {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  seed: MockRunSeed;
  sessions: Record<string, Session>;
  deps: InterpreterDeps;
  engine: PolicyEngine;
}

interface Variant {
  pool?: TenantPool | null;
  engineKey?: KeyMaterial | null;
}

async function createStack(): Promise<Stack> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: ["finance"] },
      { subject: "bob", roles: ["approver"], teams: ["finance"] },
      { subject: "dave", roles: ["author"], teams: ["ops"] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["author"], teams: ["finance"] }], clock);
  const seed = await seedMockRunFlows(db, a, clock);

  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "dave", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);

  const engine: PolicyEngine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });

  const store = createRunStore(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(): Promise<void> {},
    },
    loadVersion: registryVersionLoader(db.appPool),
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
    invokerFor: testRunInvokers(store),
    effects: createEffectIntents(db.appPool),
    clock,
    ids: sequentialIds(0),
  };

  return { db, a, clock, seed, sessions, deps, engine };
}

async function startServer(s: Stack, variant: Variant = {}): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: s.db.appPool,
    engine: s.engine,
    clock: s.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerDryRunRoutes(server, {
      pool: s.db.appPool,
      clock: s.clock,
      ids: s.deps.ids,
      interpreter: s.deps,
      enabled: true,
    });
  }, "registerDryRunRoutes");
  assert.doesNotThrow(() => {
    registerRunDecisionRoutes(server, {
      pool: variant.pool !== undefined ? variant.pool : s.db.appPool,
      engineKey: variant.engineKey !== undefined ? variant.engineKey : KEY,
    });
  }, "registerRunDecisionRoutes");
  return server;
}

async function closeServer(server: FastifyInstance, s: Stack): Promise<void> {
  await server.close();
  await s.db.close();
}

async function dryRun(s: Stack, server: FastifyInstance, who: string): Promise<void> {
  const session = s.sessions[who] as Session;
  const res = await server.inject({
    method: "POST",
    url: `/api/v1/flows/pay-once/versions/${s.seed.validated}/dry-run`,
    headers: { cookie: session.cookie, "x-csrf-token": session.csrfToken },
    payload: { input: PAY_ONCE_INPUT, fakes: FK },
  });
  assert.equal(res.statusCode, 202, "the dry run starts the run the decisions belong to");
}

function requestFor(resourceNode: string): PolicyRequest {
  return {
    principal: { type: "User", id: "tenant_a/alice" },
    action: "invoke_tool",
    resource: { type: "Block", id: `tenant_a/pay-once/${resourceNode}` },
    context: {},
    entities: [],
  };
}

async function record(
  s: Stack,
  decision: Decision,
  node: string,
): Promise<void> {
  const stored = await withTenantTx(s.db.appPool, s.a, (tx) =>
    recordDecision(tx, s.a, decision, requestFor(node), {
      runId: RUN_0,
      nodeId: node,
    }),
  );
  assert.equal(stored, true, `decision ${decision.decisionId} was recorded`);
}

async function seedDecisions(s: Stack): Promise<void> {
  await record(
    s,
    {
      decision: "allow",
      decisionId: "d_1",
      decidedAt: "2026-11-02T10:00:01.000Z",
      reasons: ["g-lookup"],
      errors: [],
      policySetVersion: V64,
      permit: { ...PL },
    },
    "lookup",
  );
  await record(
    s,
    {
      decision: "deny",
      decisionId: "d_2",
      decidedAt: "2026-11-02T10:00:02.000Z",
      reasons: [],
      errors: [],
      policySetVersion: V64,
    },
    "pay",
  );
  await record(
    s,
    {
      decision: "allow",
      decisionId: "d_3",
      decidedAt: "2026-11-02T10:00:03.000Z",
      reasons: ["g-pay"],
      errors: [],
      policySetVersion: V64,
      permit: { ...PP },
    },
    "pay",
  );
}

function decisionsUrl(runId: string): string {
  return `/api/v1/runs/${runId}/decisions`;
}

function withCursor(url: string, cursor: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}cursor=${encodeURIComponent(cursor)}`;
}

function get(
  s: Stack,
  server: FastifyInstance,
  who: string,
  url: string,
) {
  const session = s.sessions[who] as Session;
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

function pageOf(response: { json(): unknown }): PageBody {
  return response.json() as PageBody;
}

function errorOf(response: { json(): unknown }): ErrorBody["error"] {
  return (response.json() as ErrorBody).error;
}

function idsOf(items: readonly DecisionItem[]): string[] {
  return items.map((item) => item.decisionId);
}

const DEC1: DecisionItem = {
  decisionId: "d_1",
  decidedAt: "2026-11-02T10:00:01.000000Z",
  nodeId: "lookup",
  resource: 'Block::"tenant_a/pay-once/lookup"',
  decision: "allow",
  reasons: ["g-lookup"],
  policySetVersion: V64,
  permit: { ...PL },
};
const DEC2: DecisionItem = {
  decisionId: "d_2",
  decidedAt: "2026-11-02T10:00:02.000000Z",
  nodeId: "pay",
  resource: 'Block::"tenant_a/pay-once/pay"',
  decision: "deny",
  reasons: [],
  policySetVersion: V64,
  permit: null,
};
const DEC3: DecisionItem = {
  decisionId: "d_3",
  decidedAt: "2026-11-02T10:00:03.000000Z",
  nodeId: "pay",
  resource: 'Block::"tenant_a/pay-once/pay"',
  decision: "allow",
  reasons: ["g-pay"],
  policySetVersion: V64,
  permit: { ...PP },
};

test("C-0276eeb1 the owner team and the initiator read a run's decisions", async () => {
  const s = await createStack();
  const server = await startServer(s);
  try {
    await dryRun(s, server, "alice");
    await dryRun(s, server, "alice");
    await seedDecisions(s);

    for (const who of ["alice", "bob"]) {
      const res = await get(s, server, who, decisionsUrl(RUN_0));
      assert.equal(res.statusCode, 200, `${who} reads the run`);
      const page = pageOf(res);
      assert.deepEqual(page.items, [DEC1, DEC2, DEC3], `${who} gets the three views in order`);
      assert.equal(page.next_cursor, null, `${who} gets one page`);
    }

    for (const who of ["dave", "carol"]) {
      const res = await get(s, server, who, decisionsUrl(RUN_0));
      assert.equal(res.statusCode, 403, `${who} is forbidden`);
      assert.equal(errorOf(res).code, "FORBIDDEN", `${who} is refused by the policy point`);
    }

    const mallory = await get(s, server, "mallory", decisionsUrl(RUN_0));
    assert.equal(mallory.statusCode, 404, "a run of another tenant is not found");
    assert.equal(errorOf(mallory).code, "NOT_FOUND");

    const unknown = await get(s, server, "alice", decisionsUrl("run_nope"));
    assert.equal(unknown.statusCode, 404, "an unknown run is not found");
    assert.equal(errorOf(unknown).code, "NOT_FOUND");

    const empty = await get(s, server, "alice", decisionsUrl(RUN_1));
    assert.equal(empty.statusCode, 200, "a run without decisions is read");
    assert.deepEqual(pageOf(empty), { items: [], next_cursor: null });
  } finally {
    await closeServer(server, s);
  }
});

test("C-0276eeb1 run decision pages are bound to the run", async () => {
  const s = await createStack();
  const server = await startServer(s);
  try {
    await dryRun(s, server, "alice");
    await dryRun(s, server, "alice");
    await seedDecisions(s);

    const first = await get(s, server, "alice", `${decisionsUrl(RUN_0)}?limit=2`);
    assert.equal(first.statusCode, 200, "the first page answers 200");
    const firstPage = pageOf(first);
    assert.deepEqual(idsOf(firstPage.items), ["d_1", "d_2"], "the first page holds the first two");
    assert.equal(typeof firstPage.next_cursor, "string", "the first page carries a cursor");
    assert.notEqual(firstPage.next_cursor, "", "the cursor is not empty");

    const second = await get(
      s,
      server,
      "alice",
      withCursor(decisionsUrl(RUN_0), firstPage.next_cursor ?? ""),
    );
    assert.equal(second.statusCode, 200, "the second page answers 200");
    assert.deepEqual(idsOf(pageOf(second).items), ["d_3"], "the second page holds the third");
    assert.equal(pageOf(second).next_cursor, null, "the second page is the last");

    const tooLarge = await get(s, server, "alice", `${decisionsUrl(RUN_0)}?limit=200`);
    assert.equal(tooLarge.statusCode, 400, "limit 200 is refused");
    assert.equal(errorOf(tooLarge).code, "VALIDATION_FAILED");
    assert.deepEqual(
      errorOf(tooLarge).details?.fields,
      [{ field: "querystring/limit", message: "must be <= 100" }],
      "the refusal names the limit field",
    );

    const badCursor = await get(s, server, "alice", `${decisionsUrl(RUN_0)}?cursor=abc`);
    assert.equal(badCursor.statusCode, 400, "a malformed cursor is refused");
    assert.equal(errorOf(badCursor).code, "CURSOR_INVALID");

    const foreign = await get(
      s,
      server,
      "alice",
      withCursor(decisionsUrl(RUN_1), firstPage.next_cursor ?? ""),
    );
    assert.equal(foreign.statusCode, 400, "a cursor of another run is refused");
    assert.equal(errorOf(foreign).code, "CURSOR_INVALID");
  } finally {
    await closeServer(server, s);
  }
});

test("C-0276eeb1 a run decision list without an engine key serves one page", async () => {
  const s = await createStack();
  const server = await startServer(s, { engineKey: null });
  try {
    await dryRun(s, server, "alice");
    await dryRun(s, server, "alice");
    await seedDecisions(s);

    const second = await get(s, server, "alice", `${decisionsUrl(RUN_0)}?limit=2`);
    assert.equal(second.statusCode, 503, "a second page needs the engine key");
    assert.equal(errorOf(second).code, "ENGINE_KEY_REQUIRED");

    const cursor = await get(s, server, "alice", `${decisionsUrl(RUN_0)}?cursor=abc`);
    assert.equal(cursor.statusCode, 503, "a cursor without the engine key is refused");
    assert.equal(errorOf(cursor).code, "ENGINE_KEY_REQUIRED");

    const full = await get(s, server, "alice", decisionsUrl(RUN_0));
    assert.equal(full.statusCode, 200, "a list that fits one page is served");
    assert.deepEqual(idsOf(pageOf(full).items), ["d_1", "d_2", "d_3"], "all rows are served");
    assert.equal(pageOf(full).next_cursor, null, "the single page has no cursor");
  } finally {
    await closeServer(server, s);
  }
});

test("C-0276eeb1 a run decision list without a pool answers RUNS_UNAVAILABLE", async () => {
  const s = await createStack();
  const server = await startServer(s, { pool: null });
  try {
    await dryRun(s, server, "alice");
    await seedDecisions(s);

    const res = await get(s, server, "alice", decisionsUrl(RUN_0));
    assert.equal(res.statusCode, 503, "a server without a pool refuses the list");
    assert.equal(errorOf(res).code, "RUNS_UNAVAILABLE");
  } finally {
    await closeServer(server, s);
  }
});
