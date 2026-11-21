import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { kitSurface } from "../../test/support/adapter-kit.ts";
import { registerAdapterServerTx, submitAdapterSurfaceTx } from "./adapter-store.ts";
import { approveSurface, registerToolServer, submitSurface } from "./store.ts";
import { surfaceDigest } from "./surface.ts";
import type { ToolSurface } from "./types.ts";

const ALICE = { kind: "user", id: "u_alice" } as const;
const DAVE = { kind: "user", id: "u_dave" } as const;
const CAROL = { userId: "u_carol", kind: "user" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const D_HTTP = "sha256:0a3a2a70a4d1058c9bc26e72c4cd9452402d52c008a0a0fefe393fe698b45b2a";
const D_MCP = "sha256:7e461eb01a248c26d9d458a27e4018dc579071f5f9c70c3e4401b2b4e021e526";

function submit(pool: TenantPool, ctx: TenantContext, id: string, surface: ToolSurface) {
  return withTenantTx(pool, ctx, (tx) => submitAdapterSurfaceTx(tx, ctx, id, surface, DAVE, { clock: CLOCK }));
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

async function counts(pool: TenantPool, ctx: TenantContext): Promise<{ surfaces: number; events: number }> {
  return withTenantTx(pool, ctx, async (tx) => {
    const n = async (table: string): Promise<number> => {
      const r = await tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
      return r.rows[0]?.n ?? -1;
    };
    return { surfaces: await n("tool_surface"), events: await n("audit_event") };
  });
}

async function submitted(pool: TenantPool, ctx: TenantContext, id: string): Promise<unknown[]> {
  const r = await withTenantTx(pool, ctx, (tx) =>
    tx.query<{ payload: unknown }>(
      `SELECT payload FROM ursitoare.audit_event
        WHERE event_type = 'tools.surface_submitted' AND target->>'id' = $1`,
      [id],
    ),
  );
  return r.rows.map((row) => row.payload);
}

test("C-900c62ad: an adapter surface follows the submit rules and the newest wins a tie", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: a.tenantId, reviewProfile: "team" };
    const dB = surfaceDigest(kitSurface("http", "b"));
    const dC = surfaceDigest(kitSurface("http", "c"));
    assert.equal(surfaceDigest(kitSurface("http")), D_HTTP);
    assert.ok(D_HTTP < dB, "D_HTTP sorts below D_HTTP_B");

    await withTenantTx(db.appPool, team, (tx) =>
      registerAdapterServerTx(
        tx,
        team,
        {
          id: "shop",
          adapter: "http_openapi",
          origin: "https://shop.fake.test",
          local: false,
          surface: kitSurface("http", "b"),
        },
        ALICE,
        { clock: CLOCK },
      ),
    );
    await withTenantTx(db.appPool, team, (tx) =>
      registerAdapterServerTx(
        tx,
        team,
        { id: "notes", adapter: "mcp", origin: "https://mcp.fake.test", local: false, surface: null },
        ALICE,
        { clock: CLOCK },
      ),
    );

    let h1: Awaited<ReturnType<typeof submit>> | undefined;
    await assert.doesNotReject(async () => {
      h1 = await submit(db.appPool, team, "shop", kitSurface("http"));
    });
    assert.equal(h1?.state, "pending");
    assert.equal(h1?.pendingDigest, D_HTTP);
    assert.equal(h1?.pendingSubmittedBy, "u_dave");
    const approved = await approveSurface(
      db.appPool,
      team,
      "shop",
      { digest: D_HTTP, selfApproval: false },
      CAROL,
      { clock: CLOCK },
    );
    assert.equal(approved.server.approvedDigest, D_HTTP);
    assert.equal(approved.server.pendingDigest, null);
    assert.deepEqual(approved.server.tools, [{ name: "find_vendor", effect: "read", ref: "shop.find_vendor@1" }]);

    // H2: the approved digest again changes nothing; a stored one is refused
    const before = await counts(db.ownerPool, team);
    let h2: unknown;
    await assert.doesNotReject(async () => {
      h2 = await submit(db.appPool, team, "shop", kitSurface("http"));
    });
    assert.deepEqual(h2, approved.server);
    assert.deepEqual(await counts(db.ownerPool, team), before);
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "shop", kitSurface("http", "b"))), {
      code: "TOOLS_REFUSED",
      details: { reason: "surface_known" },
    });
    assert.deepEqual(await counts(db.ownerPool, team), before);

    // H3: a new digest drifts the approved server
    let h3: Awaited<ReturnType<typeof submit>> | undefined;
    await assert.doesNotReject(async () => {
      h3 = await submit(db.appPool, team, "shop", kitSurface("http", "c"));
    });
    assert.equal(h3?.state, "drifted");
    assert.equal(h3?.approvedDigest, D_HTTP);
    assert.equal(h3?.pendingDigest, dC);
    assert.ok((await submitted(db.appPool, team, "shop")).some((p) => JSON.stringify(p) === JSON.stringify({ digest: dC, drift: true })));

    // H4: the first surface of a surfaceless mcp server
    let h4: Awaited<ReturnType<typeof submit>> | undefined;
    await assert.doesNotReject(async () => {
      h4 = await submit(db.appPool, team, "notes", kitSurface("mcp"));
    });
    assert.equal(h4?.state, "pending");
    assert.equal(h4?.pendingDigest, D_MCP);
    assert.deepEqual(await submitted(db.appPool, team, "notes"), [{ digest: D_MCP, drift: false }]);
    const afterH4 = await counts(db.ownerPool, team);
    let again: unknown;
    await assert.doesNotReject(async () => {
      again = await submit(db.appPool, team, "notes", kitSurface("mcp"));
    });
    assert.deepEqual(again, h4);
    assert.deepEqual(await counts(db.ownerPool, team), afterH4);
  } finally {
    await db.close();
  }
});

