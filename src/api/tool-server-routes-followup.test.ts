import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, test } from "node:test";

import type { FastifyInstance } from "fastify";

import { fixedClock, sequentialIds } from "../core/index.ts";
import type { Clock } from "../core/index.ts";
import { createLogger, noopTracer } from "../observability/index.ts";
import type { LogDestination } from "../observability/index.ts";
import { createPolicyEngine } from "../pdp/index.ts";
import type { PolicyEngine } from "../pdp/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { registerBlockRoutes } from "./block-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registerToolServerRoutes } from "./tool-server-routes.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-09T10:00:00Z";
const ORIGIN = "https://tools.fake.test";

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";
const SURF_A = fixtureSurface([LV, CP], { untrustedResult: { [LV]: false, [CP]: false } });
const SURF_ONE = fixtureSurface([LV], { untrustedResult: { [LV]: false } });

const BODY = { id: "acme", adapter: "fixture", origin: ORIGIN, surface: SURF_A };

interface Session {
  cookie: string;
  userId: string;
  csrfToken: string;
}

interface ErrorBody {
  error: { code: string; message: string; details?: { reason?: string; fields?: unknown } };
}

interface Harness {
  db: TestDatabase;
  a: TenantContext;
  server: FastifyInstance;
  carol: Session;
}

interface Field {
  field: string;
  message: string;
}

const engineDirs: string[] = [];

after(async () => {
  for (const dir of engineDirs) {
    await rm(dir, { recursive: true, force: true });
  }
});

function silentLogger() {
  return createLogger({ level: "silent", destination: silentDestination });
}

async function copyFragment(srcDir: string, relative: string, source: string): Promise<void> {
  const text = await readFile(source, "utf8");
  const target = join(srcDir, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, text, "utf8");
}

