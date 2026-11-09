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
import { importCatalogue } from "../registry/index.ts";
import type { BlockImport } from "../registry/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext } from "../tenancy/index.ts";
import { createTestSession } from "../../test/support/api-session.ts";
import { loadTestCatalogue } from "../../test/support/catalogue/loader.ts";
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
const REGISTERED_AT = "2026-11-09T10:00:00.000000Z";
const ORIGIN = "https://tools.fake.test";
const ZERO = `sha256:${"0".repeat(64)}`;

const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_B = "sha256:8d3d0f71f1a243d50752e6a5a9c3e9e672a3226900a6d13047a5af98d1642da2";
const D_ONE = "sha256:b9abc02155ff61abbcbfdccbda174b71a0502bd2597072ce6e5d6584e08818aa";
const D_PING = "sha256:aa3089b4ead0b1991651cec106303e025ac4b569a55767655f1c57fd42c02552";

const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";
const SURF_A = fixtureSurface([LV, CP], { untrustedResult: { [LV]: false, [CP]: false } });
const SURF_B = fixtureSurface([LV, CP], { untrustedResult: { [LV]: true, [CP]: false } });
const SURF_ONE = fixtureSurface([LV], { untrustedResult: { [LV]: false } });
const T0 = SURF_ONE.tools[0];
const SURF_PING = {
  tools: [
    {
      name: "ping",
      effect: "read",
      input: { type: "object" },
      output: { type: "object" },
      http: { method: "GET", path: "/ping" },
    },
  ],
};

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
  const srcDir = await mkdtemp(join(tmpdir(), "api-tool-server-routes-src-"));
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

