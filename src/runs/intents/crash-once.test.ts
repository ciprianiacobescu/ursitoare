import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import type pg from "pg";

import { createPool } from "../../../src/db/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { withDedicatedCluster } from "../../../test/support/crash/cluster.ts";
import { countEffects } from "../../../test/support/crash/effects.ts";
import { spawnEngine, type EngineProcess } from "../../../test/support/crash/engine.ts";
import { E2E_TENANT_NAME } from "../../../test/support/e2e-stack/database-part.ts";
import { waitForRun } from "../../../test/support/run-wait.ts";
import { payloadDigest } from "../store/canonical.ts";
import { createRunStore } from "../store/run-store.ts";
import type { PayloadValue } from "../store/types.ts";
import { idemKey } from "./key.ts";

const SCENARIO = join(import.meta.dirname, "../../../test/support/crash/intents-scenario.ts");
const DEADLINE_MS = 20_000;
const POLL_MS = 25;
const PAID: PayloadValue = { payment_id: "pay-1", status: "paid" };
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

interface EffectLine {
  tool: string;
  idemKey: string | null;
  nodeId: string;
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

function logEntries(file: string): EffectLine[] {
  if (!existsSync(file)) {
    return [];
  }
  return readFileSync(file, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as EffectLine);
}

test("C-d6ae84fb: a kill after the call restarts with one payment effect", async () => {
  await withDedicatedCluster(async (cluster) => {
    const ownerPool = createPool(cluster.ownerUrl, { max: 1 });
    const appPool = createPool(cluster.appEndpoint, { max: 2 });
    let proc: EngineProcess | undefined;
    try {
      const tenant = await readTenant(ownerPool);
      const runId = "r_crash_1";
      const key = idemKey(tenant.tenantId, runId, "pay", 0);
      const logFile = join(cluster.dataDir, "effects-1.log");

      proc = await spawnOrFail({
        cluster,
        scenario: SCENARIO,
        faultPoints: ["after:pay"],
        args: {
          tenantId: tenant.tenantId,
          reviewProfile: tenant.reviewProfile,
          runId,
          effects: "effects-1.log",
          unsafePay: "false",
        },
      });
      const engine = proc;

      await waitFor(() => engine.deaths === 1, "the after:pay child dies exactly once");

      assert.deepEqual(
        countEffects(logFile).byTool["erp.create_payment@1"],
        { calls: 1, effects: 1, duplicates: 0 },
        "the tool was called once before the death",
      );
      const atDeath = await readIntent(ownerPool, tenant, key);
      assert.ok(atDeath !== undefined, "the intent row exists at the death");
      assert.equal(atDeath.state, "intent");
      assert.equal(atDeath.node_id, "pay");
      assert.equal(atDeath.tool, "erp.create_payment@1");
      assert.equal(atDeath.mode, "live");

      await engine.restart();
      const store = createRunStore(appPool);
      const run = await waitForRun(store, tenant, runId, ["completed", "failed"], 20_000);
      assert.equal(run.state, "completed", `the restarted run completed: ${JSON.stringify(run.error)}`);
      assert.equal(run.outputRef, payloadDigest(END_OUTPUT));

      const counted = countEffects(logFile);
      assert.deepEqual(counted.byTool["erp.create_payment@1"], {
        calls: 2,
        effects: 1,
        duplicates: 1,
      });
      const lookup = counted.byTool["erp.lookup_vendor@1"];
      assert.ok(lookup !== undefined, "the lookup tool was called");
      assert.equal(lookup.calls, 1, "the read before the payment was not repeated");

      const payLines = logEntries(logFile).filter(
        (entry) => entry.tool === "erp.create_payment@1",
      );
      assert.equal(payLines.length, 2, "both payment lines are in the effect log");
      assert.deepEqual(
        payLines.map((entry) => entry.idemKey),
        [key, key],
        "both payment calls carry the same idempotency key",
      );

      const done = await readIntent(ownerPool, tenant, key);
      assert.ok(done !== undefined, "the intent row survives the restart");
      assert.equal(done.state, "done");
      assert.equal(done.result_ref, payloadDigest(PAID));

      const listed = await store.listSteps(tenant, runId, { limit: 100 });
      assert.deepEqual(
        listed.steps.map((step) => step.nodeId),
        ["lookup", "route", "pay", "done"],
      );
      assert.deepEqual(
        listed.steps.map((step) => step.seq),
        [0, 1, 2, 3],
      );
      assert.deepEqual(
        listed.steps.map((step) => step.state),
        ["completed", "completed", "completed", "completed"],
      );
      const payStep = listed.steps.find((step) => step.nodeId === "pay");
      assert.ok(payStep !== undefined, "the pay step row exists");
      assert.equal(payStep.idemKey, key);
    } finally {
      if (proc !== undefined) {
        await proc.stop().catch(() => undefined);
      }
      await ownerPool.end().catch(() => undefined);
      await appPool.end().catch(() => undefined);
    }
  });
});
