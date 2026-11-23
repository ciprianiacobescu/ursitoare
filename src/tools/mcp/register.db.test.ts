import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../../core/index.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import type pg from "pg";
import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { checkTenancyCatalog } from "../../tenancy/index.ts";
import { ROLE_APP } from "../../db/index.ts";
import { registerMcpServerTx, mcpEndpointOf } from "./register.ts";

const ALICE = { kind: "user", id: "u_alice" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const ORIGIN = "https://mcp.fake.test";

async function seedToolServer(
  pool: pg.Pool,
  tenantId: string,
  serverId: string,
): Promise<void> {
  await withTenantTx(pool, { tenantId, reviewProfile: "solo" }, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.tool_server
         (tenant_id, tool_server_id, adapter, origin, local, state, approved_digest,
          registered_by, registered_at)
       VALUES ($1, $2, 'mcp', $3, false, 'pending', NULL, $4, $5::timestamptz)`,
      [tenantId, serverId, ORIGIN, "u_alice", "2026-11-06T10:00:00Z"],
    );
  });
}

async function insertEndpoint(
  pool: pg.Pool,
  ctx: TenantContext,
  serverId: string,
  endpoint: string,
): Promise<void> {
  await withTenantTx(pool, ctx, async (tx) => {
    await tx.query(
      `INSERT INTO ursitoare.mcp_server
         (tenant_id, tool_server_id, endpoint, registered_at)
       VALUES ($1, $2, $3, $4::timestamptz)`,
      [ctx.tenantId, serverId, endpoint, "2026-11-06T10:00:00Z"],
    );
  });
}

async function attempt<T>(run: () => Promise<T>): Promise<{ code?: unknown; details?: unknown }> {
  try {
    await run();
  } catch (error) {
    const e = error as { code?: unknown; details?: unknown };
    return { code: e.code, details: e.details };
  }
  return {};
}

async function countRows(pool: pg.Pool, ctx: TenantContext, table: string): Promise<number> {
  const r = await withTenantTx(pool, ctx, async (tx) => {
    return tx.query<{ n: number }>(`SELECT count(*)::int AS n FROM ursitoare.${table}`);
  });
  return r.rows[0]?.n ?? -1;
}

test("C-900c01f8: migration 0540 stores mcp_server per tenant and applies the endpoint check, rows G1 to G4", async () => {
  const db = await withTestDatabase();
  try {
    const ledger = await db.ownerPool.query<{ version: number; name: string }>(
      "SELECT version, name FROM ursitoare.schema_migration WHERE version = 540",
    );
    const entry = ledger.rows[0];
    assert.ok(entry !== undefined, "the ledger holds version 540");
    assert.equal(entry.version, 540);
    assert.equal(entry.name, "mcp_servers");

    const table = await db.ownerPool.query<{ found: string | null }>(
      "SELECT to_regclass('ursitoare.mcp_server')::text AS found",
    );
    assert.ok(table.rows[0]?.found, "ursitoare.mcp_server exists");

    const violations = await checkTenancyCatalog(db.ownerPool);
    assert.deepEqual(violations, []);

    const privileges = await db.ownerPool.query<{
      select: boolean;
      insert: boolean;
      update: boolean;
      delete: boolean;
    }>(
      `SELECT has_table_privilege($1, 'ursitoare.mcp_server', 'SELECT') AS select,
              has_table_privilege($1, 'ursitoare.mcp_server', 'INSERT') AS insert,
              has_table_privilege($1, 'ursitoare.mcp_server', 'UPDATE') AS update,
              has_table_privilege($1, 'ursitoare.mcp_server', 'DELETE') AS "delete"`,
      [ROLE_APP],
    );
    assert.equal(privileges.rows[0]?.select, true);
    assert.equal(privileges.rows[0]?.insert, true);
    assert.equal(privileges.rows[0]?.update, false);
    assert.equal(privileges.rows[0]?.delete, false);

    const { a, b } = await seedTwoTenants(db);

    await seedToolServer(db.ownerPool, a.tenantId, "srv_a");
    await seedToolServer(db.ownerPool, b.tenantId, "srv_b");

    const good: string[] = [
      "/",
      "/mcp",
      "/a/b%20c",
      "/" + "x".repeat(1023),
      "/a\\b",
      "/~",
      "/!",
    ];
    for (let i = 0; i < good.length; i += 1) {
      const endpoint = good[i] as string;
      await seedToolServer(db.ownerPool, a.tenantId, `srv_good_${i}`);
      await assert.doesNotReject(async () => {
        await insertEndpoint(db.appPool, a, `srv_good_${i}`, endpoint);
      }, endpoint);
    }

    const bad: string[] = [
      "/" + "x".repeat(1024),
      "mcp",
      "",
      "/a b",
      "/a?b",
      "/a#b",
      "/a\n",
      "/é",
      "/a\u007f",
      "/ ",
      "/a\t",
    ];
    for (const endpoint of bad) {
      await seedToolServer(db.ownerPool, a.tenantId, "srv_bad_check");
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          "DELETE FROM ursitoare.mcp_server WHERE tenant_id = $1 AND tool_server_id = $2",
          [a.tenantId, "srv_bad_check"],
        );
      });
      const result = await attempt(async () => {
        await insertEndpoint(db.appPool, a, "srv_bad_check", endpoint);
      });
      assert.equal(result.code, "23514", endpoint);
      await withTenantTx(db.ownerPool, a, async (tx) => {
        await tx.query(
          "DELETE FROM ursitoare.mcp_server WHERE tenant_id = $1 AND tool_server_id = $2",
          [a.tenantId, "srv_bad_check"],
        );
        await tx.query(
          "DELETE FROM ursitoare.tool_server WHERE tenant_id = $1 AND tool_server_id = $2",
          [a.tenantId, "srv_bad_check"],
        );
      });
    }

    // G3: a second row for the same server, an unknown server, and a cross-tenant row.
    await insertEndpoint(db.appPool, a, "srv_a", "/");
    const second = await attempt(async () => {
      await insertEndpoint(db.appPool, a, "srv_a", "/mcp");
    });
    assert.equal(second.code, "23505");

    const unknown = await attempt(async () => {
      await insertEndpoint(db.appPool, a, "srv_none", "/");
    });
    assert.equal(unknown.code, "23503");

    const cross = await attempt(async () => {
      await withTenantTx(db.appPool, a, async (tx) => {
        await tx.query(
          `INSERT INTO ursitoare.mcp_server
             (tenant_id, tool_server_id, endpoint, registered_at)
           VALUES ($1, $2, $3, $4::timestamptz)`,
          [b.tenantId, "srv_b", "/", "2026-11-06T10:00:00Z"],
        );
      });
    });
    assert.equal(cross.code, "42501");

    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) =>
        tx.query("UPDATE ursitoare.mcp_server SET endpoint = '/x' WHERE tenant_id = $1", [a.tenantId]),
      ),
      { code: "42501" },
    );
    await assert.rejects(
      withTenantTx(db.appPool, a, (tx) => tx.query("DELETE FROM ursitoare.mcp_server")),
      { code: "42501" },
    );

    // G4: tenant isolation.
    await insertEndpoint(db.appPool, b, "srv_b", "/mcp");
    const aRows = await withTenantTx(db.appPool, a, (tx) =>
      tx.query<{ endpoint: string }>("SELECT endpoint FROM ursitoare.mcp_server ORDER BY endpoint"),
    );
    const bRows = await withTenantTx(db.appPool, b, (tx) =>
      tx.query<{ endpoint: string }>("SELECT endpoint FROM ursitoare.mcp_server ORDER BY endpoint"),
    );
    assert.deepEqual(
      aRows.rows.map((row) => row.endpoint).sort(),
      ["/", ...good].sort(),
    );
    assert.deepEqual(
      bRows.rows.map((row) => row.endpoint),
      ["/mcp"],
    );
  } finally {
    await db.close();
  }
});

test("C-900c01f8: registerMcpServerTx turns a URL into an origin and endpoint, rows U1 to U14", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);

    const cases: Array<{
      url: string;
      local: boolean;
      origin: string;
      endpoint: string;
    }> = [
      { url: "https://mcp.fake.test", local: false, origin: ORIGIN, endpoint: "/" },
      { url: "https://mcp.fake.test/mcp", local: false, origin: ORIGIN, endpoint: "/mcp" },
      { url: "https://mcp.fake.test:8443/api/mcp/v1", local: false, origin: "https://mcp.fake.test:8443", endpoint: "/api/mcp/v1" },
      { url: "https://MCP.Fake.Test/A%20B", local: false, origin: "https://mcp.fake.test", endpoint: "/A%20B" },
      { url: "http://10.0.0.5:8080/mcp", local: true, origin: "http://10.0.0.5:8080", endpoint: "/mcp" },
    ];

    for (let ci = 0; ci < cases.length; ci += 1) {
      const item = cases[ci] as (typeof cases)[number];
      const id = `docs_${ci}_${item.endpoint.replace(/[^a-z0-9]/g, "_") || "root"}`.toLowerCase().slice(0, 32);
      let result: { server: { origin: string; state: string; pendingDigest: string | null }; endpoint: string } | undefined;
      await assert.doesNotReject(async () => {
        result = await registerMcpServerTx(db.appPool, a, { id, url: item.url, local: item.local }, ALICE, { clock: CLOCK });
      }, item.url);
      assert.equal(result?.server.origin, item.origin, item.url);
      assert.equal(result?.endpoint, item.endpoint, item.url);
      assert.equal(result?.server.state, "pending");
      assert.equal(result?.server.pendingDigest, null);
    }

    const refusals: Array<{ url: string; local: boolean; reason: string }> = [
      { url: "http://10.0.0.5:8080/mcp", local: false, reason: "scheme" },
      { url: "https://mcp.fake.test/mcp?x=1", local: false, reason: "query" },
      { url: "https://mcp.fake.test/mcp?", local: false, reason: "query" },
      { url: "https://mcp.fake.test/mcp#f", local: false, reason: "path" },
      { url: "https://u:p@mcp.fake.test/mcp", local: false, reason: "credentials" },
      { url: "ftp://mcp.fake.test/mcp", local: false, reason: "scheme" },
      { url: "not a url", local: false, reason: "not_url" },
      { url: "https://127.0.0.1/mcp", local: false, reason: "loopback" },
      { url: "https://[::1]/mcp", local: false, reason: "loopback" },
    ];
    for (const item of refusals) {
      const before = await countRows(db.appPool, a, "mcp_server");
      const result = await attempt(async () => {
        await registerMcpServerTx(db.appPool, a, { id: "refused", url: item.url, local: item.local }, ALICE, { clock: CLOCK });
      });
      assert.deepEqual(result, { code: "TOOLS_INVALID", details: { field: "url", reason: item.reason } }, item.url);
      assert.equal(await countRows(db.appPool, a, "mcp_server"), before, item.url);
    }

    const longOk = "/" + "x".repeat(1023);
    const longBad = "/" + "x".repeat(1024);
    let longResult: { endpoint: string } | undefined;
    await assert.doesNotReject(async () => {
      longResult = await registerMcpServerTx(db.appPool, a, { id: "long_ok", url: `https://mcp.fake.test${longOk}`, local: false }, ALICE, { clock: CLOCK });
    });
    assert.equal(longResult?.endpoint, longOk);

    const longRefusal = await attempt(async () => {
      await registerMcpServerTx(db.appPool, a, { id: "long_bad", url: `https://mcp.fake.test${longBad}`, local: false }, ALICE, { clock: CLOCK });
    });
    assert.deepEqual(longRefusal, { code: "TOOLS_INVALID", details: { field: "url", reason: "path" } });

    const portResult = await registerMcpServerTx(db.appPool, a, { id: "port443", url: "https://mcp.fake.test:443/mcp", local: false }, ALICE, { clock: CLOCK });
    assert.equal(portResult.server.origin, ORIGIN);
    assert.equal(portResult.endpoint, "/mcp");

    // A taken id is TOOLS_EXISTS and leaves one mcp_server row.
    const takenBefore = await countRows(db.appPool, a, "mcp_server");
    await registerMcpServerTx(db.appPool, a, { id: "docs_root", url: ORIGIN, local: false }, ALICE, { clock: CLOCK }).catch(() => undefined);
    const takenAgain = await attempt(async () => {
      await registerMcpServerTx(db.appPool, a, { id: "docs_root", url: ORIGIN, local: false }, ALICE, { clock: CLOCK });
    });
    assert.equal(takenAgain.code, "TOOLS_EXISTS");
    assert.equal(await countRows(db.appPool, a, "mcp_server"), takenBefore + 1);

    // Tenant B cannot see A's endpoint.
    const endpoint = await withTenantTx(db.appPool, b, (tx) => mcpEndpointOf(tx, b, "docs_root"));
    assert.equal(endpoint, null);
  } finally {
    await db.close();
  }
});

test("C-900c01f8: mcpEndpointOf returns the stored endpoint", async () => {
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    let registered: { endpoint: string } | undefined;
    await assert.doesNotReject(async () => {
      registered = await registerMcpServerTx(db.appPool, a, { id: "docs", url: "https://mcp.fake.test/mcp", local: false }, ALICE, { clock: CLOCK });
    });
    const found = await withTenantTx(db.appPool, a, (tx) => mcpEndpointOf(tx, a, "docs"));
    assert.equal(found, registered?.endpoint);
    const missing = await withTenantTx(db.appPool, a, (tx) => mcpEndpointOf(tx, a, "nope"));
    assert.equal(missing, null);
  } finally {
    await db.close();
  }
});
