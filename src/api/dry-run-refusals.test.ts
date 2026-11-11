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
import { buildServer } from "./server.ts";
import { registryVersionLoader } from "./test-run-routes.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const FK = { pay: [{ output: PAY_ONCE_PAID_OUTPUT }] };
const UNKNOWN_HASH = "sha256:" + "0".repeat(64);

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Field {
  field: string;
  message: string;
}

interface ErrorBody {
  error: {
    code: string;
    message: string;
    details?: { fields?: Field[]; [name: string]: unknown };
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
  enqueued: { workflow: string; workflowId: string; input: unknown }[];
}

interface Variant {
  enabled?: boolean;
  interpreter?: InterpreterDeps | null;
  pool?: TenantPool | null;
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

  const enqueued: Stack["enqueued"] = [];
  const store = createRunStore(db.appPool);
  const deps: InterpreterDeps = {
    store,
    durable: {
      async enqueue(workflow, workflowId, input): Promise<void> {
        enqueued.push({ workflow, workflowId, input });
      },
    },
    loadVersion: registryVersionLoader(db.appPool),
    catalogueFor: (ctx) => loadRegistryCatalogue(db.appPool, ctx),
    invokerFor: testRunInvokers(store),
    effects: createEffectIntents(db.appPool),
    clock,
    ids: sequentialIds(0),
  };

  return { db, a, clock, seed, sessions, deps, engine, enqueued };
}

async function startDryServer(s: Stack, variant: Variant = {}): Promise<FastifyInstance> {
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
      pool: variant.pool !== undefined ? variant.pool : s.db.appPool,
      clock: s.clock,
      ids: s.deps.ids,
      interpreter: variant.interpreter !== undefined ? variant.interpreter : s.deps,
      enabled: variant.enabled !== undefined ? variant.enabled : true,
    });
  }, "registerDryRunRoutes");
  return server;
}

function post(
  h: Stack,
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
    url: `/api/v1/flows/${flowId}/versions/${hash}/dry-run`,
    headers,
    payload: body as object,
  });
}

async function runCount(h: Stack): Promise<number> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const res = await tx.query("SELECT count(*)::int AS n FROM ursitoare.run");
    return (res.rows[0] as { n: number }).n;
  });
}

function fieldsOf(response: { json(): unknown }): Field[] {
  const body = response.json() as ErrorBody;
  const fields = body.error.details?.fields;
  assert.ok(Array.isArray(fields), "the error names fields");
  return fields;
}

