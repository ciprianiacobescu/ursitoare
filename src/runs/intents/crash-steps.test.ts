import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type pg from "pg";

import { createPool } from "../../../src/db/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { withDedicatedCluster } from "../../../test/support/crash/cluster.ts";
import { countEffects } from "../../../test/support/crash/effects.ts";
import {
  faultMarkerDir,
  spawnEngine,
  type EngineProcess,
} from "../../../test/support/crash/engine.ts";
import { E2E_TENANT_NAME } from "../../../test/support/e2e-stack/database-part.ts";
import { waitForRun } from "../../../test/support/run-wait.ts";
import { payloadDigest } from "../store/canonical.ts";
import { createRunStore } from "../store/run-store.ts";
import type { PayloadValue } from "../store/types.ts";
import { idemKey } from "./key.ts";

const SCENARIO = join(import.meta.dirname, "../../../test/support/crash/intents-scenario.ts");
const DEADLINE_MS = 20_000;
const POLL_MS = 25;
const END_OUTPUT: PayloadValue = { payment_id: "pay-1" };

interface TenantRow {
  tenant_id: string;
  review_profile: string;
}

interface IntentRow {
  idem_key: string;
  state: string;
  result_ref: string | null;
  mode: string;
  node_id: string;
  tool: string;
}

function delay(ms: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitFor(predicate: () => boolean, message: string): Promise<void> {
  const deadline = Date.now() + DEADLINE_MS;
  while (Date.now() < deadline) {
    if (predicate()) {
      return;
    }
    await delay(POLL_MS);
  }
  assert.equal(predicate(), true, message);
}

function spawnOrFail(opts: Parameters<typeof spawnEngine>[0]): Promise<EngineProcess> {
  return spawnEngine(opts).then(
    (engine) => engine,
    (error: unknown) => assert.fail(`the intent scenario starts: ${String(error)}`),
  );
}

function sha256hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

async function readTenant(ownerPool: pg.Pool): Promise<TenantContext> {
  const { rows } = await ownerPool.query<TenantRow>(
    "SELECT tenant_id, review_profile FROM ursitoare.tenant WHERE name = $1",
    [E2E_TENANT_NAME],
  );
  const row = rows[0];
  assert.ok(row !== undefined, "the cluster seeds the default tenant");
  return {
    tenantId: row.tenant_id,
    reviewProfile: row.review_profile as TenantContext["reviewProfile"],
  };
}

async function readIntent(
  ownerPool: pg.Pool,
  tenant: TenantContext,
  key: string,
): Promise<IntentRow | undefined> {
  return withTenantTx(ownerPool, tenant, async (tx) => {
    const { rows } = await tx.query<IntentRow>(
      `SELECT idem_key, state, result_ref, mode, node_id, tool
         FROM ursitoare.effect_intent
        WHERE tenant_id = $1 AND idem_key = $2`,
      [tenant.tenantId, key],
    );
    return rows[0];
  });
}

test("C-8adccf33: two kills do not repeat the work already done", async () => {
  await withDedicatedCluster(async (cluster) => {
    const ownerPool = createPool(cluster.ownerUrl, { max: 1 });
    const appPool = createPool(cluster.appEndpoint, { max: 2 });
    let proc: EngineProcess | undefined;
    try {
      const tenant = await readTenant(ownerPool);
      const runId = "r_crash_3";
      const key = idemKey(tenant.tenantId, runId, "pay", 0);

      proc = await spawnOrFail({
        cluster,
        scenario: SCENARIO,
        faultPoints: ["after:route", "after:done"],
        args: {
          tenantId: tenant.tenantId,
          reviewProfile: tenant.reviewProfile,
          runId,
          effects: "effects-3.log",
          unsafePay: "false",
        },
      });
      const engine = proc;

      await waitFor(() => engine.deaths === 1, "the after:route child dies exactly once");
      await engine.restart();
      await waitFor(() => engine.deaths === 2, "the after:done child dies exactly once");
      await engine.restart();

      const store = createRunStore(appPool);
      const run = await waitForRun(store, tenant, runId, ["completed", "failed"], 20_000);
      assert.equal(run.state, "completed", `the twice-restarted run completed: ${JSON.stringify(run.error)}`);
      assert.equal(run.outputRef, payloadDigest(END_OUTPUT));

      const counted = countEffects(join(cluster.dataDir, "effects-3.log"));
      assert.deepEqual(counted.byTool["erp.lookup_vendor@1"], {
        calls: 1,
        effects: 1,
        duplicates: 0,
      });
      assert.deepEqual(counted.byTool["erp.create_payment@1"], {
        calls: 1,
        effects: 1,
        duplicates: 0,
      });

      const row = await readIntent(ownerPool, tenant, key);
      assert.ok(row !== undefined, "the intent row exists after the two restarts");
      assert.equal(row.state, "done");

      const markers = readdirSync(faultMarkerDir(cluster.dataDir)).sort();
      assert.deepEqual(
        markers,
        [sha256hex("after:route"), sha256hex("after:done")].sort(),
        "only the two armed fault points left markers",
      );
    } finally {
      if (proc !== undefined) {
        await proc.stop().catch(() => undefined);
      }
      await ownerPool.end().catch(() => undefined);
      await appPool.end().catch(() => undefined);
    }
  });
});
