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
import { SHOP_DOC, SHOP_ORIGIN, SHOP_OVERLAY } from "../../test/support/openapi-kit.ts";
import { seedFlowActors } from "../../test/support/flow-actors.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import type { TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { installPep } from "./pep.ts";
import { registerOpenApiToolRoutes } from "./openapi-tool-routes.ts";
import { buildServer } from "./server.ts";
import { registerToolServerRoutes } from "./tool-server-routes.ts";

const silentDestination: LogDestination = { write(): void {} };
const BASE_URL = "http://127.0.0.1:8080";
const NOW = "2026-11-09T10:00:00Z";
const REGISTERED_AT = "2026-11-09T10:00:00.000000Z";

const D_SHOP = "sha256:726b207dffe2a42cb6d04fc724f06997614217038f83f37b9e8fae83614fc7ba";
const D_SHOP_B = "sha256:3e4c03705609cb90a562f6a8b19ff27d83e2e297ff41ffdb9ef39a63030d37aa";

const PREVIEW_URL = "/api/v1/tool-registrations/openapi/preview";
const REGISTER_URL = "/api/v1/tool-registrations/openapi";

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

interface Options {
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
  const srcDir = await mkdtemp(join(tmpdir(), "api-openapi-tool-routes-src-"));
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

async function createHarness(opts: Options = {}): Promise<Harness> {
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
  const pool = opts.depsPool === "null" ? null : db.appPool;
  try {
    assert.doesNotThrow(() => {
      registerToolServerRoutes(server, { pool, clock, engineKey });
    }, "registerToolServerRoutes");
    assert.doesNotThrow(() => {
      registerOpenApiToolRoutes(server, { pool, clock, engineKey });
    }, "registerOpenApiToolRoutes");
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
  method: "POST" | "PUT",
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

async function countServers(h: Harness): Promise<number> {
  const rows = await withTenantTx(h.db.ownerPool, h.a, (tx) =>
    tx.query<{ n: string }>("SELECT count(*)::text AS n FROM ursitoare.tool_server"),
  );
  return Number(rows.rows[0]?.n ?? "-1");
}

function shopB(): Record<string, unknown> {
  const doc = structuredClone(SHOP_DOC) as unknown as {
    paths: Record<string, Record<string, Record<string, unknown>>>;
  };
  const get = doc.paths["/vendors/{vendor_id}"]?.["get"];
  assert.ok(get !== undefined, "SHOP_DOC has the getVendor operation");
  get["summary"] = "Fetch a vendor.";
  return doc as unknown as Record<string, unknown>;
}

function bigDoc(count: number): { document: Record<string, unknown>; overlay: Record<string, unknown> } {
  const properties: Record<string, unknown> = {};
  for (let i = 0; i < 3000; i += 1) {
    properties[`p${i}`] = { type: "string", description: "x".repeat(40) };
  }
  const paths: Record<string, unknown> = {};
  const operations: Record<string, unknown> = {};
  for (let i = 0; i < count; i += 1) {
    paths[`/a${i}`] = {
      get: {
        operationId: `op${i}`,
        responses: {
          "200": {
            description: "ok",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Big" } } },
          },
        },
      },
    };
    operations[`op${i}`] = { effect: "read" };
  }
  return {
    document: {
      openapi: "3.0.3",
      info: { title: "t", version: "1" },
      paths,
      components: { schemas: { Big: { type: "object", properties } } },
    },
    overlay: { operations },
  };
}

function shopRecord(registeredBy: string, digest: string, submittedBy: string) {
  return {
    id: "shop",
    adapter: "http_openapi",
    origin: SHOP_ORIGIN,
    local: false,
    state: "pending",
    registeredBy,
    registeredAt: REGISTERED_AT,
    approvedDigest: null,
    pendingDigest: digest,
    pendingSubmittedBy: submittedBy,
    tools: [
      { name: "get_vendor", effect: "read", ref: null },
      { name: "delete_vendor", effect: "write", ref: null },
      { name: "add_vendor", effect: "write", ref: null },
      { name: "fetch_page", effect: "read", ref: null },
    ],
  };
}

const SHOP_BODY = { id: "shop", origin: SHOP_ORIGIN, document: SHOP_DOC, overlay: SHOP_OVERLAY };

test("C-1f964937 P1 carol previews SHOP_DOC and nothing is stored", async () => {
  const h = await createHarness();
  try {
    const res = await send(h, "POST", PREVIEW_URL, h.carol, { origin: SHOP_ORIGIN, document: SHOP_DOC });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), {
      version: "3.0",
      basePath: "/v1",
      operations: [
        { operationId: "getVendor", method: "GET", path: "/vendors/{vendor_id}", name: "get_vendor", excluded: null },
        { operationId: "deleteVendor", method: "DELETE", path: "/vendors/{vendor_id}", name: "delete_vendor", excluded: null },
        { operationId: "createVendor", method: "POST", path: "/vendors", name: "create_vendor", excluded: null },
        { operationId: "fetchPage", method: "POST", path: "/pages", name: "fetch_page", excluded: null },
        { operationId: "exportVendors", method: "HEAD", path: "/vendors/export", name: "export_vendors", excluded: "method_unsupported" },
      ],
    });
    assert.equal(await countServers(h), 0);
  } finally {
    await closeHarness(h);
  }
});

test("C-1f964937 P2 carol registers shop, the replay is the same and a new key or body is refused", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", REGISTER_URL, h.carol, SHOP_BODY, "k1");
    assert.equal(first.statusCode, 201);
    assert.deepEqual(first.json(), shopRecord(h.carol.userId, D_SHOP, h.carol.userId));

    const replay = await send(h, "POST", REGISTER_URL, h.carol, SHOP_BODY, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), shopRecord(h.carol.userId, D_SHOP, h.carol.userId));
    assert.equal(replay.headers["idempotent-replayed"], "true");
    assert.equal(await countServers(h), 1);