test("C-0478f271 R1 to R6 callers and versions are refused before a run", async () => {
  const h = await createStack();
  const server = await startDryServer(h);
  try {
    const body = { input: PAY_ONCE_INPUT, fakes: FK };
    for (const who of ["bob", "dave", "carol"]) {
      const res = await post(h, server, who, "pay-once", h.seed.validated, body);
      assert.equal(res.statusCode, 403, `${who} is forbidden`);
      const err = res.json() as ErrorBody;
      assert.equal(err.error.code, "FORBIDDEN");
      assert.equal(typeof err.error.details?.["decisionId"], "string");
    }

    const mallory = await post(h, server, "mallory", "pay-once", h.seed.validated, body);
    assert.equal(mallory.statusCode, 404);
    assert.equal((mallory.json() as ErrorBody).error.code, "NOT_FOUND");

    const draft = await post(h, server, "alice", "pay-once", h.seed.draft, body);
    assert.equal(draft.statusCode, 422);
    const draftError = draft.json() as ErrorBody;
    assert.equal(draftError.error.code, "OPERATION_REFUSED");
    assert.deepEqual(draftError.error.details, {
      reason: "version_not_runnable",
      cause: "draft",
    });

    const noHash = await post(h, server, "alice", "pay-once", UNKNOWN_HASH, body);
    assert.equal(noHash.statusCode, 404);
    assert.equal((noHash.json() as ErrorBody).error.code, "NOT_FOUND");

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueued.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-0478f271 R7 to R13 fakes and bodies are validated before a run", async () => {
  const h = await createStack();
  const server = await startDryServer(h);
  try {
    const missingFake = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: {},
    });
    assert.equal(missingFake.statusCode, 400);
    assert.equal((missingFake.json() as ErrorBody).error.code, "VALIDATION_FAILED");
    assert.deepEqual(fieldsOf(missingFake), [
      { field: "body/fakes/pay", message: "missing: no fake entry" },
    ]);

    const manyProblems = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: {
        pay: [{ output: { payment_id: "x" } }, { nope: 1 }],
        lookup: [],
        ghost: [],
      },
    });
    assert.equal(manyProblems.statusCode, 400);
    assert.equal((manyProblems.json() as ErrorBody).error.code, "VALIDATION_FAILED");
    assert.deepEqual(fieldsOf(manyProblems), [
      { field: "body/fakes/ghost", message: "unknown_node: no such node or hook" },
      {
        field: "body/fakes/lookup",
        message: "not_an_effect: only write, send and pay take a fake",
      },
      { field: "body/fakes/pay/0", message: "schema: / required" },
      {
        field: "body/fakes/pay/1",
        message: "shape: entry must be {output} or {error: {code, message}}",
      },
    ]);

    const runAs = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: FK,
      run_as: "bob",
    });
    assert.equal(runAs.statusCode, 400);
    assert.deepEqual(fieldsOf(runAs), [
      { field: "body/run_as", message: "must NOT have additional properties" },
    ]);

    const trigger = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: FK,
      trigger: "cron",
    });
    assert.equal(trigger.statusCode, 400);
    assert.deepEqual(fieldsOf(trigger), [
      { field: "body/trigger", message: "must NOT have additional properties" },
    ]);

    const noFakes = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
    });
    assert.equal(noFakes.statusCode, 400);
    assert.deepEqual(fieldsOf(noFakes), [
      { field: "body/fakes", message: "must have required property 'fakes'" },
    ]);

    const fakesArray = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: PAY_ONCE_INPUT,
      fakes: [],
    });
    assert.equal(fakesArray.statusCode, 400);
    assert.deepEqual(fieldsOf(fakesArray), [
      { field: "body/fakes", message: "must be object" },
    ]);

    const badInput = await post(h, server, "alice", "pay-once", h.seed.validated, {
      input: { vendor: "Acme" },
      fakes: FK,
    });
    assert.equal(badInput.statusCode, 400);
    assert.deepEqual(fieldsOf(badInput), [
      { field: "body/input", message: "must satisfy the flow inputs (/ required)" },
    ]);

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueued.length, 0);
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-0478f271 R14 unavailable dependencies answer 503 without a run", async () => {
  const h = await createStack();
  const body = { input: PAY_ONCE_INPUT, fakes: FK };
  const variants: { label: string; variant: Variant; who: string }[] = [
    { label: "enabled false", variant: { enabled: false }, who: "alice" },
    { label: "enabled false again", variant: { enabled: false }, who: "bob" },
    { label: "no interpreter", variant: { interpreter: null }, who: "alice" },
    { label: "no pool", variant: { pool: null }, who: "alice" },
    {
      label: "no durable runtime",
      variant: { interpreter: { ...h.deps, durable: null } },
      who: "alice",
    },
  ];
  try {
    for (const { label, variant, who } of variants) {
      const server = await startDryServer(h, variant);
      try {
        const res = await post(h, server, who, "pay-once", h.seed.validated, body);
        assert.equal(res.statusCode, 503, label);
        assert.equal((res.json() as ErrorBody).error.code, "RUNS_UNAVAILABLE", label);
      } finally {
        await server.close();
      }
    }
    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueued.length, 0);
  } finally {
    await h.db.close();
  }
});

test("C-0478f271 R15 load failures answer 500 without the message", async () => {
  const h = await createStack();
  const server = await startDryServer(h);
  const body = { input: PAY_ONCE_INPUT, fakes: FK };
  const loadVersion = h.deps.loadVersion;
  const catalogueFor = h.deps.catalogueFor;
  try {
    h.deps.loadVersion = async () => {
      throw new Error("db down");
    };
    const versionFailure = await post(h, server, "alice", "pay-once", h.seed.validated, body);
    assert.equal(versionFailure.statusCode, 500);
    assert.equal((versionFailure.json() as ErrorBody).error.code, "INTERNAL");
    assert.equal(JSON.stringify(versionFailure.json()).includes("db down"), false);

    h.deps.loadVersion = loadVersion;
    h.deps.catalogueFor = async () => {
      throw new Error("db down");
    };
    const catalogueFailure = await post(h, server, "alice", "pay-once", h.seed.validated, body);
    assert.equal(catalogueFailure.statusCode, 500);
    assert.equal((catalogueFailure.json() as ErrorBody).error.code, "INTERNAL");
    assert.equal(JSON.stringify(catalogueFailure.json()).includes("db down"), false);

    assert.equal(await runCount(h), 0);
    assert.equal(h.enqueued.length, 0);
  } finally {
    h.deps.loadVersion = loadVersion;
    h.deps.catalogueFor = catalogueFor;
    await server.close();
    await h.db.close();
  }
});
