import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../../tenancy/index.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { fixtureSurface } from "../../../test/support/tool-surface.ts";
import { SHOP_DOC, SHOP_ORIGIN, SHOP_OVERLAY, docOf } from "../../../test/support/openapi-kit.ts";
import { approveSurface, registerToolServer } from "../store.ts";
import * as tools from "../index.ts";
import type { OpenApiOverlay } from "./types.ts";
import { registerOpenApiServerTx, submitOpenApiTx } from "./register.ts";

const ALICE = { kind: "user", id: "u_alice" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CAROL = { userId: "u_carol", kind: "user" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";
const D_SHOP = "sha256:726b207dffe2a42cb6d04fc724f06997614217038f83f37b9e8fae83614fc7ba";
const D_SHOP_B = "sha256:3e4c03705609cb90a562f6a8b19ff27d83e2e297ff41ffdb9ef39a63030d37aa";
const D_SHOP_C = "sha256:3d78b62fa7020a762eeed39c51e41cbe99b25de1ec3e23441d8b121698620087";

interface Input {
  id: string;
  origin: string;
  local: boolean;
  document: unknown;
  overlay: OpenApiOverlay;
}

function shopB(): Record<string, unknown> {
  const doc = structuredClone(SHOP_DOC) as {
    paths: Record<string, { get?: { summary: string } }>;
  };
  const get = doc.paths["/vendors/{vendor_id}"]?.get;
  assert.ok(get !== undefined);
  get.summary = "Fetch a vendor.";
  return doc as unknown as Record<string, unknown>;
}

const OVERLAY_C: OpenApiOverlay = {
  operations: { ...SHOP_OVERLAY.operations, deleteVendor: { effect: "pay" } },
};

function bigDoc(count: number): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  for (let i = 0; i < 3000; i++) {
    props[`p${i}`] = { type: "string", description: "x".repeat(40) };
  }
  const paths: Record<string, unknown> = {};
  for (let i = 0; i < count; i++) {
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
  }
  return {
    openapi: "3.0.3",
    info: { title: "t", version: "1" },
    paths,
    components: { schemas: { Big: { type: "object", properties: props } } },
  };
}

function bigOverlay(count: number): OpenApiOverlay {
  const operations: Record<string, { effect: "read" }> = {};
  for (let i = 0; i < count; i++) {
    operations[`op${i}`] = { effect: "read" };
  }
  return { operations };
}

function input(over: Partial<Input> = {}): Input {
  return {
    id: "shop",
    origin: SHOP_ORIGIN,
    local: false,
    document: SHOP_DOC,
    overlay: SHOP_OVERLAY,
    ...over,
  };
}

function register(pool: TenantPool, ctx: TenantContext, over: Partial<Input> = {}) {
  return withTenantTx(pool, ctx, (tx) => registerOpenApiServerTx(tx, ctx, input(over), ALICE, { clock: CLOCK }));
}

function submit(
  pool: TenantPool,
  ctx: TenantContext,
  id: string,
  document: unknown,
  overlay: OpenApiOverlay = SHOP_OVERLAY,
) {
  return withTenantTx(pool, ctx, (tx) => submitOpenApiTx(tx, ctx, id, { document, overlay }, DAVE, { clock: CLOCK }));
}

async function attempt(run: () => Promise<unknown>): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await run();
  } catch (error) {
    const e = error as { code?: unknown; details?: unknown };
    return { code: e.code, details: e.details };
  }
  return {};
}

async function counts(
  pool: TenantPool,
  ctx: TenantContext,
): Promise<{ servers: number; surfaces: number; events: number }> {
  return withTenantTx(pool, ctx, async (tx) => {
    const n = async (table: string): Promise<number> => {
      const r = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
      return r.rows[0]?.n ?? -1;
    };
    return { servers: await n("tool_server"), surfaces: await n("tool_surface"), events: await n("audit_event") };
  });
}

async function events(
  pool: TenantPool,
  ctx: TenantContext,
  type: string,
  id: string,
): Promise<{ payload: unknown }[]> {
  const r = await withTenantTx(pool, ctx, (tx) =>
    tx.query<{ payload: unknown }>(
      `SELECT payload FROM ursitoare.audit_event
        WHERE event_type = $1 AND target->>'id' = $2 ORDER BY seq`,
      [type, id],
    ),
  );
  return r.rows;
}

const invalid = (field: string, reason: string): { code: string; details: unknown } => ({
  code: "TOOLS_INVALID",
  details: { field, reason },
});

test("C-bdcd9f62: registerOpenApiServerTx registers shop pending with four tools, row G1", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let g1: unknown;
    await assert.doesNotReject(async () => {
      g1 = await register(db.appPool, a);
    });
    assert.deepEqual(g1, {
      id: "shop",
      adapter: "http_openapi",
      origin: SHOP_ORIGIN,
      local: false,
      state: "pending",
      registeredBy: "u_alice",
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: D_SHOP,
      pendingSubmittedBy: "u_alice",
      tools: [
        { name: "get_vendor", effect: "read", ref: null },
        { name: "delete_vendor", effect: "write", ref: null },
        { name: "add_vendor", effect: "write", ref: null },
        { name: "fetch_page", effect: "read", ref: null },
      ],
    });
    assert.deepEqual(await events(db.appPool, a, "tools.server_registered", "shop"), [
      { payload: { adapter: "http_openapi", origin: SHOP_ORIGIN } },
    ]);
  } finally {
    await db.close();
  }
});

