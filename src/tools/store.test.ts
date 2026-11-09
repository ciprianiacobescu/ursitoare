import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import type { TenantContext, TenantPool } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import {
  getToolServer,
  listToolServers,
  registerToolServer,
  registerToolServerTx,
} from "./store.ts";
import type { ToolAdapter, ToolSurface } from "./types.ts";

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const REGISTERED_AT = "2026-11-06T10:00:00.000000Z";
const D_A = "sha256:347725d7d6171586139eba5892b32b2b2ff6b25a556e8cbb2bca57c0624db7d9";
const D_PING = "sha256:aa3089b4ead0b1991651cec106303e025ac4b569a55767655f1c57fd42c02552";

const LV = "erp.lookup_vendor@1";
const CP = "erp.create_payment@1";
const SURF_A: ToolSurface = fixtureSurface([LV, CP], { untrustedResult: { [LV]: false, [CP]: false } });
const SURF_ONE: ToolSurface = fixtureSurface([LV], { untrustedResult: { [LV]: false } });
const SURF_PING: ToolSurface = {
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

interface Input {
  id: string;
  adapter: ToolAdapter;
  origin: string;
  local: boolean;
  surface: ToolSurface;
}

function input(over: Partial<Input> = {}): Input {
  return { id: "acme", adapter: "fixture", origin: ORIGIN, local: false, surface: SURF_A, ...over };
}

function withTool(patch: Record<string, unknown>): ToolSurface {
  const t = SURF_ONE.tools[0];
  assert.ok(t);
  return { tools: [{ ...t, ...patch }] } as unknown as ToolSurface;
}

async function attempt(
  pool: TenantPool,
  ctx: TenantContext,
  over: Partial<Input>,
): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await registerToolServer(pool, ctx, input(over), ALICE, { clock: CLOCK });
  } catch (error) {
    const e = error as { code?: unknown; details?: unknown };
    return { code: e.code, details: e.details };
  }
  return {};
}

test("C-d0c13cf0: registerToolServer stores a pending server with its first surface", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const record = await registerToolServer(db.appPool, a, input(), ALICE, { clock: CLOCK });
    assert.deepEqual(record, {
      id: "acme",
      adapter: "fixture",
      origin: ORIGIN,
      local: false,
      state: "pending",
      registeredBy: "u_alice",
      registeredAt: REGISTERED_AT,
      approvedDigest: null,
      pendingDigest: D_A,
      pendingSubmittedBy: "u_alice",
      tools: [
        { name: "lookup_vendor", effect: "read", ref: null },
        { name: "create_payment", effect: "pay", ref: null },
      ],
    });

    assert.deepEqual(await attempt(db.appPool, a, {}), { code: "TOOLS_EXISTS", details: { id: "acme" } });

    const beta = await registerToolServer(
      db.appPool,
      a,
      input({ id: "beta", origin: "HTTPS://Tools.Fake.Test:443", surface: SURF_ONE }),
      ALICE,
      { clock: CLOCK },
    );
    assert.equal(beta.origin, ORIGIN);
    const loc = await registerToolServer(
      db.appPool,
      a,
      input({ id: "loc", origin: "http://10.1.2.3:8080", local: true, surface: SURF_PING }),
      ALICE,
      { clock: CLOCK },
    );
    assert.equal(loc.pendingDigest, D_PING);
    assert.deepEqual(loc.tools, [{ name: "ping", effect: "read", ref: null }]);

    assert.deepEqual(await getToolServer(db.appPool, a, "acme"), record);
    assert.equal(await getToolServer(db.appPool, a, "nope"), null);
    assert.equal(await getToolServer(db.appPool, b, "acme"), null);
    const listed = await listToolServers(db.appPool, a, { limit: 10, after: null });
    assert.deepEqual(
      listed.map((s) => s.id),
      ["acme", "beta", "loc"],
    );
    const paged = await listToolServers(db.appPool, a, { limit: 1, after: "acme" });
    assert.deepEqual(
      paged.map((s) => s.id),
      ["beta"],
    );
    assert.deepEqual(await listToolServers(db.appPool, b, { limit: 10, after: null }), []);

    const stored = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ origin: string }>(
        "SELECT origin FROM ursitoare.tool_server WHERE tool_server_id = 'beta'",
      ),
    );
    assert.equal(stored.rows[0]?.origin, ORIGIN);
    const servers = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tool_server"),
    );
    const surfaces = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tool_surface"),
    );
    const events = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ n: number }>(
        "SELECT count(*)::int AS n FROM ursitoare.audit_event WHERE event_type = 'tools.server_registered'",
      ),
    );
    assert.equal(servers.rows[0]?.n, 3);
    assert.equal(surfaces.rows[0]?.n, 3);
    assert.equal(events.rows[0]?.n, 3);
  } finally {
    await db.close();
  }
});