    const again = await send(h, "POST", REGISTER_URL, h.carol, SHOP_BODY, "k2");
    assert.equal(again.statusCode, 409);
    assert.equal(codeOf(again.json()), "ALREADY_EXISTS");

    const other = await send(h, "POST", REGISTER_URL, h.carol, { ...SHOP_BODY, id: "shop2" }, "k1");
    assert.equal(other.statusCode, 422);
    assert.equal(codeOf(other.json()), "IDEMPOTENCY_KEY_REUSED");
  } finally {
    await closeHarness(h);
  }
});

test("C-1f964937 P3 dave replaces the document of shop and the digest changes", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", REGISTER_URL, h.carol, SHOP_BODY, "k1");
    assert.equal(first.statusCode, 201);
    const res = await send(h, "PUT", "/api/v1/tool-servers/shop/openapi", h.dave, {
      document: shopB(),
      overlay: SHOP_OVERLAY,
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), shopRecord(h.carol.userId, D_SHOP_B, h.dave.userId));
  } finally {
    await closeHarness(h);
  }
});

test("C-7b1bd327 P4 each body refusal is 400 with its field and nothing is stored", async () => {
  const h = await createHarness();
  try {
    const big = bigDoc(5);
    const cases: [string, string, unknown, unknown][] = [
      ["origin", "p1", { ...SHOP_BODY, origin: "http://shop.fake.test" }, [{ field: "body/origin", message: "scheme" }]],
      [
        "overlay",
        "p2",
        { ...SHOP_BODY, overlay: { operations: { ghost: { effect: "read" } } } },
        [{ field: "body/overlay/operations/ghost", message: "unknown_operation" }],
      ],
      [
        "version",
        "p3",
        { ...SHOP_BODY, document: { openapi: "2.0" } },
        [{ field: "body/document/openapi", message: "openapi_version" }],
      ],
      [
        "size",
        "p4",
        { ...SHOP_BODY, document: big.document, overlay: big.overlay },
        [{ field: "body/document", message: "size" }],
      ],
      ["extra", "p5", { ...SHOP_BODY, extra: 1 }, [{ field: "body/extra", message: "must NOT have additional properties" }]],
      ["array", "p6", { ...SHOP_BODY, document: [] }, [{ field: "body/document", message: "must be object" }]],
    ];
    for (const [label, key, payload, fields] of cases) {
      const res = await send(h, "POST", REGISTER_URL, h.carol, payload, key);
      assert.equal(res.statusCode, 400, label);
      assert.equal(codeOf(res.json()), "VALIDATION_FAILED", label);
      assert.deepEqual(fieldsOf(res.json()), fields, label);
    }
    assert.equal(await countServers(h), 0);
  } finally {
    await closeHarness(h);
  }
});