test("C-39c2ae60: the two submit paths refuse the other kind of server and write nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const team: TenantContext = { tenantId: a.tenantId, reviewProfile: "team" };
    const fix = fixtureSurface(["erp.lookup_vendor@1"]);
    await registerToolServer(
      db.appPool,
      team,
      { id: "acme", adapter: "fixture", origin: "https://tools.fake.test", local: false, surface: fix },
      ALICE,
      { clock: CLOCK },
    );
    await withTenantTx(db.appPool, team, (tx) =>
      registerAdapterServerTx(
        tx,
        team,
        {
          id: "shop",
          adapter: "http_openapi",
          origin: "https://shop.fake.test",
          local: false,
          surface: kitSurface("http", "b"),
        },
        ALICE,
        { clock: CLOCK },
      ),
    );
    const before = await counts(db.ownerPool, team);

    // H5
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "ghost", kitSurface("http"))), {
      code: "TOOLS_NOT_FOUND",
      details: { id: "ghost" },
    });
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "acme", kitSurface("http"))), {
      code: "TOOLS_REFUSED",
      details: { reason: "adapter_mismatch" },
    });
    assert.deepEqual(await attempt(() => submit(db.appPool, team, "shop", kitSurface("mcp"))), {
      code: "TOOLS_INVALID",
      details: { field: "tools/0/call/kind", reason: "kind_mismatch" },
    });

    // H6
    assert.deepEqual(await attempt(() => submitSurface(db.appPool, team, "shop", fix, DAVE, { clock: CLOCK })), {
      code: "TOOLS_REFUSED",
      details: { reason: "adapter_mismatch" },
    });
    assert.deepEqual(
      await attempt(() => submitSurface(db.appPool, team, "shop", kitSurface("http"), DAVE, { clock: CLOCK })),
      { code: "TOOLS_INVALID", details: { field: "tools/0", reason: "unknown_property" } },
    );
    assert.deepEqual(await counts(db.ownerPool, team), before);
  } finally {
    await db.close();
  }
});
