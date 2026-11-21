import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { kitSurface } from "../../test/support/adapter-kit.ts";
import { registerAdapterServerTx } from "./adapter-store.ts";
import type { ToolSurface } from "./types.ts";

const ALICE = { kind: "user", id: "u_alice" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";
const D_HTTP = "sha256:0a3a2a70a4d1058c9bc26e72c4cd9452402d52c008a0a0fefe393fe698b45b2a";
const D_CODE = "sha256:ca47766a9e363b72b7a9bdd8c301d900593cd1a63b310c0cb6eeb9a37a1c0513";

interface Input {
  id: string;
  adapter: "http_openapi" | "mcp" | "code_block";
  origin: string;
  local: boolean;
  surface: ToolSurface | null;
}

function input(over: Partial<Input> = {}): Input {
  return {
    id: "shop",
    adapter: "http_openapi",
    origin: "https://shop.fake.test",
    local: false,
    surface: kitSurface("http"),
    ...over,
  };
}

function register(pool: TenantPool, ctx: TenantContext, over: Partial<Input>) {
  return withTenantTx(pool, ctx, (tx) => registerAdapterServerTx(tx, ctx, input(over), ALICE, { clock: CLOCK }));
}

async function attempt(
  pool: TenantPool,
  ctx: TenantContext,
  over: Partial<Input>,
): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await register(pool, ctx, over);
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
  id: string,
): Promise<{ event_type: string; payload: unknown }[]> {
  const r = await withTenantTx(pool, ctx, (tx) =>
    tx.query<{ event_type: string; payload: unknown }>(
      `SELECT event_type, payload FROM ursitoare.audit_event
        WHERE event_type = 'tools.server_registered' AND target->>'id' = $1`,
      [id],
    ),
  );
  return r.rows;
}

test("C-b12d4caf: registerAdapterServerTx registers http_openapi, mcp and code_block servers pending", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let g1: unknown;
    await assert.doesNotReject(async () => {
      g1 = await register(db.appPool, a, {});
    });
    assert.deepEqual(g1, {
      id: "shop",
      adapter: "http_openapi",
      origin: "https://shop.fake.test",
      local: false,
      state: "pending",
      registeredBy: "u_alice",
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: D_HTTP,
      pendingSubmittedBy: "u_alice",
      tools: [{ name: "find_vendor", effect: "read", ref: null }],
    });
    assert.deepEqual(await events(db.appPool, a, "shop"), [
      {
        event_type: "tools.server_registered",
        payload: { adapter: "http_openapi", origin: "https://shop.fake.test" },
      },
    ]);

    let g2: unknown;
    await assert.doesNotReject(async () => {
      g2 = await register(db.appPool, a, {
        id: "notes",
        adapter: "mcp",
        origin: "https://mcp.fake.test",
        surface: null,
      });
    });
    assert.deepEqual(g2, {
      id: "notes",
      adapter: "mcp",
      origin: "https://mcp.fake.test",
      local: false,
      state: "pending",
      registeredBy: "u_alice",
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: null,
      pendingSubmittedBy: null,
      tools: [],
    });
    const notesSurfaces = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM ursitoare.tool_surface WHERE tool_server_id = 'notes'",
      ),
    );
    assert.equal(notesSurfaces.rows[0]?.n, 0);

    let g3: { origin?: unknown; pendingDigest?: unknown } = {};
    await assert.doesNotReject(async () => {
      g3 = await register(db.appPool, a, {
        id: "snips",
        adapter: "code_block",
        origin: "sandbox",
        surface: kitSurface("code"),
      });
    });
    assert.equal(g3.origin, "sandbox");
    assert.equal(g3.pendingDigest, D_CODE);
    assert.deepEqual(await events(db.appPool, a, "snips"), [
      { event_type: "tools.server_registered", payload: { adapter: "code_block", origin: "sandbox" } },
    ]);
  } finally {
    await db.close();
  }
});

test("C-b12d4caf: registerAdapterServerTx refuses each bad input and writes nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const bad = (field: string, reason: string): { code: string; details: unknown } => ({
      code: "TOOLS_INVALID",
      details: { field, reason },
    });
    const rows: [string, Partial<Input>, unknown][] = [
      ["F1 fixture", { adapter: "fixture" as never }, bad("adapter", "bad_value")],
      ["F1 nope", { adapter: "nope" as never }, bad("adapter", "bad_value")],
      [
        "F2 origin",
        { id: "snips", adapter: "code_block", origin: "https://x.fake.test", surface: kitSurface("code") },
        bad("origin", "code_block"),
      ],
      [
        "F2 local",
        { id: "snips", adapter: "code_block", origin: "sandbox", local: true, surface: kitSurface("code") },
        bad("origin", "code_block"),
      ],
      ["F3 http", { surface: null }, bad("surface", "required")],
      [
        "F3 code",
        { id: "snips", adapter: "code_block", origin: "sandbox", surface: null },
        bad("surface", "required"),
      ],
      ["F4", { surface: kitSurface("mcp") }, bad("tools/0/call/kind", "kind_mismatch")],
    ];
    const before = await counts(db.ownerPool, a);
    for (const [label, over, expected] of rows) {
      assert.deepEqual(await attempt(db.appPool, a, over), expected, label);
    }
    assert.deepEqual(await counts(db.ownerPool, a), before);

    await assert.doesNotReject(async () => {
      await register(db.appPool, a, {});
    });
    const afterOne = await counts(db.ownerPool, a);
    assert.equal(afterOne.servers, before.servers + 1);
    assert.deepEqual(await attempt(db.appPool, a, {}), { code: "TOOLS_EXISTS", details: { id: "shop" } });
    assert.deepEqual(await counts(db.ownerPool, a), afterOne);
  } finally {
    await db.close();
  }
});
