import assert from "node:assert/strict";
import { test } from "node:test";

import type { FastifyInstance } from "fastify";

import { listAuditEvents } from "../audit/index.ts";
import { fixedClock, sequentialIds } from "../core/index.ts";
import { createPolicyRuntime } from "../grants/policy-runtime.ts";
import type { PolicyRuntime } from "../grants/policy-runtime.ts";
import { deployPolicySet } from "../grants/policy-sets.ts";
import type { PolicySetRecord, PolicyValidation } from "../grants/policy-sets.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { defaultSrcDir } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { importCatalogue } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { registerPolicyRoutes } from "./policy-routes.ts";
import type { PolicyApiDeps } from "./policy-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";

const T = "tenant_a";
const CLOCK = fixedClock("2026-11-06T09:00:00.000Z");
const AT = "2026-11-06T09:00:00.000000Z";
const BASE_URL = "http://127.0.0.1:8080";
const FP1 = "nf1_" + "a1".repeat(32);
const FP2 = "nf1_" + "b2".repeat(32);
const CAROL = { kind: "user", id: "carol" } as const;

const silentDestination: LogDestination = { write(): void {} };

function G(n: number): string {
  return "grant_00000000-0000-7000-8000-" + n.toString(16).padStart(12, "0");
}

const ACME = {
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
    },
    output: { type: "object" },
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
    },
    output: { type: "object" },
  },
};

const SRC_R = `@id("t-a-read-all")\npermit (principal, action == Action::"invoke_tool", resource is Block)\nwhen { context.tool.effect == "read" };\n`;
const READ_SELF = (id: string): string =>
  `@id("${id}")\npermit (principal, action == Action::"read_self", resource);\n`;

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  b: TenantContext;
  rt: PolicyRuntime;
  sessions: Record<string, Session>;
}

async function setup(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "alice", roles: ["author"], teams: [] },
      { subject: "bob", roles: ["approver"], teams: [] },
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
    ],
    CLOCK,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["tenant_admin"], teams: [] }], CLOCK);
  const sessions: Record<string, Session> = {};
  for (const name of ["alice", "bob", "carol"]) {
    sessions[name] = await createTestSession(db, a, name, CLOCK);
  }
  sessions["mallory"] = await createTestSession(db, b, "mallory", CLOCK);
  await importCatalogue(db.appPool, a, ACME as never, CAROL, { clock: CLOCK });

  const logger = createLogger({ level: "silent", destination: silentDestination });
  const rt = await createPolicyRuntime({
    pool: db.appPool,
    srcDir: defaultSrcDir(),
    clock: CLOCK,
    ids: sequentialIds(1000),
    logger,
  });
  const harness: Harness = { db, a, b, rt, sessions };
  await seedGrant(harness, { id: G(0), role: "author", tool: "acme.lookup_vendor@1" });
  await seedGrant(harness, {
    id: G(1),
    user: "bob",
    tool: "acme.lookup_vendor@1",
  });
  return harness;
}

