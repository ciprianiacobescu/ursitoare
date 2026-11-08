import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { KeyMaterial } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine, defaultSrcDir } from "../pdp/index.ts";
import { idemKey, payloadDigest, stepRepository } from "../runs/index.ts";
import type { NewRun, StepHookEntry, StepHooks, TenantPool } from "../runs/index.ts";
import { runRepository } from "../runs/index.ts";
import type { StepWrite } from "../runs/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { servedOpenApiText, OPENAPI_FILE } from "../../test/support/openapi-docs.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { installPep } from "./pep.ts";
import { registerRunRoutes } from "./run-routes.ts";
import { toStepView } from "./run-views.ts";
import type { StepView } from "./run-views.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof registerRunRoutes, "function");
assert.equal(typeof servedOpenApiText, "function");
assert.equal(typeof OPENAPI_FILE, "string");
assert.equal(typeof toStepView, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-02T10:00:00Z";
const FLOW_HASH = "sha256:" + "a".repeat(64);
const AT = new Date("2026-11-02T10:00:00.000Z");
const INPUT_ORIGINAL = { vendor_name: "  Acme " };
const TRIMMED = { vendor_name: "Acme" };
const D_ORIGINAL = "364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b";
const D_TRIMMED = "1f19c0e68ba33e917a5cee0413aec2965a2fcecb63a8c97784998936bd6f67f6";
const K_SEND = idemKey("tenant_a", "run-1", "send", 0, 0);
const RUN_ID = "run-1";
const STEP_VIEW_KEYS = [
  "seq",
  "nodeId",
  "kind",
  "effectSeq",
  "attempt",
  "state",
  "outcome",
  "error",
  "inputRef",
  "outputRef",
  "idemKey",
  "policyDecisionId",
  "taint",
  "startedAt",
  "endedAt",
];

assert.equal(payloadDigest(INPUT_ORIGINAL), D_ORIGINAL);
assert.equal(payloadDigest(TRIMMED), D_TRIMMED);

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string };
}

interface StepPage {
  items: StepView[];
  next_cursor: string | null;
}

function E(label: string, over: Partial<StepHookEntry> = {}): StepHookEntry {
  return {
    label,
    kind: "code",
    fused: true,
    attempt: 1,
    state: "completed",
    action: "continue",
    mutated: null,
    to: null,
    error: null,
    tool: null,
    idemKey: null,
    ...over,
  };
}

function stepWrite(
  runId: string,
  nodeId: string,
  seq: number,
  overrides: Partial<StepWrite> = {},
): StepWrite {
  return {
    runId,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt: 1,
    generation: 0,
    seq,
    kind: "block",
    state: "completed",
    input: null,
    output: null,
    outcome: null,
    error: null,
    taint: [],
    policyDecisionId: null,
    idemKey: null,
    startedAt: AT,
    endedAt: AT,
    ...overrides,
  };
}

function hooksOf(step: StepView): StepHooks | undefined {
  return (step as StepView & { hooks?: StepHooks }).hooks;
}

