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
import { registerAdapterServerTx } from "../tools/adapter-store.ts";
import { codeBlockSurface } from "../tools/code/register.ts";
import type { CodeBlockToolInput } from "../tools/code/register.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { kitSurface } from "../../test/support/adapter-kit.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { registerCodeBlockRoutes } from "./code-block-routes.ts";
import { installPep } from "./pep.ts";
import { buildServer } from "./server.ts";
import { registerToolServerRoutes } from "./tool-server-routes.ts";

assert.equal(typeof registerCodeBlockRoutes, "function");

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-09T10:00:00Z";
const REGISTERED_AT = "2026-11-09T10:00:00.000000Z";
const ORIGIN = "https://tools.fake.test";
const UNAVAILABLE = { error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" } };

const IN_T = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };
const OUT_W = { type: "object", properties: { words: { type: "integer" } }, required: ["words"] };
const SRC_WC = "return { words: input.text.trim().split(/\\s+/).length };";
const SRC_WC2 = "return { words: input.text.split(' ').length };";

const WC: CodeBlockToolInput = {
  name: "word_count",
  description: "Count the words.",
  input: IN_T as CodeBlockToolInput["input"],
  output: OUT_W as CodeBlockToolInput["output"],
  source: SRC_WC,
};
const WC2: CodeBlockToolInput = { ...WC, source: SRC_WC2 };
const EX: CodeBlockToolInput = {
  name: "explode",
  description: "Always fails.",
  input: IN_T as CodeBlockToolInput["input"],
  output: OUT_W as CodeBlockToolInput["output"],
  source: "throw new Error('secret_text');",
};

const D_WC = "59d11c4654e2eeb76542d2e1fcc814eb8fa1abc9c38debe573a09afa5d1d5a61";
const D_WC2 = "e014904e0bd3fa801c703f0fd769c1f5d39d773b4d8d428bc895d572ca058ed6";

const BIG_OK = "return {};" + " ".repeat(65526);
const BIG = "return {};" + " ".repeat(65527);

const SYNTAX = "code source does not parse (line 2): Unexpected token";
const NO_RETURN = "code source never returns a value; it must `return` an object";

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
  mallory: Session;
}

interface Options {
  pepPool?: "real" | "null";
  depsPool?: "real" | "null";
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-code-block-routes-src-"));
  engineDirs.push(srcDir);
  const src = join(import.meta.dirname, "..");
  await copyFragment(srcDir, join("identity", "policy", "roles.cedar"), join(src, "identity", "policy", "roles.cedar"));
  await copyFragment(srcDir, join("tools", "policy", "tools.cedar"), join(src, "tools", "policy", "tools.cedar"));
  return createPolicyEngine({
    srcDir,
    clock,
    ids: sequentialIds(200),
    logger: silentLogger(),
  });
}