test("C-bdcd9f62: registerOpenApiServerTx refuses each bad input and writes nothing, rows F1 to F6", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const rows: [string, Partial<Input>, unknown][] = [
      ["F1", { origin: "http://shop.fake.test" }, invalid("origin", "scheme")],
      ["F2", { document: {} }, invalid("openapi", "openapi_version")],
      ["F3", { id: "Shop" }, invalid("id", "bad_value")],
      [
        "F4",
        { overlay: { operations: { ghost: { effect: "read" } } } },
        invalid("overlay/operations/ghost", "unknown_operation"),
      ],
      ["F5", { document: bigDoc(5), overlay: bigOverlay(5) }, invalid("surface", "size")],
    ];
    const before = await counts(db.ownerPool, a);
    for (const [label, over, expected] of rows) {
      assert.deepEqual(await attempt(() => register(db.appPool, a, over)), expected, label);
    }
    assert.deepEqual(await counts(db.ownerPool, a), before);

    await assert.doesNotReject(async () => {
      await register(db.appPool, a);
    });
    const afterOne = await counts(db.ownerPool, a);
    assert.equal(afterOne.servers, before.servers + 1);
    assert.deepEqual(await attempt(() => register(db.appPool, a)), {
      code: "TOOLS_EXISTS",
      details: { id: "shop" },
    });
    assert.deepEqual(await counts(db.ownerPool, a), afterOne);
  } finally {
    await db.close();
  }
});

test("C-bdcd9f62: submitOpenApiTx replaces the surface, refuses a known one and drifts an approved server, rows H1 to H4", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: a.tenantId, reviewProfile: "team" };
    let g1: unknown;
    await assert.doesNotReject(async () => {
      g1 = await register(db.appPool, team);
    });

    // H1: the same surface changes nothing
    const before = await counts(db.ownerPool, team);
    let h1: unknown;
    await assert.doesNotReject(async () => {
      h1 = await submit(db.appPool, team, "shop", SHOP_DOC);
    });
    assert.deepEqual(h1, g1);
    assert.deepEqual(await counts(db.ownerPool, team), before);

    // H2: a new document is a new pending surface
    let h2: Awaited<ReturnType<typeof submit>> | undefined;
    await assert.doesNotReject(async () => {
      h2 = await submit(db.appPool, team, "shop", shopB());
    });
    assert.equal(h2?.state, "pending");
    assert.equal(h2?.pendingDigest, D_SHOP_B);
    assert.equal(h2?.pendingSubmittedBy, "u_dave");
    assert.deepEqual(await events(db.appPool, team, "tools.surface_submitted", "shop"), [
      { payload: { digest: D_SHOP_B, drift: false } },
    ]);
    const approved = await approveSurface(
      db.appPool,
      team,
      "shop",
      { digest: D_SHOP_B, selfApproval: false },
      CAROL,
      { clock: CLOCK },
    );
    assert.equal(approved.server.state, "approved");
    assert.deepEqual(
      approved.server.tools.map((t) => t.ref),
      ["shop.get_vendor@1", "shop.delete_vendor@1", "shop.add_vendor@1", "shop.fetch_page@1"],
    );

    // H3: a known digest is refused
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "shop", SHOP_DOC)), {
      code: "TOOLS_REFUSED",
      details: { reason: "surface_known" },
    });

    // H4: another overlay drifts the approved server
    let h4: Awaited<ReturnType<typeof submit>> | undefined;
    await assert.doesNotReject(async () => {
      h4 = await submit(db.appPool, team, "shop", SHOP_DOC, OVERLAY_C);
    });
    assert.equal(h4?.state, "drifted");
    assert.equal(h4?.approvedDigest, D_SHOP_B);
    assert.equal(h4?.pendingDigest, D_SHOP_C);
    const submitted = await events(db.appPool, team, "tools.surface_submitted", "shop");
    assert.deepEqual(submitted[submitted.length - 1], { payload: { digest: D_SHOP_C, drift: true } });
  } finally {
    await db.close();
  }
});

test("C-bdcd9f62: submitOpenApiTx refuses a missing, fixture or mismatching server and writes nothing, rows H5 and H6", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: a.tenantId, reviewProfile: "team" };
    await registerToolServer(
      db.appPool,
      team,
      {
        id: "acme",
        adapter: "fixture",
        origin: "https://tools.fake.test",
        local: false,
        surface: fixtureSurface(["erp.lookup_vendor@1"]),
      },
      ALICE,
      { clock: CLOCK },
    );
    await assert.doesNotReject(async () => {
      await register(db.appPool, team);
    });
    const before = await counts(db.ownerPool, team);

    assert.deepEqual(await attempt(() => submit(db.appPool, team, "ghost", SHOP_DOC)), {
      code: "TOOLS_NOT_FOUND",
      details: { id: "ghost" },
    });
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "acme", SHOP_DOC)), {
      code: "TOOLS_REFUSED",
      details: { reason: "adapter_mismatch" },
    });
    const other = docOf("/a", "get", {}, undefined);
    (other as { servers?: unknown }).servers = [{ url: "https://other.fake.test/v1" }];
    assert.deepEqual(
      await attempt(() => submit(db.appPool, team, "shop", other, { operations: { op: { effect: "read" } } })),
      invalid("servers", "server_mismatch"),
    );
    assert.deepEqual(
      await attempt(() =>
        submit(db.appPool, team, "shop", SHOP_DOC, { operations: { exportVendors: { effect: "read" } } }),
      ),
      invalid("overlay/operations/exportVendors", "operation_excluded"),
    );
    assert.deepEqual(await counts(db.ownerPool, team), before);
  } finally {
    await db.close();
  }
});

test("C-320b5077: the tools index exports registerOpenApiServerTx and submitOpenApiTx as functions", () => {
  const ns = tools as unknown as Record<string, unknown>;
  assert.equal(typeof ns["registerOpenApiServerTx"], "function");
  assert.equal(typeof ns["submitOpenApiTx"], "function");
});
