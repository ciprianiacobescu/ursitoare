import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryResultRow } from "pg";

import { TenancyError, hashRouteKey, resolveTenantBy } from "./index.ts";
import { MINTKEY_SINK_ROUTE_KINDS, bindSinkTokens } from "./sink-binding.ts";
import { withTestDatabase, type TestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";

interface RouteRow extends QueryResultRow {
  kind: string;
  key_hash: Buffer;
  tenant_id: string;
}

const BROKER_KIND = "mintkey_sink_broker";
const PROXY_KIND = "mintkey_sink_proxy";

function isTenancyError(code: string): (error: unknown) => boolean {
  return (error: unknown) => {
    assert.ok(error instanceof TenancyError, "the error is a TenancyError");
    assert.equal(error.code as string, code);
    return true;
  };
}

async function sinkRoutes(db: TestDatabase): Promise<RouteRow[]> {
  const { rows } = await db.ownerPool.query<RouteRow>(
    "SELECT kind, key_hash, tenant_id FROM ursitoare.tenant_route WHERE kind LIKE 'mintkey_sink_%' ORDER BY kind, tenant_id",
  );
  return rows;
}

test("C-238cef58 bindSinkTokens two hash-only routes", async () => {
  const db = await withTestDatabase();
  try {
    await assert.doesNotReject(async () => {
      const { a, b } = await seedTwoTenants(db);

      assert.equal(Object.isFrozen(MINTKEY_SINK_ROUTE_KINDS), true);
      assert.deepEqual({ ...MINTKEY_SINK_ROUTE_KINDS }, { broker: BROKER_KIND, proxy: PROXY_KIND });

      const first = await bindSinkTokens(db.ownerPool, a, {
        broker: "tok-broker-A1",
        proxy: "tok-proxy-A1",
      });
      assert.deepEqual(first, { broker: "created", proxy: "created" });
      const again = await bindSinkTokens(db.ownerPool, a, {
        broker: "tok-broker-A1",
        proxy: "tok-proxy-A1",
      });
      assert.deepEqual(again, { broker: "exists", proxy: "exists" });
      const third = await bindSinkTokens(db.ownerPool, a, {
        broker: "tok-broker-A1",
        proxy: "tok-proxy-A2",
      });
      assert.deepEqual(third, { broker: "exists", proxy: "created" });

      await assert.rejects(
        bindSinkTokens(db.ownerPool, b, { broker: "same", proxy: "same" }),
        isTenancyError("TENANT_INVALID"),
      );
      assert.equal((await sinkRoutes(db)).length, 3);

      await assert.rejects(
        bindSinkTokens(db.ownerPool, b, { broker: "tok-broker-B1", proxy: "tok-proxy-A1" }),
        (error: unknown) => {
          assert.ok(error instanceof TenancyError);
          assert.equal(error.code as string, "TENANT_ROUTE_CONFLICT");
          assert.equal(error.message, "route is already registered");
          assert.ok(!JSON.stringify(error.details ?? {}).includes("tok-"));
          assert.ok(!error.message.includes("tok-"));
          return true;
        },
      );
      assert.equal(await resolveTenantBy(db.appPool, BROKER_KIND, "tok-broker-B1"), null);

      await assert.rejects(
        bindSinkTokens(
          db.ownerPool,
          { tenantId: "ghost", reviewProfile: "solo" },
          { broker: "g1", proxy: "g2" },
        ),
        isTenancyError("TENANT_UNKNOWN"),
      );
      await assert.rejects(
        bindSinkTokens(db.ownerPool, a, { broker: "", proxy: "p" }),
        isTenancyError("TENANT_INVALID"),
      );

      assert.equal(
        (await resolveTenantBy(db.appPool, BROKER_KIND, "tok-broker-A1"))?.tenantId,
        "tenant_a",
      );
      assert.equal(
        (await resolveTenantBy(db.appPool, PROXY_KIND, "tok-proxy-A1"))?.tenantId,
        "tenant_a",
      );
      assert.equal(await resolveTenantBy(db.appPool, PROXY_KIND, "tok-broker-A1"), null);

      const rows = await sinkRoutes(db);
      assert.equal(rows.length, 3);
      assert.ok(rows.every((row) => row.tenant_id === "tenant_a"));
      assert.equal(rows.filter((row) => row.kind === BROKER_KIND).length, 1);
      assert.equal(rows.filter((row) => row.kind === PROXY_KIND).length, 2);
      const hashes = rows.map((row) => row.key_hash.toString("hex")).sort();
      const expected = ["tok-broker-A1", "tok-proxy-A1", "tok-proxy-A2"]
        .map((token) => hashRouteKey(token).toString("hex"))
        .sort();
      assert.deepEqual(hashes, expected);
      const asText = await db.ownerPool.query<{ n: string }>(
        "SELECT count(*)::text AS n FROM ursitoare.tenant_route r WHERE r::text LIKE '%tok-%'",
      );
      assert.equal(asText.rows[0]?.n, "0");
    });
  } finally {
    await db.close();
  }
});
