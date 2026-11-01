import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { canonicalizeFlow, emptyCatalogue, validateFlow } from "../authoring/index.ts";
import type { Catalogue } from "../authoring/index.ts";
import { sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import { FlowError, createFlow, validateVersion } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { readTestFlowText } from "../../test/support/catalogue/flows.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { unregisteredRouteErrors } from "./error-codes.ts";
import { registerFlowRoutes } from "./flow-routes.ts";
import { installPep } from "./pep.ts";
import { listDefinedRoutes } from "./route.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-10-25T09:00:00Z";
const AT_START = "2026-10-25T09:00:00.000000Z";
const AT_LATER = "2026-10-25T09:01:00.000000Z";
const UNKNOWN_HASH = "sha256:" + "0".repeat(64);

interface MutableClock extends Clock {
  advance(seconds: number): void;
}

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  clock: MutableClock;
  alice: Session;
  server: FastifyInstance;
  catalogue: { current: () => Promise<Catalogue> };
}

interface VersionBody {
  hash: string;
  state: string;
  validatedAt: string | null;
  validationOk: boolean | null;
}

interface ValidateBody {
  version: VersionBody;
  result: { ok: boolean; errors: unknown[]; warnings: unknown[] };
}

interface DetailBody extends VersionBody {
  text: string;
  canonical: unknown;
  result: unknown;
}

interface ErrorBody {
  error: { code: string; message: string };
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function mutableClock(startIso: string): MutableClock {
  let millis = Date.parse(startIso);
  return {
    now: (): Date => new Date(millis),
    advance(seconds: number): void {
      millis += seconds * 1000;
    },
  };
}

const DEMO_FLOW = JSON.stringify({
  ursitoare: "0.1",
  flow: "demo-flow",
  version: "1.0.0",
  start: "a",
  nodes: {
    a: { kind: "block", uses: "nope.missing@1", next: "done" },
    done: { kind: "end", status: "completed" },
  },
});

async function serverOn(
  db: TestDatabase,
  clock: Clock,
  catalogueFor: ((ctx: TenantContext) => Promise<Catalogue>) | undefined,
): Promise<FastifyInstance> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-flow-validate-src-"));
  engineDirs.push(srcDir);
  const engine = await createPolicyEngine({
    srcDir,
    tenantPolicies: [
      { id: "t-all", layer: "tenant", text: '@id("t-all") permit (principal, action, resource);' },
    ],
    clock,
    ids: sequentialIds(200),
    logger: createLogger({ level: "silent", destination: silentDestination }),
  });
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  registerFlowRoutes(server, {
    pool: db.appPool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) },
    catalogueFor,
  });
  return server;
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = mutableClock(NOW);
  await seedFlowActors(db, a, [{ subject: "alice", roles: ["author"], teams: ["finance"] }], clock);
  const alice = await createTestSession(db, a, "alice", clock);
  await withTenantTx(db.appPool, a, async (tx) => {
    for (const name of ["rf-1-core", "other", "demo-flow"]) {
      await createFlow(
        tx,
        a,
        { name, ownerTeam: "finance" },
        { kind: "user", userId: alice.userId },
        { clock },
      );
    }
  });
  const catalogue = { current: async (): Promise<Catalogue> => loadTestCatalogue() };
  const server = await serverOn(db, clock, () => catalogue.current());
  return { db, a, clock, alice, server, catalogue };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