async function engineFor(clock: Clock): Promise<PolicyEngine> {
  const srcDir = await mkdtemp(join(tmpdir(), "api-tool-server-routes-followup-src-"));
  engineDirs.push(srcDir);
  const src = join(import.meta.dirname, "..");
  await copyFragment(srcDir, join("identity", "policy", "roles.cedar"), join(src, "identity", "policy", "roles.cedar"));
  await copyFragment(srcDir, join("registry", "policy", "blocks.cedar"), join(src, "registry", "policy", "blocks.cedar"));
  await copyFragment(srcDir, join("tools", "policy", "tools.cedar"), join(src, "tools", "policy", "tools.cedar"));
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function createHarness(): Promise<Harness> {
  const db = await withTestDatabase();
  const { a } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(db, a, [{ subject: "carol", roles: ["tenant_admin"], teams: [] }], clock);

  const engine = await engineFor(clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  installPep(server, {
    pool: db.appPool,
    engine,
    clock,
    publicBaseUrl: BASE_URL,
  });
  const engineKey = { reveal: () => "k".repeat(64) };
  assert.doesNotThrow(() => {
    registerBlockRoutes(server, { pool: db.appPool, engineKey });
  }, "registerBlockRoutes");
  assert.doesNotThrow(() => {
    registerToolServerRoutes(server, { pool: db.appPool, clock, engineKey });
  }, "registerToolServerRoutes");

  return {
    db,
    a,
    server,
    carol: await createTestSession(db, a, "carol", clock),
  };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function send(
  h: Harness,
  method: "GET" | "POST" | "PUT",
  url: string,
  session: Session | null,
  payload?: unknown,
  key?: string,
) {
  const headers: Record<string, string> = {};
  if (session !== null) {
    headers.cookie = session.cookie;
    if (method !== "GET") headers["x-csrf-token"] = session.csrfToken;
  }
  if (key !== undefined) headers["idempotency-key"] = key;
  return h.server.inject({ method, url, headers, payload: payload as never });
}

function fieldsOf(body: unknown): unknown {
  return (body as ErrorBody).error.details?.fields;
}

test("register surface refusals report the field and reason and write nothing", async () => {
  const h = await createHarness();
  try {
    const tool = SURF_ONE.tools[0];
    assert.ok(tool);
    const cases: [string, unknown, Field][] = [
      [
        "untrusted field",
        { tools: [{ ...tool, untrusted_fields: ["zzz"] }] },
        { field: "body/surface/tools/0/untrusted_fields", message: "unknown_field" },
      ],
      [
        "bad output",
        { tools: [{ ...tool, output: { type: "bogus" } }] },
        { field: "body/surface/tools/0/output", message: "schema_invalid" },
      ],
      [
        "get with input",
        { tools: [{ ...tool, http: { method: "GET", path: "/x" } }] },
        { field: "body/surface/tools/0/http/method", message: "method_without_body" },
      ],
      [
        "duplicate tool",
        { tools: [tool, tool] },
        { field: "body/surface/tools/1/name", message: "duplicate" },
      ],
    ];
    let n = 0;
    for (const [label, surface, field] of cases) {
      n += 1;
      const response = await send(
        h,
        "POST",
        "/api/v1/tool-servers",
        h.carol,
        { id: "m1", adapter: "fixture", origin: ORIGIN, surface },
        `s${n}`,
      );
      assert.equal(response.statusCode, 400, label);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", label);
      assert.deepEqual(fieldsOf(response.json()), [field], label);
      const listed = await send(h, "GET", "/api/v1/tool-servers", h.carol);
      assert.deepEqual(listed.json(), { items: [], next_cursor: null }, label);
    }
  } finally {
    await closeHarness(h);
  }
});

test("malformed PUT and approve requests report the field and write nothing", async () => {
  const h = await createHarness();
  try {
    const registered = await send(h, "POST", "/api/v1/tool-servers", h.carol, BODY, "m1");
    assert.equal(registered.statusCode, 201);

    const tool = SURF_ONE.tools[0];
    assert.ok(tool);

    const assertStillPending = async (label: string): Promise<void> => {
      const detail = await send(h, "GET", "/api/v1/tool-servers/acme", h.carol);
      assert.equal(detail.statusCode, 200, label);
      const record = detail.json() as {
        state: string;
        approvedDigest: string | null;
        pendingDigest: string | null;
      };
      assert.equal(record.state, "pending", label);
      assert.equal(record.approvedDigest, null, label);
      assert.equal(record.pendingDigest, D_A, label);
    };

    const cases: [string, Promise<{ statusCode: number; json(): unknown }>, Field][] = [
      [
        "put array",
        send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.carol, []),
        { field: "body", message: "must be object" },
      ],
      [
        "put root member",
        send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.carol, { tools: [tool], meta: 1 }),
        { field: "body", message: "unknown_property" },
      ],
      [
        "put bad id",
        send(h, "PUT", "/api/v1/tool-servers/BAD!/surface", h.carol, SURF_A),
        { field: "params/id", message: 'must match pattern "^[a-z][a-z0-9_]{0,31}$"' },
      ],
      [
        "approve digest object",
        send(h, "POST", "/api/v1/tool-servers/acme/surface/approve", h.carol, { digest: {} }),
        { field: "body/digest", message: "must be string" },
      ],
    ];
    for (const [label, pendingResponse, field] of cases) {
      const response = await pendingResponse;
      assert.equal(response.statusCode, 400, label);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", label);
      assert.deepEqual(fieldsOf(response.json()), [field], label);
      await assertStillPending(label);
    }

    const mismatch = await send(
      h,
      "POST",
      "/api/v1/tool-servers/acme/surface/approve",
      h.carol,
      { digest: "abc" },
    );
    assert.equal(mismatch.statusCode, 422);
    const error = (mismatch.json() as ErrorBody).error;
    assert.equal(error.code, "OPERATION_REFUSED");
    assert.equal(error.details?.reason, "digest_mismatch");
    await assertStillPending("approve mismatch");

    const surfaces = await withTenantTx(h.db.ownerPool, h.a, (tx) =>
      tx.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tool_surface"),
    );
    assert.equal(surfaces.rows[0]?.n, 1);
  } finally {
    await closeHarness(h);
  }
});
