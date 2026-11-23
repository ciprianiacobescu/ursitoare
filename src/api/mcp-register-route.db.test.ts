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
import { installPep } from "./pep.ts";
import { registerMcpToolRoutes } from "./mcp-tool-routes.ts";
import { buildServer } from "./server.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-09T10:00:00Z";
const REGISTERED_AT = "2026-11-09T10:00:00.000000Z";

const REGISTER_URL = "/api/v1/tool-registrations/mcp";

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
  alice: Session;
  dave: Session;
  mallory: Session;
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-mcp-register-route-src-"));
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
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
      { subject: "dave", roles: ["tenant_admin"], teams: [] },
      { subject: "alice", roles: ["author"], teams: [] },
    ],
    clock,
  );
  await seedFlowActors(db, b, [{ subject: "mallory", roles: ["tenant_admin"], teams: [] }], clock);

  const engine = await engineFor(clock);
  const server = await buildServer({
    version: "0.0.0",
    ids: sequentialIds(100),
    logger: silentLogger(),
    tracer: noopTracer,
  });
  installPep(server, { pool: db.appPool, engine, clock, publicBaseUrl: BASE_URL });
  const engineKey = { reveal: () => "k".repeat(64) };
  try {
    assert.doesNotThrow(() => {
      registerMcpToolRoutes(server, {
        pool: db.appPool,
        clock,
        ids: sequentialIds(1000),
        engineKey,
        policy: engine,
        gateway: null,
        services: null,
      });
    }, "registerMcpToolRoutes");
  } catch (error) {
    await server.close();
    await db.close();
    throw error;
  }

  return {
    db,
    a,
    server,
    carol: await createTestSession(db, a, "carol", clock),
    alice: await createTestSession(db, a, "alice", clock),
    dave: await createTestSession(db, a, "dave", clock),
    mallory: await createTestSession(db, b, "mallory", clock),
  };
}

async function closeHarness(h: Harness): Promise<void> {
  await h.server.close();
  await h.db.close();
}

function send(
  h: Harness,
  method: "POST",
  url: string,
  session: Session | null,
  payload?: unknown,
  key?: string,
) {
  const headers: Record<string, string> = {};
  if (session !== null) {
    headers.cookie = session.cookie;
    headers["x-csrf-token"] = session.csrfToken;
  }
  if (key !== undefined) headers["idempotency-key"] = key;
  return h.server.inject({ method, url, headers, payload: payload as never });
}

function fieldsOf(body: unknown): unknown {
  return (body as ErrorBody).error.details?.fields;
}

function codeOf(body: unknown): string {
  return (body as ErrorBody).error.code;
}

async function countMcpServers(h: Harness): Promise<number> {
  const rows = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.mcp_server"),
  );
  return Number(rows.rows[0]?.n ?? "-1");
}

async function countToolServers(h: Harness): Promise<number> {
  const rows = await withTenantTx(h.db.appPool, h.a, (tx) =>
    tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.tool_server"),
  );
  return Number(rows.rows[0]?.n ?? "-1");
}

async function countAuditEvents(h: Harness, type: string): Promise<number> {
  const rows = await withTenantTx(h.db.ownerPool, h.a, (tx) =>
    tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.audit_event WHERE event_type = $1", [type]),
  );
  return Number(rows.rows[0]?.n ?? "-1");
}

function serverRecord(userId: string) {
  return {
    server: {
      id: "docs",
      adapter: "mcp",
      origin: "https://mcp.fake.test",
      local: false,
      state: "pending",
      registeredBy: userId,
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: null,
      pendingSubmittedBy: null,
      tools: [],
    },
    endpoint: "/mcp",
  };
}

test("C-edca43a8 T1 carol registers docs by URL and one event and row are stored", async () => {
  const h = await createHarness();
  try {
    const res = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" });
    assert.equal(res.statusCode, 201);
    assert.deepEqual(res.json(), serverRecord(h.carol.userId));
    assert.equal(await countMcpServers(h), 1);
    assert.equal(await countAuditEvents(h, "tools.server_registered"), 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-edca43a8 T2 replay returns the same body and stores one row", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" }, "k1");
    assert.equal(first.statusCode, 201);
    assert.deepEqual(first.json(), serverRecord(h.carol.userId));

    const replay = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" }, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), serverRecord(h.carol.userId));
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(await countMcpServers(h), 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-edca43a8 T3 bad urls are 400 with body/url and nothing is stored", async () => {
  const h = await createHarness();
  try {
    const urls: Array<[string, string]> = [
      ["https://mcp.fake.test/mcp?x=1", "query"],
      ["https://mcp.fake.test/mcp#f", "path"],
      ["https://u:p@mcp.fake.test/mcp", "credentials"],
      ["http://mcp.fake.test/mcp", "scheme"],
      ["https://127.0.0.1/mcp", "loopback"],
    ];
    for (const [url, reason] of urls) {
      const res = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url }, url);
      assert.equal(res.statusCode, 400, url);
      assert.equal(codeOf(res.json()), "VALIDATION_FAILED", url);
      assert.deepEqual(fieldsOf(res.json()), [{ field: "body/url", message: reason }], url);
    }
    assert.equal(await countMcpServers(h), 0);
    assert.equal(await countToolServers(h), 0);
  } finally {
    await closeHarness(h);
  }
});

test("C-edca43a8 T4 a taken id is 409 ALREADY_EXISTS", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" }, "k1");
    assert.equal(first.statusCode, 201);
    const second = await send(h, "POST", REGISTER_URL, h.carol, { id: "docs", url: "https://mcp.fake.test/mcp" }, "k2");
    assert.equal(second.statusCode, 409);
    assert.equal(codeOf(second.json()), "ALREADY_EXISTS");
    assert.equal(await countMcpServers(h), 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-edca43a8 T5 alice is forbidden and tenant b is isolated", async () => {
  const h = await createHarness();
  try {
    const denied = await send(h, "POST", REGISTER_URL, h.alice, { id: "docs", url: "https://mcp.fake.test/mcp" }, "a1");
    assert.equal(denied.statusCode, 403);
    assert.equal(codeOf(denied.json()), "FORBIDDEN");

    const theirs = await send(h, "POST", REGISTER_URL, h.mallory, { id: "docs", url: "https://mcp.fake.test/mcp" }, "m1");
    assert.equal(theirs.statusCode, 201);
    assert.equal(await countMcpServers(h), 0);
  } finally {
    await closeHarness(h);
  }
});