test("C-d0c13cf0: registerToolServer refuses invalid inputs and surfaces with their field and reason", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const invalid = (field: string, reason: string): { code: string; details: unknown } => ({
      code: "TOOLS_INVALID",
      details: { field, reason },
    });
    const inputs: [Partial<Input>, unknown][] = [
      [{ id: "Acme" }, invalid("id", "bad_value")],
      [{ adapter: "bogus" as ToolAdapter }, invalid("adapter", "bad_value")],
      [
        { adapter: "mcp" },
        { code: "TOOLS_REFUSED", details: { reason: "adapter_unavailable" } },
      ],
      [{ origin: "https://10.1.2.3" }, invalid("origin", "private")],
      [{ origin: "https://u:p@tools.fake.test" }, invalid("origin", "credentials")],
      [{ surface: { tools: [] } }, invalid("tools", "size")],
      [{ surface: { tools: 1 } as unknown as ToolSurface }, invalid("tools", "not_array")],
      [{ surface: withTool({ name: "Bad" }) }, invalid("tools/0/name", "bad_value")],
      [
        { surface: { tools: [...withTool({}).tools, ...withTool({}).tools] } },
        invalid("tools/1/name", "duplicate"),
      ],
      [{ surface: withTool({ bogus: 1 }) }, invalid("tools/0", "unknown_property")],
      [
        { surface: withTool({ http: { method: "TRACE", path: "/x" } }) },
        invalid("tools/0/http/method", "bad_value"),
      ],
      [
        { surface: withTool({ http: { method: "GET", path: "/x" } }) },
        invalid("tools/0/http/method", "method_without_body"),
      ],
      [
        { surface: withTool({ untrusted_fields: ["zzz"] }) },
        invalid("tools/0/untrusted_fields", "unknown_field"),
      ],
      [{ surface: withTool({ output: { type: "bogus" } }) }, invalid("tools/0/output", "schema_invalid")],
      [
        { surface: { ...withTool({}), meta: 1 } as unknown as ToolSurface },
        invalid("surface", "unknown_property"),
      ],
      [
        { surface: withTool({ http: { method: "POST", path: "/x", headers: {} } }) },
        invalid("tools/0/http", "unknown_property"),
      ],
      [
        { surface: withTool({ http: { method: "GET", path: "/x" }, input: undefined }) },
        invalid("tools/0/input", "not_object"),
      ],
      [{ surface: [] as unknown as ToolSurface }, invalid("tools", "not_object")],
      ...["/a#x", "/a\\b", "/a/../b", "/a/%2E%2e/b"].map(
        (path): [Partial<Input>, unknown] => [
          { surface: withTool({ http: { method: "POST", path } }) },
          invalid("tools/0/http/path", "bad_value"),
        ],
      ),
    ];
    for (const [over, expected] of inputs) {
      assert.deepEqual(await attempt(db.appPool, a, over), expected);
    }
    const servers = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ n: number }>("SELECT count(*)::int AS n FROM ursitoare.tool_server"),
    );
    assert.equal(servers.rows[0]?.n, 0);
    // a valid registration still succeeds, so the refusals above are not a blanket failure
    const ok = await registerToolServer(db.appPool, a, input({ surface: SURF_ONE }), ALICE, {
      clock: CLOCK,
    });
    assert.equal(ok.state, "pending");
  } finally {
    await db.close();
  }
});

test("C-d0c13cf0: registerToolServerTx refuses a transaction of another tenant and writes nothing", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const registered = await withTenantTx(db.appPool, a, (tx) =>
      registerToolServerTx(tx, a, input({ id: "inside" }), ALICE, { clock: CLOCK }),
    );
    assert.equal(registered.id, "inside");
    let caught: { code?: unknown } = {};
    try {
      await withTenantTx(db.appPool, b, (tx) =>
        registerToolServerTx(tx, a, input({ id: "foreign" }), ALICE, { clock: CLOCK }),
      );
    } catch (error) {
      caught = error as { code?: unknown };
    }
    assert.equal(caught.code, "TOOLS_TENANT_MISMATCH");
    const rows = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ tool_server_id: string }>("SELECT tool_server_id FROM ursitoare.tool_server"),
    );
    assert.deepEqual(
      rows.rows.map((r) => r.tool_server_id),
      ["inside"],
    );
  } finally {
    await db.close();
  }
});