test("C-7b1bd327 P4 a replace of a missing or fixture server is refused", async () => {
  const h = await createHarness();
  try {
    const fixture = await send(
      h,
      "POST",
      "/api/v1/tool-servers",
      h.carol,
      {
        id: "acme",
        adapter: "fixture",
        origin: "https://tools.fake.test",
        surface: fixtureSurface(["erp.lookup_vendor@1"]),
      },
      "f1",
    );
    assert.equal(fixture.statusCode, 201);
    const body = { document: SHOP_DOC, overlay: SHOP_OVERLAY };

    const ghost = await send(h, "PUT", "/api/v1/tool-servers/ghost/openapi", h.dave, body);
    assert.equal(ghost.statusCode, 404);
    assert.equal(codeOf(ghost.json()), "NOT_FOUND");

    const acme = await send(h, "PUT", "/api/v1/tool-servers/acme/openapi", h.dave, body);
    assert.equal(acme.statusCode, 422);
    assert.equal(codeOf(acme.json()), "OPERATION_REFUSED");
    assert.deepEqual((acme.json() as ErrorBody).error.details, { reason: "adapter_mismatch" });
    assert.equal(await countServers(h), 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-7b1bd327 P4 alice is forbidden, tenant b is isolated and a huge document is 413", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", REGISTER_URL, h.carol, SHOP_BODY, "k1");
    assert.equal(first.statusCode, 201);

    const requests: ["POST" | "PUT", string, unknown][] = [
      ["POST", PREVIEW_URL, { origin: SHOP_ORIGIN, document: SHOP_DOC }],
      ["POST", REGISTER_URL, { ...SHOP_BODY, id: "other" }],
      ["PUT", "/api/v1/tool-servers/shop/openapi", { document: SHOP_DOC, overlay: SHOP_OVERLAY }],
    ];
    for (const [method, url, payload] of requests) {
      const denied = await send(h, method, url, h.alice, payload, "a1");
      assert.equal(denied.statusCode, 403, url);
      assert.equal(codeOf(denied.json()), "FORBIDDEN", url);
    }

    const theirs = await send(h, "PUT", "/api/v1/tool-servers/shop/openapi", h.mallory, {
      document: SHOP_DOC,
      overlay: SHOP_OVERLAY,
    });
    assert.equal(theirs.statusCode, 404);
    const hers = await send(h, "POST", REGISTER_URL, h.mallory, SHOP_BODY, "m1");
    assert.equal(hers.statusCode, 201);

    const huge = await send(
      h,
      "POST",
      REGISTER_URL,
      h.carol,
      { ...SHOP_BODY, id: "huge", document: { pad: "x".repeat(1_100_000) } },
      "h1",
    );
    assert.equal(huge.statusCode, 413);
    assert.equal(codeOf(huge.json()), "PAYLOAD_TOO_LARGE");
    assert.equal(await countServers(h), 1);
  } finally {
    await closeHarness(h);
  }
});

test("C-7b1bd327 P4 without a pool each route is 503 AUTHZ_UNAVAILABLE", async () => {
  const h = await createHarness({ depsPool: "null" });
  try {
    const requests: ["POST" | "PUT", string, unknown][] = [
      ["POST", PREVIEW_URL, { origin: SHOP_ORIGIN, document: SHOP_DOC }],
      ["POST", REGISTER_URL, SHOP_BODY],
      ["PUT", "/api/v1/tool-servers/shop/openapi", { document: SHOP_DOC, overlay: SHOP_OVERLAY }],
    ];
    for (const [method, url, payload] of requests) {
      const res = await send(h, method, url, h.carol, payload, "n1");
      assert.equal(res.statusCode, 503, url);
      assert.equal(codeOf(res.json()), "AUTHZ_UNAVAILABLE", url);
    }
    assert.equal(await countServers(h), 0);
  } finally {
    await closeHarness(h);
  }
});