interface Options {
  pepPool?: "real" | "null";
  depsPool?: "real" | "null";
  keyed?: boolean;
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
  const keyed = opts.keyed ?? true;
  installPep(server, {
    pool: opts.pepPool === "null" ? null : db.appPool,
    engine,
    clock,
    publicBaseUrl: BASE_URL,
  });
  const engineKey = keyed ? { reveal: () => "k".repeat(64) } : null;
  assert.doesNotThrow(() => {
    registerBlockRoutes(server, { pool: db.appPool, engineKey });
  }, "registerBlockRoutes");
  assert.doesNotThrow(() => {
    registerToolServerRoutes(server, {
      pool: opts.depsPool === "null" ? null : db.appPool,
      clock,
      engineKey,
    });
  }, "registerToolServerRoutes");

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

function pending(registeredBy: string) {
  return {
    id: "acme",
    adapter: "fixture",
    origin: ORIGIN,
    local: false,
    state: "pending",
    registeredBy,
    registeredAt: REGISTERED_AT,
    approvedDigest: null,
    pendingDigest: D_A,
    pendingSubmittedBy: registeredBy,
    tools: [
      { name: "lookup_vendor", effect: "read", ref: null },
      { name: "create_payment", effect: "pay", ref: null },
    ],
  };
}

async function importTestBlocks(h: Harness): Promise<void> {
  const catalogue = loadTestCatalogue();
  const blocks: Record<string, BlockImport> = {};
  for (const ref of catalogue.blockRefs()) {
    const def = catalogue.block(ref);
    assert.ok(def !== undefined, `the test catalogue holds ${ref}`);
    blocks[ref] = def;
  }
  await importCatalogue(h.db.appPool, h.a, blocks, { kind: "system", id: "operator:e2e-seed" }, {
    clock: fixedClock(NOW),
  });
}

async function setProfile(h: Harness, profile: "solo" | "team"): Promise<void> {
  await h.db.ownerPool.query("UPDATE ursitoare.tenant SET review_profile = $1 WHERE tenant_id = 'tenant_a'", [
    profile,
  ]);
}

test("C-0ab1d0b5 carol registers and reads while alice is refused and tenant_b sees nothing", async () => {
  const h = await createHarness();
  try {
    const first = await send(h, "POST", "/api/v1/tool-servers", h.carol, BODY, "k1");
    assert.equal(first.statusCode, 201);
    assert.deepEqual(first.json(), pending(h.carol.userId));

    const replay = await send(h, "POST", "/api/v1/tool-servers", h.carol, BODY, "k1");
    assert.equal(replay.statusCode, 201);
    assert.deepEqual(replay.json(), pending(h.carol.userId));
    assert.equal(replay.headers["idempotent-replayed"], "true");

    const again = await send(h, "POST", "/api/v1/tool-servers", h.carol, BODY, "k2");
    assert.equal(again.statusCode, 409);
    assert.equal((again.json() as ErrorBody).error.code, "ALREADY_EXISTS");

    const beta = await send(
      h,
      "POST",
      "/api/v1/tool-servers",
      h.carol,
      { ...BODY, id: "beta", surface: SURF_ONE },
      "k3",
    );
    assert.equal(beta.statusCode, 201);

    for (const [method, payload] of [
      ["POST", BODY],
      ["GET", undefined],
    ] as const) {
      const denied = await send(h, method, "/api/v1/tool-servers", h.alice, payload, "k4");
      assert.equal(denied.statusCode, 403, method);
      assert.equal((denied.json() as ErrorBody).error.code, "FORBIDDEN", method);
    }

    const page1 = await send(h, "GET", "/api/v1/tool-servers?limit=1", h.carol);
    assert.equal(page1.statusCode, 200);
    const body1 = page1.json() as { items: { id: string }[]; next_cursor: string | null };
    assert.deepEqual(
      body1.items.map((s) => s.id),
      ["acme"],
    );
    assert.equal(typeof body1.next_cursor, "string");
    const page2 = await send(
      h,
      "GET",
      `/api/v1/tool-servers?limit=1&cursor=${encodeURIComponent(body1.next_cursor ?? "")}`,
      h.carol,
    );
    const body2 = page2.json() as { items: { id: string }[]; next_cursor: string | null };
    assert.deepEqual(
      body2.items.map((s) => s.id),
      ["beta"],
    );
    assert.equal(body2.next_cursor, null);

    const detail = await send(h, "GET", "/api/v1/tool-servers/acme", h.carol);
    assert.equal(detail.statusCode, 200);
    assert.deepEqual(detail.json(), {
      ...pending(h.carol.userId),
      approvedSurface: null,
      pendingSurface: SURF_A,
    });
    assert.equal((await send(h, "GET", "/api/v1/tool-servers/nope", h.carol)).statusCode, 404);

    const theirs = await send(h, "GET", "/api/v1/tool-servers", h.mallory);
    assert.deepEqual(theirs.json(), { items: [], next_cursor: null });
    assert.equal((await send(h, "GET", "/api/v1/tool-servers/acme", h.mallory)).statusCode, 404);
  } finally {
    await closeHarness(h);
  }
});

test("C-0ab1d0b5 the local flag widens the origin check and the audit names carol", async () => {
  const h = await createHarness();
  try {
    const loc = { id: "loc", adapter: "fixture", origin: "http://10.1.2.3:8080", surface: SURF_PING };
    const ok = await send(h, "POST", "/api/v1/tool-servers", h.carol, { ...loc, local: true }, "l1");
    assert.equal(ok.statusCode, 201);
    const rec = ok.json() as { local: boolean; pendingDigest: string; tools: unknown };
    assert.equal(rec.local, true);
    assert.equal(rec.pendingDigest, D_PING);
    assert.deepEqual(rec.tools, [{ name: "ping", effect: "read", ref: null }]);

    const without = await send(h, "POST", "/api/v1/tool-servers", h.carol, loc, "l2");
    assert.equal(without.statusCode, 400);
    assert.deepEqual(fieldsOf(without.json()), [{ field: "body/origin", message: "scheme" }]);

    const yes = await send(h, "POST", "/api/v1/tool-servers", h.carol, { ...loc, local: "yes" }, "l3");
    assert.equal(yes.statusCode, 400);
    assert.deepEqual(fieldsOf(yes.json()), [{ field: "body/local", message: "must be boolean" }]);

    const alice = await send(h, "POST", "/api/v1/tool-servers", h.alice, { ...loc, local: true }, "l4");
    assert.equal(alice.statusCode, 403);

    for (const [id, extra] of [
      ["m1", {}],
      ["m2", {}],
    ] as const) {
      const r = await send(
        h,
        "POST",
        "/api/v1/tool-servers",
        h.carol,
        { id, adapter: "fixture", origin: ORIGIN, surface: SURF_ONE, ...extra },
        `r-${id}`,
      );
      assert.equal(r.statusCode, 201);
    }

    const events = await withTenantTx(h.db.ownerPool, h.a, (tx) =>
      tx.query<{ kind: string; id: string }>(
        `SELECT actor->>'kind' AS kind, actor->>'id' AS id FROM ursitoare.audit_event
          WHERE event_type = 'tools.server_registered'`,
      ),
    );
    assert.equal(events.rows.length, 3);
    for (const row of events.rows) {
      assert.deepEqual(row, { kind: "user", id: h.carol.userId });
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-0ab1d0b5 malformed requests are 400 with the field of the rule", async () => {
  const h = await createHarness();
  try {
    const post = (payload: unknown, key: string) =>
      send(h, "POST", "/api/v1/tool-servers", h.carol, payload, key);
    const valid = { id: "m1", adapter: "fixture", origin: ORIGIN, surface: SURF_ONE };

    const cases: [string, Promise<{ statusCode: number; json(): unknown }>, unknown][] = [
      ["empty", post({}, "a1"), [{ field: "body/id", message: "must have required property 'id'" }]],
      [
        "extra",
        post({ ...BODY, serviceId: "x" }, "a2"),
        [{ field: "body/serviceId", message: "must NOT have additional properties" }],
      ],
      ["bad id", post({ ...valid, id: "Bad!" }, "a3"), [{ field: "body/id", message: "bad_value" }]],
      [
        "no tools",
        post({ ...valid, surface: {} }, "a4"),
        [{ field: "body/surface/tools", message: "not_array" }],
      ],
      [
        "root member",
        post({ ...valid, surface: { tools: [T0], meta: 1 } }, "a5"),
        [{ field: "body/surface", message: "unknown_property" }],
      ],
      [
        "bad adapter",
        post({ ...valid, adapter: "bogus" }, "a6"),
        [{ field: "body/adapter", message: "must be equal to one of the allowed values" }],
      ],
      [
        "loopback",
        post({ ...valid, origin: "https://localhost" }, "a7"),
        [{ field: "body/origin", message: "loopback" }],
      ],
      [
        "bad id path",
        send(h, "GET", "/api/v1/tool-servers/BAD!", h.carol),
        [{ field: "params/id", message: 'must match pattern "^[a-z][a-z0-9_]{0,31}$"' }],
      ],
      [
        "put empty",
        send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.carol, {}),
        [{ field: "body/tools", message: "not_array" }],
      ],
      [
        "approve empty",
        send(h, "POST", "/api/v1/tool-servers/acme/surface/approve", h.carol, {}),
        [{ field: "body/digest", message: "must have required property 'digest'" }],
      ],
      [
        "approve flag",
        send(h, "POST", "/api/v1/tool-servers/acme/surface/approve", h.carol, {
          digest: D_A,
          selfApproval: "yes",
        }),
        [{ field: "body/selfApproval", message: "must be boolean" }],
      ],
    ];
    for (const [label, pendingResponse, fields] of cases) {
      const response = await pendingResponse;
      assert.equal(response.statusCode, 400, label);
      assert.equal((response.json() as ErrorBody).error.code, "VALIDATION_FAILED", label);
      assert.deepEqual(fieldsOf(response.json()), fields, label);
    }

    const mcp = await post({ ...valid, adapter: "mcp" }, "a8");
    assert.equal(mcp.statusCode, 422);
    assert.equal((mcp.json() as ErrorBody).error.details?.reason, "adapter_unavailable");

    const listed = await send(h, "GET", "/api/v1/tool-servers", h.carol);
    assert.deepEqual(listed.json(), { items: [], next_cursor: null });
  } finally {
    await closeHarness(h);
  }
});

test("C-29de3844 approval follows the review profile and the approved blocks show as bound", async () => {
  const h = await createHarness();
  try {
    await importTestBlocks(h);
    for (const [id, surface, key] of [
      ["acme", SURF_A, "k1"],
      ["beta", SURF_ONE, "k2"],
    ] as const) {
      const r = await send(
        h,
        "POST",
        "/api/v1/tool-servers",
        h.carol,
        { id, adapter: "fixture", origin: ORIGIN, surface },
        key,
      );
      assert.equal(r.statusCode, 201, id);
    }

    const approve = (who: Session, id: string, payload: unknown) =>
      send(h, "POST", `/api/v1/tool-servers/${id}/surface/approve`, who, payload);
    const refused = async (response: { statusCode: number; json(): unknown }, reason: string) => {
      assert.equal(response.statusCode, 422, reason);
      const error = (response.json() as ErrorBody).error;
      assert.equal(error.code, "OPERATION_REFUSED", reason);
      assert.equal(error.details?.reason, reason);
    };

    await setProfile(h, "team");
    await refused(await approve(h.carol, "acme", { digest: D_A, selfApproval: true }), "approver_is_submitter");
    assert.equal((await approve(h.alice, "acme", { digest: D_A })).statusCode, 403);
    await refused(await approve(h.dave, "acme", { digest: ZERO }), "digest_mismatch");
    const ok = await approve(h.dave, "acme", { digest: D_A });
    assert.equal(ok.statusCode, 200);
    const okBody = ok.json() as { server: { state: string; approvedDigest: string }; blocks: string[] };
    assert.equal(okBody.server.state, "approved");
    assert.equal(okBody.server.approvedDigest, D_A);
    assert.deepEqual(okBody.blocks, ["acme.create_payment@1", "acme.lookup_vendor@1"]);

    await setProfile(h, "solo");
    await refused(await approve(h.carol, "beta", { digest: D_ONE }), "self_approval_required");
    const self = await approve(h.carol, "beta", { digest: D_ONE, selfApproval: true });
    assert.equal(self.statusCode, 200);
    assert.deepEqual((self.json() as { blocks: string[] }).blocks, ["beta.lookup_vendor@1"]);
    await refused(await approve(h.carol, "beta", { digest: D_ONE, selfApproval: true }), "nothing_pending");
    assert.equal((await approve(h.carol, "nope", { digest: D_A })).statusCode, 404);

    const same = await send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.dave, SURF_A);
    assert.equal(same.statusCode, 200);
    assert.equal((same.json() as { state: string }).state, "approved");
    const drift = await send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.dave, SURF_B);
    assert.equal(drift.statusCode, 200);
    const drifted = drift.json() as { state: string; pendingDigest: string; pendingSubmittedBy: string };
    assert.equal(drifted.state, "drifted");
    assert.equal(drifted.pendingDigest, D_B);
    assert.equal(drifted.pendingSubmittedBy, h.dave.userId);
    const bad = await send(h, "PUT", "/api/v1/tool-servers/acme/surface", h.dave, {
      tools: [{ ...SURF_A.tools[0], http: { method: "GET", path: "/x" } }, SURF_A.tools[1]],
    });
    assert.equal(bad.statusCode, 400);
    assert.deepEqual(fieldsOf(bad.json()), [
      { field: "body/tools/0/http/method", message: "method_without_body" },
    ]);
    assert.equal((await send(h, "PUT", "/api/v1/tool-servers/nope/surface", h.dave, SURF_A)).statusCode, 404);

    const blocks = await send(h, "GET", "/api/v1/blocks", h.carol);
    assert.equal(blocks.statusCode, 200);
    const items = (blocks.json() as { items: { ref: string; bound: boolean }[] }).items;
    assert.equal(items.length, 23);
    const bound = items.filter((i) => i.bound).map((i) => i.ref);
    assert.deepEqual(bound, ["acme.create_payment@1", "acme.lookup_vendor@1", "beta.lookup_vendor@1"]);
  } finally {
    await closeHarness(h);
  }
});