async function saveText(
  h: Harness,
  flowId: string,
  format: "yaml" | "json",
  text: string,
): Promise<string> {
  const res = await h.server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions`,
    headers: { cookie: h.alice.cookie, "x-csrf-token": h.alice.csrfToken },
    payload: { format, text },
  });
  assert.equal(res.statusCode, 201);
  return (res.json() as { version: { hash: string } }).version.hash;
}

function validate(h: Harness, flowId: string, hash: string, server: FastifyInstance = h.server) {
  return server.inject({
    method: "POST",
    url: `/api/v1/flows/${flowId}/versions/${hash}/validate`,
    headers: { cookie: h.alice.cookie, "x-csrf-token": h.alice.csrfToken },
  });
}

function read(h: Harness, flowId: string, hash: string) {
  return h.server.inject({
    method: "GET",
    url: `/api/v1/flows/${flowId}/versions/${hash}`,
    headers: { cookie: h.alice.cookie },
  });
}

test("C-5cccca9d validating over HTTP stores the result and promotes only an ok version", async () => {
  const h = await createHarness();
  try {
    const good = await saveText(h, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    const bad = await saveText(h, "demo-flow", "json", DEMO_FLOW);

    const first = await validate(h, "rf-1-core", good);
    assert.equal(first.statusCode, 200);
    const firstBody = first.json() as ValidateBody;
    assert.equal(firstBody.version.state, "validated");
    assert.equal(firstBody.version.validatedAt, AT_START);
    assert.equal(firstBody.version.validationOk, true);
    assert.equal(firstBody.result.ok, true);
    const detail = (await read(h, "rf-1-core", good)).json() as DetailBody;
    assert.deepEqual(
      firstBody.result,
      validateFlow(canonicalizeFlow(detail.canonical), loadTestCatalogue()),
    );
    assert.deepEqual(detail.result, firstBody.result);
    assert.equal(detail.validatedAt, AT_START);

    const second = await validate(h, "demo-flow", bad);
    assert.equal(second.statusCode, 200);
    const secondBody = second.json() as ValidateBody;
    assert.equal(secondBody.version.state, "draft");
    assert.equal(secondBody.version.validationOk, false);
    assert.ok(secondBody.result.errors.length >= 1);
    const badDetail = (await read(h, "demo-flow", bad)).json() as DetailBody;
    assert.deepEqual(badDetail.result, secondBody.result);
    assert.equal(badDetail.validatedAt, AT_START);

    const bare = await serverOn(h.db, h.clock, undefined);
    try {
      const third = await validate(h, "rf-1-core", good, bare);
      assert.equal(third.statusCode, 200);
      assert.equal((third.json() as ValidateBody).result.ok, false);
    } finally {
      await bare.close();
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-e8b0edd9 a later validation over HTTP replaces the earlier one", async () => {
  const h = await createHarness();
  try {
    const hash = await saveText(h, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));
    const firstRes = await validate(h, "rf-1-core", hash);
    assert.equal(firstRes.statusCode, 200);
    const before = (await read(h, "rf-1-core", hash)).json() as DetailBody;

    h.catalogue.current = async (): Promise<Catalogue> => emptyCatalogue;
    h.clock.advance(60);

    const stale = (await read(h, "rf-1-core", hash)).json() as DetailBody;
    assert.equal(stale.state, "validated");
    assert.equal(stale.validationOk, true);
    assert.equal(stale.validatedAt, AT_START);

    const again = await validate(h, "rf-1-core", hash);
    assert.equal(again.statusCode, 200);
    const againBody = again.json() as ValidateBody;
    assert.equal(againBody.version.state, "draft");
    assert.equal(againBody.version.validationOk, false);
    assert.equal(againBody.version.validatedAt, AT_LATER);

    const latest = (await read(h, "rf-1-core", hash)).json() as DetailBody;
    assert.deepEqual(latest.result, againBody.result);
    assert.equal(latest.hash, before.hash);
    assert.equal(latest.text, before.text);
    assert.deepEqual(latest.canonical, before.canonical);

    const events = await listAuditEvents(h.db.appPool, h.a, {
      filter: { eventType: "flow.version_validated" },
      order: "asc",
      limit: 50,
    });
    assert.equal(events.length, 2);
  } finally {
    await closeHarness(h);
  }
});

test("C-920a230a validation failures over HTTP change nothing", async () => {
  const h = await createHarness();
  try {
    const hash = await saveText(h, "rf-1-core", "yaml", readTestFlowText("rf-1-core"));

    h.catalogue.current = async (): Promise<Catalogue> => {
      throw new Error("catalogue-secret-text");
    };
    const failed = await validate(h, "rf-1-core", hash);
    assert.equal(failed.statusCode, 500);
    assert.equal((failed.json() as ErrorBody).error.code, "INTERNAL");
    assert.ok(!failed.body.includes("catalogue-secret-text"));
    const untouched = (await read(h, "rf-1-core", hash)).json() as DetailBody;
    assert.equal(untouched.validatedAt, null);
    assert.equal(untouched.state, "draft");

    h.catalogue.current = async (): Promise<Catalogue> => loadTestCatalogue();
    const unknown = await validate(h, "rf-1-core", UNKNOWN_HASH);
    assert.equal(unknown.statusCode, 404);
    assert.equal((unknown.json() as ErrorBody).error.code, "NOT_FOUND");
    const wrongFlow = await validate(h, "other", hash);
    assert.equal(wrongFlow.statusCode, 404);
    assert.equal((wrongFlow.json() as ErrorBody).error.code, "NOT_FOUND");

    const events = await listAuditEvents(h.db.appPool, h.a, {
      filter: { eventType: "flow.version_validated" },
      order: "asc",
      limit: 50,
    });
    assert.equal(events.length, 0);

    await withTenantTx(h.db.appPool, h.a, async (tx) => {
      await assert.rejects(
        validateVersion(
          tx,
          h.a,
          { flowId: "rf-1-core", hash: "sha256:zz", catalogue: emptyCatalogue },
          { kind: "user", userId: h.alice.userId },
        ),
        (error: unknown) => error instanceof FlowError && error.code === "FLOW_INVALID",
      );
    });
  } finally {
    await closeHarness(h);
  }
});

test("C-f696603a the flow routes are session routes under the flow actions", async () => {
  const h = await createHarness();
  try {
    const routes = listDefinedRoutes(h.server).filter((route) =>
      route.url.startsWith("/api/v1/flows"),
    );
    const rows = routes.map((route) => `${route.method} ${route.url} ${route.action}`).sort();
    assert.deepEqual(
      rows,
      [
        "GET /api/v1/flows read_flow",
        "POST /api/v1/flows edit_flow",
        "GET /api/v1/flows/:flowId read_flow",
        "GET /api/v1/flows/:flowId/versions read_flow",
        "POST /api/v1/flows/:flowId/versions edit_flow",
        "GET /api/v1/flows/:flowId/versions/:hash read_flow",
        "POST /api/v1/flows/:flowId/versions/:hash/validate edit_flow",
      ].sort(),
    );
    for (const route of routes) assert.equal(route.auth.kind, "session");
    assert.deepEqual(unregisteredRouteErrors(routes), []);
    const validateRoute = routes.find((route) => route.url.endsWith("/validate"));
    assert.ok(validateRoute !== undefined, "the validate route is defined");
    for (const code of ["NOT_FOUND", "VALIDATION_FAILED"]) {
      assert.ok(validateRoute.errors.includes(code), code);
    }

    const url = `/api/v1/flows/rf-1-core/versions/${UNKNOWN_HASH}/validate`;
    const anonymous = await h.server.inject({ method: "POST", url });
    assert.equal(anonymous.statusCode, 401);
    assert.equal((anonymous.json() as ErrorBody).error.code, "UNAUTHENTICATED");
    const noCsrf = await h.server.inject({
      method: "POST",
      url,
      headers: { cookie: h.alice.cookie },
    });
    assert.equal(noCsrf.statusCode, 403);
    assert.equal((noCsrf.json() as ErrorBody).error.code, "CSRF_INVALID");
  } finally {
    await closeHarness(h);
  }
});
