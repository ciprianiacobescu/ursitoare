import assert from "node:assert/strict";
import { test } from "node:test";

import { fixedClock } from "../core/index.ts";
import { withTenantTx } from "../tenancy/index.ts";
import { withTestDatabase } from "../../test/support/pg.ts";
import { seedTwoTenants } from "../../test/support/tenants.ts";
import { fixtureSurface } from "../../test/support/tool-surface.ts";
import { registerToolServerTx } from "./store.ts";
import type { ToolSurface } from "./types.ts";

const ORIGIN = "https://tools.fake.test";
const ALICE = { kind: "user", id: "u_alice" } as const;
const CLOCK = fixedClock("2026-11-06T10:00:00Z");
const LV = "erp.lookup_vendor@1";
const SURF_ONE: ToolSurface = fixtureSurface([LV], { untrustedResult: { [LV]: false } });

function input(id: string) {
  return { id, adapter: "fixture" as const, origin: ORIGIN, local: false, surface: SURF_ONE };
}

test("registerToolServerTx refused for another tenant writes nothing in the transaction tenant", async () => {
  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    await withTenantTx(db.appPool, a, (tx) =>
      registerToolServerTx(tx, a, input("inside"), ALICE, { clock: CLOCK }),
    );
    await assert.rejects(
      withTenantTx(db.appPool, b, (tx) =>
        registerToolServerTx(tx, a, input("foreign"), ALICE, { clock: CLOCK }),
      ),
      { code: "TOOLS_TENANT_MISMATCH" },
    );

    const inB = await withTenantTx(db.ownerPool, b, (tx) =>
      tx.query<{ tool_server_id: string }>("SELECT tool_server_id FROM ursitoare.tool_server"),
    );
    assert.deepEqual(inB.rows, []);

    const inA = await withTenantTx(db.ownerPool, a, (tx) =>
      tx.query<{ tool_server_id: string }>("SELECT tool_server_id FROM ursitoare.tool_server"),
    );
    assert.deepEqual(
      inA.rows.map((row) => row.tool_server_id),
      ["inside"],
    );
  } finally {
    await db.close();
  }
});
