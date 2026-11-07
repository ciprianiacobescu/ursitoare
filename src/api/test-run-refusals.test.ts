import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { testRunInvokers } from "../interpreter/index.ts";
import type { InterpreterDeps } from "../interpreter/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { loadRegistryCatalogue } from "../registry/index.ts";
import { createEffectIntents, createRunStore } from "../runs/index.ts";
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
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registerTestRunRoutes, registryVersionLoader } from "./test-run-routes.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const LOOKUP_OK = { vendor_id: "v1", status: "active" };
const PAID = PAY_ONCE_PAID_OUTPUT;
const MOCKS = { lookup: [{ output: LOOKUP_OK }], pay: [{ output: PAID }] };
const LLM_MOCKS = {
  fetch_invoice: [{ output: { invoice_id: "inv-1", raw_text: "t" } }],
  lookup_vendor: [{ output: LOOKUP_OK }],
  pay: [{ output: PAID }],
  notify_rejection: [{ output: { message_id: "m1" } }],
};

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  seed: MockRunSeed;
  sessions: Record<string, Session>;
  deps: InterpreterDeps;
  engine: PolicyEngine;
  enqueue: { fail: boolean; calls: unknown[] };
}

async function createHarness(): Promise<Harness> {
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
  await seedFlowActors(
    db,
    b,
    [{ subject: "mallory", roles: ["author"], teams: ["finance"] }],
    clock,
  );
  const seed = await seedMockRunFlows(db, a, clock);

  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "dave", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, clock);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", clock);

  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });

  const enqueue: Harness["enqueue"] = { fail: false, calls: [] };
  const store = createRunStore(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(...args: unknown[]): Promise<void> {
        if (enqueue.fail) {
          throw new Error("down");
        }
        enqueue.calls.push(args);
      },
    },
    loadVersion: registryVersionLoader(db.appPool),
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
    invokerFor: testRunInvokers(store),
    effects: createEffectIntents(db.appPool),
    clock,
    ids: sequentialIds(0),
  };

  return { db, a, clock, seed, sessions, deps, engine, enqueue };
}

async function makeServer(
  h: Harness,
  interpreter: InterpreterDeps | null,
): Promise<FastifyInstance> {
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: h.db.appPool,
    engine: h.engine,
    clock: h.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerTestRunRoutes(server, {
      pool: h.db.appPool,
      clock: h.clock,
      ids: h.deps.ids,
      interpreter,
    });
  }, "registerTestRunRoutes");
  return server;
}