const UNAVAILABLE = { error: { code: "AUTHZ_UNAVAILABLE", message: "Authorization is unavailable" } };

test("C-4114528c a null PEP pool answers every route 503 before validation", async () => {
  const h = await createHarness({ pepPool: "null", depsPool: "null", keyed: false });
  try {
    const requests: [string, string, unknown][] = [
      ["POST", "/api/v1/tool-servers", BODY],
      ["POST", "/api/v1/tool-servers", {}],
      ["GET", "/api/v1/tool-servers", undefined],
      ["GET", "/api/v1/tool-servers/acme", undefined],
      ["PUT", "/api/v1/tool-servers/acme/surface", SURF_A],
      ["POST", "/api/v1/tool-servers/acme/surface/approve", { digest: D_A }],
    ];
    for (const [method, url, payload] of requests) {
      const response = await send(h, method as "GET", url, null, payload);
      assert.equal(response.statusCode, 503, `${method} ${url}`);
      assert.deepEqual(response.json(), UNAVAILABLE, `${method} ${url}`);
    }
  } finally {
    await closeHarness(h);
  }
});

test("C-4114528c a null deps pool is 503 for carol and 403 for alice", async () => {
  const h = await createHarness({ depsPool: "null" });
  try {
    const carol = await send(h, "POST", "/api/v1/tool-servers", h.carol, BODY, "n1");
    assert.equal(carol.statusCode, 503);
    assert.deepEqual(carol.json(), UNAVAILABLE);
    const alice = await send(h, "POST", "/api/v1/tool-servers", h.alice, BODY, "n2");
    assert.equal(alice.statusCode, 403);
    assert.equal((alice.json() as ErrorBody).error.code, "FORBIDDEN");
  } finally {
    await closeHarness(h);
  }
});