async function seedGrant(
  h: Harness,
  grant: {
    id: string;
    role?: string;
    user?: string;
    tool: string;
    node?: boolean;
    fingerprints?: string[];
  },
): Promise<void> {
  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare."grant"
         (tenant_id, grant_id, subject_kind, subject_id, tool, scope_kind, flow_id, node_id,
          args, fingerprints, state, created_by, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::text[], 'active', 'carol',
               '2026-11-06T09:00:00Z')`,
      [
        T,
        grant.id,
        grant.user !== undefined ? "user" : "role",
        grant.user ?? grant.role ?? "author",
        grant.tool,
        grant.node === true ? "node" : "any_step",
        grant.node === true ? "pay-run" : null,
        grant.node === true ? "pay" : null,
        "[]",
        grant.fingerprints ?? [],
      ],
    );
  });
}

async function revoke(h: Harness, id: string): Promise<void> {
  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    await tx.query(
      `UPDATE ursitoare."grant" SET state = 'revoked', revoked_by = 'carol',
              revoked_at = '2026-11-06T09:30:00Z' WHERE grant_id = $1`,
      [id],
    );
  });
}

async function appendFingerprint(h: Harness, id: string, fingerprint: string): Promise<void> {
  await withTenantTx(h.db.appPool, h.a, async (tx) => {
    await tx.query(
      `UPDATE ursitoare."grant" SET fingerprints = array_append(fingerprints, $2)
        WHERE tenant_id = $1 AND grant_id = $3`,
      [T, fingerprint, id],
    );
  });
}

async function rowCount(h: Harness): Promise<number> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ count: number }>(
      "SELECT count(*)::int AS count FROM ursitoare.policy_set WHERE tenant_id = $1",
      [T],
    ),
  );
  return result.rows[0]?.count ?? 0;
}

async function events(h: Harness): Promise<number> {
  const list = await listAuditEvents(h.db.appPool, h.a, {
    filter: { eventType: "policy.deployed" },
    order: "asc",
    limit: 50,
  });
  return list.length;
}

async function idempotencyKeys(h: Harness, principalId: string): Promise<{ key: string; state: string }[]> {
  const result = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ key: string; state: string }>(
      `SELECT key, state FROM ursitoare.idempotency_key
        WHERE tenant_id = $1 AND principal_id = $2 ORDER BY key`,
      [T, principalId],
    ),
  );
  return result.rows;
}

interface PoolState {
  failOn: string | null;
  autoFailNextPolicySetRead: boolean;
}

function flakyPool(inner: TenantPool, state: PoolState): TenantPool {
  return {
    async connect() {
      const client = await inner.connect();
      let inserted = false;
      return {
        on(event: string, listener: () => void): void {
          client.on(event as never, listener as never);
        },
        removeListener(event: string, listener: () => void): void {
          client.removeListener(event as never, listener as never);
        },
        release(destroy?: boolean): void {
          client.release(destroy);
        },
        async query(text: string, values?: unknown[]): Promise<unknown> {
          if (state.failOn !== null && text.includes(state.failOn)) {
            throw new Error("store down");
          }
          if (text.includes("INSERT INTO ursitoare.policy_set")) {
            inserted = true;
          }
          if (text === "COMMIT" && inserted) {
            state.autoFailNextPolicySetRead = true;
            inserted = false;
          }
          if (text === "ROLLBACK") {
            inserted = false;
          }
          if (state.autoFailNextPolicySetRead && text.includes("FROM ursitoare.policy_set")) {
            state.autoFailNextPolicySetRead = false;
            throw new Error("store down");
          }
          return client.query(text, values as never);
        },
      };
    },
  } as unknown as TenantPool;
}

async function silentServer(): Promise<FastifyInstance> {
  return buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: createLogger({ level: "silent", destination: silentDestination }),
    tracer: noopTracer,
  });
}

async function start(
  deps: PolicyApiDeps,
  engine: PolicyEngine | null,
  pepPool: TenantPool | null = deps.pool,
): Promise<FastifyInstance> {
  const server = await silentServer();
  installPep(server, {
    pool: pepPool,
    engine,
    clock: deps.clock,
    publicBaseUrl: BASE_URL,
  });
  assert.doesNotThrow(() => {
    registerPolicyRoutes(server, deps);
  }, "registerPolicyRoutes registers the policy routes");
  return server;
}

type Method = "GET" | "POST";

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
  assert.equal(typeof body?.error?.code, "string", `the body of status ${res.statusCode} is an error envelope`);
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

test("C-7d079efc: the policy routes require deploy_policy and store an idempotent deploy", async () => {
  const h = await setup();
  const server = await start({ pool: h.db.appPool, runtime: h.rt, clock: CLOCK }, h.rt.engine);
  try {
    const alice = h.sessions["alice"] as Session;
    const carol = h.sessions["carol"] as Session;

    const refusals: [Method, string, unknown][] = [
      ["GET", "/api/v1/policies", undefined],
      ["POST", "/api/v1/policies/validate", { source: SRC_R }],
      ["POST", "/api/v1/policies/deploy", { source: SRC_R }],
    ];
    for (const [method, url, payload] of refusals) {
      const res = await call(server, method, url, alice, payload);
      assert.equal(res.statusCode, 403, `alice ${method} ${url} is refused`);
      const error = asError(res);
      assert.equal(error.code, "FORBIDDEN");
      assert.equal(typeof error.details?.["decisionId"], "string");
    }

    const empty = await call(server, "GET", "/api/v1/policies", carol);
    assert.equal(empty.statusCode, 200);
    assert.deepEqual(empty.json(), { current: null, pendingGrants: 2 });

    const valid = await call(server, "POST", "/api/v1/policies/validate", carol, { source: SRC_R });
    assert.equal(valid.statusCode, 200);
    const validation = valid.json() as PolicyValidation;
    assert.equal(validation.ok, true);
    assert.match(String(validation.policySetVersion), /^[0-9a-f]{64}$/);
    assert.deepEqual(validation.problems, []);
    const version = String(validation.policySetVersion);

    const duplicate = await call(server, "POST", "/api/v1/policies/validate", carol, {
      source: READ_SELF("platform-read-self"),
    });
    assert.equal(duplicate.statusCode, 200);
    assert.deepEqual(duplicate.json(), {
      ok: false,
      policySetVersion: null,
      problems: [{ stage: "policy", ids: ["platform-read-self"], message: "" }],
    });

    const expected: PolicySetRecord = {
      tenantId: T,
      version,
      source: SRC_R,
      grantIds: [G(0), G(1)],
      deployedBy: carol.userId,
      deployedAt: AT,
    };
    const deployed = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: SRC_R },
      { "idempotency-key": "k-1" },
    );
    assert.equal(deployed.statusCode, 201);
    assert.deepEqual(deployed.json(), expected);

    const replay = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: SRC_R },
      { "idempotency-key": "k-1" },
    );
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), expected);
    assert.equal(replay.headers["idempotent-replayed"], "true");

    const reused = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: "" },
      { "idempotency-key": "k-1" },
    );
    assert.equal(reused.statusCode, 422);
    assert.equal(asError(reused).code, "IDEMPOTENCY_KEY_REUSED");

    const invalid = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: "permit (principal" },
      { "idempotency-key": "k-2" },
    );
    assert.equal(invalid.statusCode, 422);
    const invalidError = asError(invalid);
    assert.equal(invalidError.code, "OPERATION_REFUSED");
    assert.deepEqual(invalidError.details, {
      reason: "policy_invalid",
      problems: [{ stage: "parse", ids: ["tenant/source"], message: "unexpected end of input" }],
    });

    const noKey = await call(server, "POST", "/api/v1/policies/deploy", carol, { source: SRC_R });
    assert.equal(noKey.statusCode, 201);
    assert.deepEqual(noKey.json(), expected);
    assert.equal(noKey.headers["idempotent-replayed"], undefined);

    assert.equal(await rowCount(h), 1, "one policy set row");
    assert.equal(await events(h), 1, "one policy.deployed event");
    assert.deepEqual(await idempotencyKeys(h, carol.userId), [{ key: "k-1", state: "done" }]);

    const stored = await call(server, "GET", "/api/v1/policies", carol);
    assert.deepEqual(stored.json(), { current: expected, pendingGrants: 0 });

    await revoke(h, G(1));
    await seedGrant(h, { id: G(2), role: "author", tool: "acme.lookup_vendor@1" });
    const changed = await call(server, "GET", "/api/v1/policies", carol);
    assert.deepEqual(changed.json(), { current: expected, pendingGrants: 2 });
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-7d079efc: the policy routes validate bodies and scope each tenant's list", async () => {
  const h = await setup();
  const server = await start({ pool: h.db.appPool, runtime: h.rt, clock: CLOCK }, h.rt.engine);
  try {
    const carol = h.sessions["carol"] as Session;
    const mallory = h.sessions["mallory"] as Session;

    const badBodies: [string, unknown, string, string][] = [
      [
        "/api/v1/policies/validate",
        { source: "", extra: 1 },
        "body/extra",
        "must NOT have additional properties",
      ],
      ["/api/v1/policies/deploy", {}, "body/source", "must have required property 'source'"],
      ["/api/v1/policies/validate", { source: {} }, "body/source", "must be string"],
      [
        "/api/v1/policies/validate",
        { source: "x".repeat(65537) },
        "body/source",
        "must NOT have more than 65536 characters",
      ],
    ];
    for (const [url, payload, field, message] of badBodies) {
      const res = await call(server, "POST", url, carol, payload);
      assert.equal(res.statusCode, 400, `the bad body for ${field} is refused`);
      assert.equal(asError(res).code, "VALIDATION_FAILED");
      assert.deepEqual(firstFieldOf(res), { field, message });
    }

    const validation = await call(server, "POST", "/api/v1/policies/validate", carol, { source: SRC_R });
    assert.equal(validation.statusCode, 200);
    const version = String((validation.json() as PolicyValidation).policySetVersion);
    const deployed = await call(server, "POST", "/api/v1/policies/deploy", carol, { source: SRC_R });
    assert.equal(deployed.statusCode, 201);
    const carolRecord = deployed.json() as PolicySetRecord;
    assert.equal(carolRecord.version, version);

    const malloryEmpty = await call(server, "GET", "/api/v1/policies", mallory);
    assert.equal(malloryEmpty.statusCode, 200);
    assert.deepEqual(malloryEmpty.json(), { current: null, pendingGrants: 0 });

    const malloryDeploy = await call(server, "POST", "/api/v1/policies/deploy", mallory, { source: "" });
    assert.equal(malloryDeploy.statusCode, 201);
    assert.deepEqual(malloryDeploy.json(), {
      tenantId: "tenant_b",
      version: h.rt.engine.policySetVersion,
      source: "",
      grantIds: [],
      deployedBy: mallory.userId,
      deployedAt: AT,
    });

    const carolStill = await call(server, "GET", "/api/v1/policies", carol);
    assert.deepEqual(carolStill.json(), { current: carolRecord, pendingGrants: 0 });

    await revoke(h, G(1));
    await seedGrant(h, { id: G(2), role: "author", tool: "acme.lookup_vendor@1" });
    await seedGrant(h, {
      id: G(3),
      role: "author",
      tool: "acme.lookup_vendor@1",
      node: true,
      fingerprints: [FP1],
    });
    const deployedAgain = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: "" },
      { "idempotency-key": "k-4" },
    );
    assert.equal(deployedAgain.statusCode, 201);
    const second = deployedAgain.json() as PolicySetRecord;
    assert.deepEqual(second.grantIds, [G(0), G(2), G(3)]);

    const settled = await call(server, "GET", "/api/v1/policies", carol);
    assert.deepEqual(settled.json(), { current: second, pendingGrants: 0 });

    await appendFingerprint(h, G(3), FP2);
    const pending = await call(server, "GET", "/api/v1/policies", carol);
    assert.deepEqual(pending.json(), { current: second, pendingGrants: 1 });
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-7d079efc: a failing reload, store or grant read answers INTERNAL and the retry deploys", async () => {
  const h = await setup();
  const state: PoolState = { failOn: null, autoFailNextPolicySetRead: false };
  const flaky = flakyPool(h.db.appPool, state);
  const logger = createLogger({ level: "silent", destination: silentDestination });
  const rtFlaky = await createPolicyRuntime({
    pool: flaky,
    srcDir: defaultSrcDir(),
    clock: CLOCK,
    ids: sequentialIds(2000),
    logger,
  });
  await deployPolicySet(h.rt, h.db.appPool, h.a, SRC_R, CAROL);
  await deployPolicySet(h.rt, h.db.appPool, h.a, "", CAROL);
  const server = await start({ pool: flaky, runtime: rtFlaky, clock: CLOCK }, rtFlaky.engine);
  try {
    const carol = h.sessions["carol"] as Session;
    assert.equal(await rowCount(h), 2);
    assert.equal(await events(h), 2);

    const failing = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: "// x" },
      { "idempotency-key": "k-3" },
    );
    assert.equal(failing.statusCode, 500);
    assert.equal(asError(failing).code, "INTERNAL");
    assert.equal(await rowCount(h), 3, "the committed row stays");
    assert.equal(await events(h), 3, "the committed event stays");
    assert.deepEqual(await idempotencyKeys(h, carol.userId), [], "the key is released");

    const retry = await call(
      server,
      "POST",
      "/api/v1/policies/deploy",
      carol,
      { source: "// x" },
      { "idempotency-key": "k-3" },
    );
    assert.equal(retry.statusCode, 201);
    assert.equal(retry.headers["idempotent-replayed"], undefined);
    const record = retry.json() as PolicySetRecord;
    assert.equal(record.tenantId, T);
    assert.match(record.version, /^[0-9a-f]{64}$/);
    assert.equal(record.source, "// x");
    assert.deepEqual(record.grantIds, [G(0), G(1)]);
    assert.equal(record.deployedBy, carol.userId);
    assert.equal(record.deployedAt, AT);
    assert.equal(await rowCount(h), 3);
    assert.equal(await events(h), 3);

    state.failOn = "FROM ursitoare.policy_set";
    const listFailure = await call(server, "GET", "/api/v1/policies", carol);
    assert.equal(listFailure.statusCode, 500);
    assert.equal(asError(listFailure).code, "INTERNAL");
    state.failOn = null;

    state.failOn = 'FROM ursitoare."grant"';
    const validateFailure = await call(server, "POST", "/api/v1/policies/validate", carol, {
      source: "",
    });
    assert.equal(validateFailure.statusCode, 500);
    assert.equal(asError(validateFailure).code, "INTERNAL");
    state.failOn = null;
  } finally {
    await server.close();
    await h.db.close();
  }
});

test("C-7d079efc: a null pool or runtime answers AUTHZ_UNAVAILABLE", async () => {
  const h = await setup();
  const carol = h.sessions["carol"] as Session;
  const servers: FastifyInstance[] = [
    await start({ pool: null, runtime: null, clock: CLOCK }, null, null),
    await start({ pool: h.db.appPool, runtime: null, clock: CLOCK }, h.rt.engine, h.db.appPool),
    await start({ pool: null, runtime: h.rt, clock: CLOCK }, h.rt.engine, h.db.appPool),
  ];
  try {
    const calls: [Method, string, unknown][] = [
      ["GET", "/api/v1/policies", undefined],
      ["POST", "/api/v1/policies/validate", { source: "" }],
      ["POST", "/api/v1/policies/deploy", { source: "" }],
    ];
    for (const server of servers) {
      for (const [method, url, payload] of calls) {
        const res = await call(server, method, url, carol, payload);
        assert.equal(res.statusCode, 503, `${method} ${url} answers unavailable`);
        assert.equal(asError(res).code, "AUTHZ_UNAVAILABLE");
      }
    }
  } finally {
    for (const server of servers) {
      await server.close();
    }
    await h.db.close();
  }
});
