import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import type { ChainReport, verifyChain } from "../audit/index.ts";
import type { Clock } from "../core/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { createWalkQueue, registerAuditRoutes } from "./audit-routes.ts";
import type { AuditApiDeps, WalkQueue } from "./audit-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

assert.equal(typeof createWalkQueue, "function");
assert.equal(typeof registerAuditRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const T0 = "2026-10-25T09:00:00Z";
const CHECKED_AT = "2026-10-25T09:00:00.000000Z";
const CHECKED = 7;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

interface Harness {
  db: TestDatabase;
  server: FastifyInstance;
  aliceCookie: string;
}

interface RunCall {
  tenantId: string;
  fromSeq: bigint;
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

const engineDirs: string[] = [];

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

async function makeHarness(walks: WalkQueue, verify: typeof verifyChain): Promise<Harness> {
  const harness = await withTestDatabase();
  const { a } = await seedTwoTenants(harness);
  const clock: Clock = fixedClock(T0);
  const srcDir = await mkdtemp(join(tmpdir(), "api-verify-queue-src-"));
  engineDirs.push(srcDir);
  const engine: PolicyEngine = await createPolicyEngine({
    srcDir,
    tenantPolicies: [
      {
        id: "t-all",
        layer: "tenant",
        text: '@id("t-all") permit (principal, action, resource);',
      },
    ],
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });

  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  assert.doesNotThrow(() => {
    installPep(server, { pool: harness.appPool, engine, clock, publicBaseUrl: BASE_URL });
  }, "installPep");
  const deps: AuditApiDeps = { pool: harness.appPool, clock, engineKey: null, walks };
  deps.verify = verify;
  assert.doesNotThrow(() => {
    registerAuditRoutes(server, deps);
  }, "registerAuditRoutes");

  const alice = await createTestSession(harness, a, "alice", clock);
  return { db: harness, server, aliceCookie: alice.cookie };
}

test("C-b71b26a5 the verify route goes through the walk queue", async () => {
  const runCalls: RunCall[] = [];
  let inner: WalkQueue | undefined;
  assert.doesNotThrow(() => {
    inner = createWalkQueue(2);
  }, "createWalkQueue(2)");
  assert.ok(inner !== undefined, "the inner walk queue exists");
  const innerQueue = inner;
  const wrapper: WalkQueue = {
    run<T>(tenantId: string, fromSeq: bigint, start: () => Promise<T>): Promise<T> {
      runCalls.push({ tenantId, fromSeq });
      return innerQueue.run(tenantId, fromSeq, start);
    },
  };

  const d = deferred<ChainReport>();
  const verify: typeof verifyChain = () => d.promise;

  const harness = await makeHarness(wrapper, verify);
  try {
    const headers = { cookie: harness.aliceCookie };
    const requestOne = harness.server.inject({
      method: "GET",
      url: "/api/v1/audit/verify",
      headers,
    });
    const requestTwo = harness.server.inject({
      method: "GET",
      url: "/api/v1/audit/verify",
      headers,
    });
    d.resolve({ ok: true, checked: CHECKED });

    const landed = await Promise.all([
      requestOne.then((value) => value, (error: unknown) => error),
      requestTwo.then((value) => value, (error: unknown) => error),
    ]);
    type InjectResponse = Awaited<ReturnType<FastifyInstance["inject"]>>;
    const first = landed[0] as InjectResponse;
    const second = landed[1] as InjectResponse;

    assert.equal(first.statusCode, 200, "the first verify answers 200");
    assert.equal(second.statusCode, 200, "the second verify answers 200");
    const expected: VerifyBody = {
      ok: true,
      checked: CHECKED,
      firstBadSeq: null,
      reason: null,
      fromSeq: "1",
      anchorsChecked: false,
      anchorsVerified: 0,
      checkedAt: CHECKED_AT,
    };
    assert.deepEqual(first.json(), expected, "the first body is the recording report");
    assert.deepEqual(second.json(), expected, "both answers carry equal bodies");

    assert.equal(runCalls.length, 2, "the wrapper recorded one run call per request");
    for (const call of runCalls) {
      assert.equal(call.tenantId, "tenant_a", "the walk is keyed by the caller's tenant");
      assert.equal(call.fromSeq, 1n, "the walk starts at fromSeq 1n");
    }
  } finally {
    await harness.server.close();
    await harness.db.close();
  }
});