async function createHarness(opts: Options = {}): Promise<Harness> {
  const db = await withTestDatabase();
  const { a, b } = await seedTwoTenants(db);
  const clock = fixedClock(NOW);
  await seedFlowActors(
    db,
    a,
    [
      { subject: "carol", roles: ["tenant_admin"], teams: [] },
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
  installPep(server, {
    pool: opts.pepPool === "null" ? null : db.appPool,
    engine,
    clock,
    publicBaseUrl: BASE_URL,
  });
  const deps = {
    pool: opts.depsPool === "null" ? null : db.appPool,
    clock,
    engineKey: { reveal: () => "k".repeat(64) } as const,
  };
  try {
    assert.doesNotThrow(() => {
      registerToolServerRoutes(server, deps);
    }, "registerToolServerRoutes");
    assert.doesNotThrow(() => {
      registerCodeBlockRoutes(server, deps);
    }, "registerCodeBlockRoutes");
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
    mallory: await createTestSession(db, b, "mallory", clock),
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

async function rowCounts(h: Harness): Promise<{ servers: number; keys: number }> {
  return withTenantTx(h.db.ownerPool, h.a, async (tx) => {
    const count = async (table: string): Promise<number> => {
      const result = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
      return result.rows[0]?.n ?? -1;
    };
    return { servers: await count("tool_server"), keys: await count("idempotency_key") };
  });
}

function pendingRecord(registeredBy: string) {
  return {
    id: "snips",
    adapter: "code_block",
    origin: "sandbox",
    local: false,
    state: "pending",
    registeredBy,
    registeredAt: REGISTERED_AT,
    approvedDigest: null,
    pendingDigest: `sha256:${D_WC}`,
    pendingSubmittedBy: registeredBy,
    tools: [{ name: "word_count", effect: "read", ref: null }],
  };
}

test("C-20948fad carol registers a code block server and a replay follows its key", async () => {
  const h = await createHarness();
  try {
    const body = { id: "snips", tools: [WC] };
    const first = await send(h, "POST", "/api/v1/tool-registrations/code", h.carol, body, "k1");
    assert.equal(first.statusCode, 201);
    const created = first.json();
    assert.deepEqual(created, pendingRecord(h.carol.userId));

    const replay = await send(h, "POST", "/api/v1/tool-registrations/code", h.carol, body, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), created);
    assert.equal(replay.headers["idempotent-replayed"], "true");

    const again = await send(h, "POST", "/api/v1/tool-registrations/code", h.carol, body, "k2");
    assert.equal(again.statusCode, 409);
    assert.equal((again.json() as ErrorBody).error.code, "ALREADY_EXISTS");

    const detail = await send(h, "GET", "/api/v1/tool-servers/snips", h.carol);
    assert.equal(detail.statusCode, 200);
    assert.deepEqual(
      (detail.json() as { pendingSurface: unknown }).pendingSurface,
      codeBlockSurface([WC]),
    );

    const big = await send(
      h,
      "POST",
      "/api/v1/tool-registrations/code",
      h.carol,
      { id: "big", tools: [{ ...WC, source: BIG_OK }] },
      "k3",
    );
    assert.equal(big.statusCode, 201);

    const update = await send(h, "PUT", "/api/v1/tool-servers/snips/code", h.carol, { tools: [WC2] });
    assert.equal(update.statusCode, 200);
    const updated = update.json() as {
      pendingDigest: string;
      state: string;
      approvedDigest: string | null;
    };
    assert.equal(updated.pendingDigest, `sha256:${D_WC2}`);
    assert.equal(updated.state, "pending");
    assert.equal(updated.approvedDigest, null);

    const repeated = await send(h, "PUT", "/api/v1/tool-servers/snips/code", h.carol, { tools: [WC2] });
    assert.equal(repeated.statusCode, 200);
    assert.deepEqual(repeated.json(), updated);
  } finally {
    await closeHarness(h);
  }
});

test("C-20948fad each bad code registration body has one fixed field", async () => {
  const h = await createHarness();
  try {
    const seeded = await send(
      h,
      "POST",
      "/api/v1/tool-registrations/code",
      h.carol,
      { id: "snips", tools: [WC] },
      "seed",
    );
    assert.equal(seeded.statusCode, 201);

    interface Row {
      label: string;
      method: "POST" | "PUT";
      payload: unknown;
      field: string;
      message: string;
    }

    const rows: Row[] = [
      {
        label: "X1 post",
        method: "POST",
        payload: { id: "x1", tools: [{ ...WC, source: "return {" }] },
        field: "body/tools/0/source",
        message: SYNTAX,
      },
      {
        label: "X1 put",
        method: "PUT",
        payload: { tools: [{ ...WC, source: "return {" }] },
        field: "body/tools/0/source",
        message: SYNTAX,
      },
      {
        label: "X2 post",
        method: "POST",
        payload: { id: "x2", tools: [{ ...WC, source: "const x = 1;" }] },
        field: "body/tools/0/source",
        message: NO_RETURN,
      },
      {
        label: "X2 put",
        method: "PUT",
        payload: { tools: [{ ...WC, source: "const x = 1;" }] },
        field: "body/tools/0/source",
        message: NO_RETURN,
      },
      {
        label: "X3 post",
        method: "POST",
        payload: {
          id: "x3",
          tools: [
            { ...WC, source: "const x = 1;" },
            { ...EX, source: "return {" },
          ],
        },
        field: "body/tools/0/source",
        message: NO_RETURN,
      },
      {
        label: "X3 put",
        method: "PUT",
        payload: {
          tools: [
            { ...WC, source: "const x = 1;" },
            { ...EX, source: "return {" },
          ],
        },
        field: "body/tools/0/source",
        message: NO_RETURN,
      },
      {
        label: "X4 post",
        method: "POST",
        payload: { id: "x4", tools: [WC, { ...EX, source: "return {" }] },
        field: "body/tools/1/source",
        message: SYNTAX,
      },
      {
        label: "X4 put",
        method: "PUT",
        payload: { tools: [WC, { ...EX, source: "return {" }] },
        field: "body/tools/1/source",
        message: SYNTAX,
      },
      {
        label: "X5",
        method: "POST",
        payload: { id: "x5", tools: [{ ...WC, source: BIG }] },
        field: "body/tools/0/source",
        message: "bad_value",
      },
      {
        label: "X6",
        method: "POST",
        payload: { id: "x6", tools: [{ ...WC, source: "return { a: '\ud800' };" }] },
        field: "body/tools/0/source",
        message: "bad_value",
      },
      {
        label: "X7",
        method: "POST",
        payload: { id: "x7", tools: [WC, WC] },
        field: "body/tools/1/name",
        message: "duplicate",
      },
      {
        label: "X8",
        method: "POST",
        payload: { id: "Snips", tools: [WC] },
        field: "body/id",
        message: "bad_value",
      },
      {
        label: "X9",
        method: "POST",
        payload: { id: "x9", tools: [] },
        field: "body/tools",
        message: "must NOT have fewer than 1 items",
      },
      {
        label: "X10 effect",
        method: "POST",
        payload: { id: "x10", tools: [{ ...WC, effect: "write" }] },
        field: "body/tools/0/effect",
        message: "must NOT have additional properties",
      },
      {
        label: "X10 source",
        method: "POST",
        payload: { id: "x10b", tools: [{ ...WC, source: 5 }] },
        field: "body/tools/0/source",
        message: "must be string",
      },
    ];

    for (const [index, row] of rows.entries()) {
      const before = await rowCounts(h);
      const url =
        row.method === "POST"
          ? "/api/v1/tool-registrations/code"
          : "/api/v1/tool-servers/snips/code";
      const response = await send(h, row.method, url, h.carol, row.payload, `key-${index}`);
      assert.equal(response.statusCode, 400, row.label);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", row.label);
      assert.deepEqual(fieldsOf(response.json()), [{ field: row.field, message: row.message }], row.label);
      assert.deepEqual(await rowCounts(h), before, row.label);
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-043a8b91 only tenant admins mutate a code block server and other adapters are refused", async () => {
  const h = await createHarness();
  try {
    const seeded = await send(
      h,
      "POST",
      "/api/v1/tool-registrations/code",
      h.carol,
      { id: "snips", tools: [WC] },
      "seed",
    );
    assert.equal(seeded.statusCode, 201);

    const ghost = await send(h, "PUT", "/api/v1/tool-servers/ghost/code", h.carol, { tools: [WC] });
    assert.equal(ghost.statusCode, 404);
    assert.equal((ghost.json() as ErrorBody).error.code, "NOT_FOUND");

    const acme = await send(
      h,
      "POST",
      "/api/v1/tool-servers",
      h.carol,
      {
        id: "acme",
        adapter: "fixture",
        origin: ORIGIN,
        surface: fixtureSurface(["erp.lookup_vendor@1"]),
      },
      "acme",
    );
    assert.equal(acme.statusCode, 201);
    const u2 = await send(h, "PUT", "/api/v1/tool-servers/acme/code", h.carol, { tools: [WC] });
    assert.equal(u2.statusCode, 422);
    assert.equal((u2.json() as ErrorBody).error.code, "OPERATION_REFUSED");
    assert.equal((u2.json() as ErrorBody).error.details?.reason, "adapter_mismatch");

    await withTenantTx(h.db.appPool, h.a, (tx) =>
      registerAdapterServerTx(
        tx,
        h.a,
        {
          id: "shop",
          adapter: "http_openapi",
          origin: "https://shop.fake.test",
          local: false,
          surface: kitSurface("http"),
        },
        { kind: "user", id: h.carol.userId },
        { clock: fixedClock(NOW) },
      ),
    );
    const u3 = await send(h, "PUT", "/api/v1/tool-servers/shop/code", h.carol, { tools: [WC] });
    assert.equal(u3.statusCode, 422);
    assert.equal((u3.json() as ErrorBody).error.code, "OPERATION_REFUSED");
    assert.equal((u3.json() as ErrorBody).error.details?.reason, "adapter_mismatch");

    const u4 = await send(h, "PUT", "/api/v1/tool-servers/snips/code", h.mallory, { tools: [WC] });
    assert.equal(u4.statusCode, 404);
    assert.equal((u4.json() as ErrorBody).error.code, "NOT_FOUND");

    const u5 = await send(
      h,
      "POST",
      "/api/v1/tool-registrations/code",
      h.alice,
      { id: "nope", tools: [WC] },
      "alice",
    );
    assert.equal(u5.statusCode, 403);
    assert.equal((u5.json() as ErrorBody).error.code, "FORBIDDEN");

    const u6 = await send(h, "PUT", "/api/v1/tool-servers/snips/code", h.alice, { tools: [WC] });
    assert.equal(u6.statusCode, 403);
    assert.equal((u6.json() as ErrorBody).error.code, "FORBIDDEN");
  } finally {
    await closeHarness(h);
  }
});

test("C-043a8b91 a null route pool answers the code registration with 503", async () => {
  const h = await createHarness({ depsPool: "null" });
  try {
    const z1 = await send(
      h,
      "POST",
      "/api/v1/tool-registrations/code",
      h.carol,
      { id: "snips", tools: [WC] },
      "z1",
    );
    assert.equal(z1.statusCode, 503);
    assert.deepEqual(z1.json(), UNAVAILABLE);
  } finally {
    await closeHarness(h);
  }
});