async function seedRouteFixture(h: Harness, session: Session): Promise<void> {
  const ctx = h.a;
  await withTenantTx(h.db.appPool, ctx, async (tx) => {
    const run: NewRun = {
      runId: RUN_ID,
      lineageId: RUN_ID,
      parentRunId: null,
      flowId: "hook-mutate",
      flowHash: FLOW_HASH,
      ownerTeam: "finance",
      mode: "mock",
      trigger: "test",
      principal: { userId: session.userId, kind: "human" },
      actorChain: [session.userId],
      input: TRIMMED,
      mocks: null,
    };
    const created = await runRepository.create(tx, ctx, run, new Date("2026-11-02T09:00:01Z"));
    assert.ok(created !== null, "run-1 is stored");
    await runRepository.transition(tx, ctx, RUN_ID, {
      state: "completed",
      from: ["queued"],
      at: new Date("2026-11-02T09:00:05Z"),
      output: { ok: true },
    });

    const rows: StepWrite[] = [
      stepWrite(RUN_ID, "lookup", 0, {
        input: TRIMMED,
        output: { vendor_id: "v1", status: "active" },
        hooks: {
          inputOriginal: INPUT_ORIGINAL,
          entries: [E("pre:trim_name", { mutated: "input" })],
        },
      }),
      stepWrite(RUN_ID, "pay", 1, {
        idemKey: K_SEND,
        hooks: { inputOriginal: null, entries: [E("pre:rule.rule_a"), E("post:rule.rule_a")] },
      }),
      stepWrite(RUN_ID, "done", 2, { kind: "end" }),
      stepWrite(RUN_ID, "notify", 3, {
        state: "failed",
        error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)", node: "notify" },
        hooks: {
          inputOriginal: null,
          entries: [
            E("post:tell", {
              kind: "block",
              state: "failed",
              action: null,
              error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" },
              tool: "mail.send@1",
              idemKey: K_SEND,
            }),
          ],
        },
      }),
    ];
    for (const row of rows) {
      await stepRepository.upsert(tx, ctx, row);
    }
  });
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  clock: Clock;
  sessions: Record<string, Session>;
  server: FastifyInstance;
  pool: TenantPool | null;
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(db, a, [{ subject: "alice", roles: ["author"], teams: ["finance"] }], clock);

  const sessions: Record<string, Session> = {};
  sessions["alice"] = await createTestSession(db, a, "alice", clock);

  const engine = await createPolicyEngine({
    srcDir: defaultSrcDir(),
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const keyed: KeyMaterial = { reveal: () => "k".repeat(64) };

  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  assert.doesNotThrow(() => {
    registerRunRoutes(server, {
      pool: db.appPool,
      clock,
      ids: sequentialIds(100),
      engineKey: keyed,
      durable: null,
    });
  }, "registerRunRoutes");

  return { db, a, clock, sessions, server, pool: db.appPool };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function get(server: FastifyInstance, session: Session, url: string) {
  return server.inject({ method: "GET", url, headers: { cookie: session.cookie } });
}

test("C-7ac1f21b the steps route carries the trace and the payload route keeps the original input back", async () => {
  const h = await createHarness();
  try {
    const alice = h.sessions["alice"] as Session;
    await seedRouteFixture(h, alice);

    const stored = await withTenantTx(h.db.appPool, h.a, (tx) =>
      stepRepository.list(tx, h.a, RUN_ID, { limit: 10 }),
    );
    const storedViews = stored.steps.map(toStepView);

    const response = await get(h.server, alice, `/api/v1/runs/${RUN_ID}/steps`);
    assert.equal(response.statusCode, 200);
    const page = response.json() as StepPage;
    assert.deepEqual(page.items, storedViews, "the route answers toStepView of the stored rows");

    const lookup = storedViews.find((step) => step.nodeId === "lookup");
    assert.ok(lookup !== undefined, "the list holds the lookup row");
    const lookupHooks = hooksOf(lookup);
    assert.ok(lookupHooks !== undefined, "the lookup view carries hooks");
    assert.deepEqual(
      lookupHooks,
      {
        inputOriginalRef: D_ORIGINAL,
        entries: [E("pre:trim_name", { mutated: "input" })],
      },
      "the lookup trace holds the untrimmed input digest and its pre entry",
    );
    assert.equal(
      lookupHooks.inputOriginalRef,
      D_ORIGINAL,
      "the lookup inputOriginalRef is the untrimmed input digest",
    );

    const pay = storedViews.find((step) => step.nodeId === "pay");
    assert.ok(pay !== undefined, "the list holds the pay row");
    const payHooks = hooksOf(pay);
    assert.ok(payHooks !== undefined, "the pay view carries hooks");
    assert.deepEqual(
      payHooks.entries.map((entry) => entry.label),
      ["pre:rule.rule_a", "post:rule.rule_a"],
      "the pay trace holds its two entries in order",
    );

    const done = storedViews.find((step) => step.nodeId === "done");
    assert.ok(done !== undefined, "the list holds the done row");
    assert.deepEqual(
      Object.keys(done).sort(),
      [...STEP_VIEW_KEYS].sort(),
      "the done view holds the fifteen keys of StepView",
    );
    assert.equal("hooks" in done, false, "the done view has no hooks key");

    const notify = storedViews.find((step) => step.nodeId === "notify");
    assert.ok(notify !== undefined, "the list holds the notify row");
    const notifyHooks = hooksOf(notify);
    assert.ok(notifyHooks !== undefined, "the failed notify view carries hooks");
    const notifyEntry = notifyHooks.entries[0];
    assert.ok(notifyEntry !== undefined, "the notify trace holds its one entry");
    assert.deepEqual(
      notifyEntry,
      E("post:tell", {
        kind: "block",
        state: "failed",
        action: null,
        error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" },
        tool: "mail.send@1",
        idemKey: K_SEND,
      }),
      "the block entry comes back member for member",
    );

    const hidden = await get(h.server, alice, `/api/v1/runs/${RUN_ID}/payloads/${D_ORIGINAL}`);
    assert.equal(hidden.statusCode, 404, "the original input is not served by the payload route");
    assert.equal((hidden.json() as ErrorBody).error.code, "NOT_FOUND");

    const stepInput = await get(h.server, alice, `/api/v1/runs/${RUN_ID}/payloads/${D_TRIMMED}`);
    assert.equal(stepInput.statusCode, 200, "the step input payload is still served");
    assert.deepEqual((stepInput.json() as { data: unknown }).data, TRIMMED);
  } finally {
    await closeHarness(h);
  }
});

test("C-7ac1f21b the served OpenAPI step item lists hooks in properties and not in required", async () => {
  assert.ok(
    existsSync(OPENAPI_FILE),
    "docs/api/openapi.json exists; run node test/support/openapi-docs.ts",
  );

  let served = "not run";
  await assert.doesNotReject(async () => {
    served = await servedOpenApiText();
  }, "servedOpenApiText answers the rendered document");

  const committed = await readFile(OPENAPI_FILE, "utf8");
  assert.equal(
    committed,
    served,
    "the committed openapi.json equals the served text; run node test/support/openapi-docs.ts",
  );

  const document = JSON.parse(served) as unknown as {
    paths?: Record<string, {
      get?: {
        responses?: Record<string, { content?: Record<string, { schema?: unknown }> }>;
      };
    }>;
  };
  const route = document.paths?.["/api/v1/runs/{runId}/steps"];
  assert.ok(route !== undefined, "the document lists the steps route");
  const page = route["get"]?.responses?.["200"]?.content?.["application/json"]?.schema;
  assert.ok(page !== undefined, "the document describes the steps page");
  const pageProperties = (page as { properties?: Record<string, unknown> }).properties;
  assert.ok(pageProperties !== undefined, "the steps page describes its members");
  const items = pageProperties["items"] as { items?: unknown } | undefined;
  assert.ok(items !== undefined, "the steps page describes the items array");
  const stepItem = (items["items"] as {
    properties?: Record<string, unknown>;
    required?: unknown;
  } | undefined);
  assert.ok(stepItem !== undefined, "the document describes a step item");

  assert.deepEqual(
    stepItem["required"],
    STEP_VIEW_KEYS,
    "the step item keeps the fifteen fields required and hooks out of required",
  );
  const stepProperties = stepItem["properties"];
  assert.ok(stepProperties !== undefined, "the step item describes its members");
  assert.deepEqual(
    Object.keys(stepProperties),
    [...STEP_VIEW_KEYS, "hooks"],
    "the step item lists hooks after the fifteen fields",
  );
  assert.ok(stepProperties["hooks"] !== undefined, "the step item describes hooks");
});