test("C-4114528c a null engine key refuses paging only", async () => {
  const h = await createHarness({ keyed: false });
  try {
    for (const [id, surface, key] of [
      ["acme", SURF_A, "k1"],
      ["beta", SURF_ONE, "k2"],
    ] as const) {
      const r = await send(
        h,
        "POST",
        "/api/v1/tool-servers",
        h.carol,
        { id, adapter: "fixture", origin: ORIGIN, surface },
        key,
      );
      assert.equal(r.statusCode, 201, id);
    }
    assert.equal((await send(h, "GET", "/api/v1/tool-servers/acme", h.carol)).statusCode, 200);

    for (const query of ["?limit=1", "?cursor=abc"]) {
      const response = await send(h, "GET", `/api/v1/tool-servers${query}`, h.carol);
      assert.equal(response.statusCode, 503, query);
      assert.deepEqual(
        response.json(),
        {
          error: {
            code: "ENGINE_KEY_REQUIRED",
            message: "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
          },
        },
        query,
      );
    }
    const whole = await send(h, "GET", "/api/v1/tool-servers?limit=2", h.carol);
    assert.equal(whole.statusCode, 200);
    const body = whole.json() as { items: { id: string }[]; next_cursor: string | null };
    assert.deepEqual(
      body.items.map((s) => s.id),
      ["acme", "beta"],
    );
    assert.equal(body.next_cursor, null);
  } finally {
    await closeHarness(h);
  }
});