function post(
  h: Harness,
  server: FastifyInstance,
  who: string,
  flowId: string,
  hash: string,
  body: unknown,
  opts: { cookie?: boolean; csrf?: boolean } = {},
) {
  const session = h.sessions[who] as Session;
  const headers: Record<string, string> = {};
  if (opts.cookie !== false) headers["cookie"] = session.cookie;
  if (opts.csrf !== false) headers["x-csrf-token"] = session.csrfToken;
  return server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions/${hash}/test`,
    headers,
    payload: body as object,
  });
}

async function runCount(h: Harness): Promise<number> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.run");
    return (res.rows[0] as { n: number }).n;
  });
}

test("C-7d9b0050 versions, bodies and mocks are refused before a run exists", async () => {
  const h = await createHarness();
  const server = await makeServer(h, h.deps);
  try {
    const draft = await post(h, server, "alice", "pay-once", h.seed.draft, {
      input: PAY_ONCE_INPUT,
      mocks: MOCKS,
    });
    assert.equal(draft.statusCode, 422);
    const draftError = draft.json() as ErrorBody;
    assert.equal(draftError.error.code, "OPERATION_REFUSED");
    assert.deepEqual(draftError.error.details, {
      reason: "version_not_runnable",
      cause: "draft",
    });

    const llm = await post(h, server, "alice", "rf-1-core", h.seed.llm, {
      input: { invoice_id: "inv-1" },
      mocks: LLM_MOCKS,
    });
    assert.equal(llm.statusCode, 422);
    const llmError = llm.json() as ErrorBody;
    assert.equal(llmError.error.code, "OPERATION_REFUSED");
    assert.deepEqual(llmError.error.details, {
      reason: "kind_unsupported",
      kinds: ["llm.decide", "llm.extract"],
    });

    const badInput = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: { vendor: "Acme" },
      mocks: MOCKS,
    });
    assert.equal(badInput.statusCode, 400);
    const badInputError = badInput.json() as ErrorBody;
    assert.equal(badInputError.error.code, "VALIDATION_FAILED");
    assert.deepEqual(badInputError.error.details, {
      fields: [
        {
          field: "body/input",
          message: "must satisfy the flow inputs (/ required)",
        },
      ],
    });

    const noMocks = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
    });
    assert.equal(noMocks.statusCode, 400);
    assert.equal((noMocks.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    const mocksArray = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      mocks: [],
    });
    assert.equal(mocksArray.statusCode, 400);
    assert.equal((mocksArray.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    const extraProperty = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      mocks: MOCKS,
      x: 1,
    });
    assert.equal(extraProperty.statusCode, 400);
    assert.equal((extraProperty.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    const notJson = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: { ...PAY_ONCE_INPUT, vendor: "a\u0000b" },
      mocks: MOCKS,
    });
    assert.equal(notJson.statusCode, 400);
    const notJsonError = notJson.json() as ErrorBody;
    assert.equal(notJsonError.error.code, "VALIDATION_FAILED");
    assert.deepEqual(notJsonError.error.details, {
      fields: [{ field: "body", message: "must be plain JSON of at most 1 MiB" }],
    });

    const missing = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      mocks: {},
    });
    assert.equal(missing.statusCode, 422);
    const missingError = missing.json() as ErrorBody;
    assert.equal(missingError.error.code, "TEST_MOCK_MISSING");
    assert.equal(missingError.error.message, "A block node has no mock");
    assert.deepEqual(missingError.error.details, { nodes: ["lookup", "pay"] });

    const invalid = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      mocks: {
        lookup: [{ output: { status: "active" } }],
        pay: [{ output: PAID }],
      },
    });
    assert.equal(invalid.statusCode, 422);
    const invalidError = invalid.json() as ErrorBody;
    assert.equal(invalidError.error.code, "TEST_MOCK_INVALID");
    assert.equal(invalidError.error.message, "A mock does not fit its node");
    assert.deepEqual(invalidError.error.details, {
      problems: [
        { nodeId: "lookup", index: 0, reason: "schema", detail: "/ required" },
      ],
    });

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueue.calls.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-7d9b0050 kind_unsupported no longer lists code", async () => {
  const h = await createHarness();
  const server = await makeServer(h, h.deps);
  try {
    const res = await post(h, server, "alice", "rf-1-core", h.seed.llm, {
      input: { invoice_id: "inv-1" },
      mocks: LLM_MOCKS,
    });
    assert.equal(res.statusCode, 422);
    const body = res.json() as ErrorBody;
    assert.equal(body.error.code, "OPERATION_REFUSED");
    assert.deepEqual(body.error.details, {
      reason: "kind_unsupported",
      kinds: ["llm.decide", "llm.extract"],
    });
    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueue.calls.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-de412456 who may test which flow and what is refused before a run", async () => {
  const h = await createHarness();
  const server = await makeServer(h, h.deps);
  const body = { input: PAY_ONCE_INPUT, mocks: MOCKS };
  try {
    for (const who of ["bob", "dave", "carol"]) {
      const res = await post(h, server, who, "pay-once", h.seed.validated, body);
      assert.equal(res.statusCode, 403, `${who} is forbidden`);
      const error = res.json() as ErrorBody;
      assert.equal(error.error.code, "FORBIDDEN");
      assert.equal(typeof error.error.details?.["decisionId"], "string");
    }

    const mallory = await post(h, server, "mallory", "pay-once", h.seed.validated, body);
    assert.equal(mallory.statusCode, 404);
    assert.equal((mallory.json() as ErrorBody).error.code, "NOT_FOUND");

    const noCookie = await post(h, server, "alice", "pay-once", h.seed.validated, body, {
      cookie: false,
    });
    assert.equal(noCookie.statusCode, 401);
    assert.equal((noCookie.json() as ErrorBody).error.code, "UNAUTHENTICATED");

    const noCsrf = await post(h, server, "alice", "pay-once", h.seed.validated, body, {
      csrf: false,
    });
    assert.equal(noCsrf.statusCode, 403);
    assert.equal((noCsrf.json() as ErrorBody).error.code, "CSRF_INVALID");

    const noFlow = await post(h, server, "alice", "nope", h.seed.validated, body);
    assert.equal(noFlow.statusCode, 404);
    assert.equal((noFlow.json() as ErrorBody).error.code, "NOT_FOUND");

    const unknownHash = await post(
      h,
      server,
      "alice",
      "pay-once",
      "sha256:" + "0".repeat(64),
      body,
    );
    assert.equal(unknownHash.statusCode, 404);
    assert.equal((unknownHash.json() as ErrorBody).error.code, "NOT_FOUND");

    const badHash = await post(h, server, "alice", "pay-once", "sha256:xyz", body);
    assert.equal(badHash.statusCode, 400);
    assert.equal((badHash.json() as ErrorBody).error.code, "VALIDATION_FAILED");

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueue.calls.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-7d9b0050 a failing enqueue and a missing runtime answer 503", async () => {
  const h = await createHarness();
  const server = await makeServer(h, h.deps);
  const body = { input: PAY_ONCE_INPUT, mocks: MOCKS };
  try {
    h.enqueue.fail = true;
    const res = await post(h, server, "alice", "pay-once", h.seed.validated, body);
    assert.equal(res.statusCode, 503);
    const errorBody = res.json() as ErrorBody;
    assert.equal(errorBody.error.code, "RUNS_UNAVAILABLE");
    assert.equal(JSON.stringify(errorBody).includes("down"), false);

    const rows = await withTenantTx(h.db.ownerPool, h.a, async (tx) => {
      const query = await tx.query("SELECT state, error FROM ursitoare.run");
      return query.rows as { state: string; error: { code: string } | null }[];
    });
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.state, "failed");
    assert.equal(rows[0]?.error?.code, "INTERPRETER_UNBOUND");

    const noInterpreter = await makeServer(h, null);
    try {
      const unavailable = await post(h, noInterpreter, "alice", "pay-once", h.seed.validated, body);
      assert.equal(unavailable.statusCode, 503);
      assert.equal((unavailable.json() as ErrorBody).error.code, "RUNS_UNAVAILABLE");
    } finally {
      await noInterpreter.close();
    }

    const noDurable = await makeServer(h, { ...h.deps, durable: null });
    try {
      const unavailable = await post(h, noDurable, "alice", "pay-once", h.seed.validated, body);
      assert.equal(unavailable.statusCode, 503);
      assert.equal((unavailable.json() as ErrorBody).error.code, "RUNS_UNAVAILABLE");
    } finally {
      await noDurable.close();
    }

    assert.equal(await runCount(h), 1);
    assert.equal(h.enqueue.calls.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});
