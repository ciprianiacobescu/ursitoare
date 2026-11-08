import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";

import type pg from "pg";

import { createPool } from "../../../src/db/index.ts";
import { payloadDigest } from "../../../src/runs/index.ts";
import type { StepHookEntry } from "../../../src/runs/index.ts";
import { createRunStore } from "../../../src/runs/index.ts";
import { idemKey } from "../../../src/runs/intents/key.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { startCrashCluster } from "../../../test/support/crash/cluster.ts";
import { countEffects } from "../../../test/support/crash/effects.ts";
import { spawnEngine, type EngineProcess } from "../../../test/support/crash/engine.ts";
import { start as hooksScenarioStart } from "../../../test/support/crash/hooks-scenario.ts";
import { E2E_TENANT_NAME } from "../../../test/support/e2e-stack/database-part.ts";
import { discoverParts } from "../../../test/support/e2e-stack/discover.ts";
import { waitForRun } from "../../../test/support/run-wait.ts";

assert.equal(typeof startCrashCluster, "function");
assert.equal(typeof spawnEngine, "function");
assert.equal(typeof hooksScenarioStart, "function");
assert.equal(typeof countEffects, "function");

const SCENARIO = join(import.meta.dirname, "../../../test/support/crash/hooks-scenario.ts");
const DEADLINE_MS = 20_000;
const POLL_MS = 25;

const ONION_LABELS: readonly string[] = [
  "pre:rule.rule_a",
  "pre:rule.rule_b",
  "pre:pay_pre_note",
  "post:pay_post_note",
  "post:rule.rule_b",
  "post:rule.rule_a",
];

function codeEntry(label: string): StepHookEntry {
  return {
    label,
    kind: "code",
    fused: true,
    attempt: 1,
    state: "completed",
    action: "continue",
    mutated: null,
    to: null,
    error: null,
    tool: null,
    idemKey: null,
  };
}

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
    (error: unknown) => assert.fail(`the hooks scenario starts: ${String(error)}`),
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

const started = await startCrashCluster(await discoverParts());

after(async () => {
  await started.close();
});

test("C-765cb9f0 a kill at the payment of a hooked node leaves one effect per key", async () => {
  const cluster = started.cluster;
  const ownerPool = createPool(cluster.ownerUrl, { max: 1 });
  const appPool = createPool(cluster.appEndpoint, { max: 2 });
  let proc: EngineProcess | undefined;
  try {
    const tenant = await readTenant(ownerPool);
    const runId = "r_hook_c1";
    const logFile = join(cluster.dataDir, "effects-c1.log");
    const paymentKey = idemKey(tenant.tenantId, runId, "pay", 0);

    proc = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      faultPoints: ["after:pay"],
      args: {
        tenantId: tenant.tenantId,
        reviewProfile: tenant.reviewProfile,
        runId,
        effects: "effects-c1.log",
        flow: "onion",
      },
    });
    const engine = proc;

    await waitFor(() => engine.deaths === 1, "the after:pay child dies exactly once");

    const atDeath = countEffects(logFile).byTool["erp.create_payment@1"];
    assert.ok(atDeath !== undefined, "the payment ran before the death");
    assert.deepEqual(atDeath, { calls: 1, effects: 1, duplicates: 0 });
    const intentAtDeath = await readIntent(ownerPool, tenant, paymentKey);
    assert.ok(intentAtDeath !== undefined, "the payment intent exists at the death");
    assert.equal(intentAtDeath.state, "intent");
    assert.equal(intentAtDeath.node_id, "pay");
    assert.equal(intentAtDeath.tool, "erp.create_payment@1");

    await engine.restart();
    const store = createRunStore(appPool);
    const run = await waitForRun(store, tenant, runId, ["completed", "failed"], DEADLINE_MS);
    assert.equal(
      run.state,
      "completed",
      `the restarted run completed: ${JSON.stringify(run.error)}`,
    );
    assert.equal(run.outputRef, payloadDigest({ payment_id: "pay-1" }));

    const counted = countEffects(logFile);
    const payment = counted.byTool["erp.create_payment@1"];
    assert.ok(payment !== undefined, "the payment tool was called");
    assert.deepEqual(payment, { calls: 2, effects: 1, duplicates: 1 });
    const lookup = counted.byTool["erp.lookup_vendor@1"];
    assert.ok(lookup !== undefined, "the lookup tool was called");
    assert.equal(lookup.calls, 1, "the read before the payment was not repeated");

    const payLines = logEntries(logFile).filter(
      (entry) => entry.tool === "erp.create_payment@1",
    );
    assert.deepEqual(
      payLines.map((entry) => entry.idemKey),
      [paymentKey, paymentKey],
      "both payment calls carry the node key",
    );

    const done = await readIntent(ownerPool, tenant, paymentKey);
    assert.ok(done !== undefined, "the payment intent survived the restart");
    assert.equal(done.state, "done");

    const listed = await store.listSteps(tenant, runId, { limit: 100 });
    const pay = listed.steps.find((step) => step.nodeId === "pay");
    assert.ok(pay !== undefined, "the pay row exists");
    assert.equal(pay.state, "completed");
    assert.deepEqual(
      pay.hooks?.entries,
      ONION_LABELS.map((label) => codeEntry(label)),
      "the pay row holds the six onion entries of an uncrashed run",
    );
  } finally {
    if (proc !== undefined) {
      await proc.stop().catch(() => undefined);
    }
    await ownerPool.end().catch(() => undefined);
    await appPool.end().catch(() => undefined);
  }
});

test("C-33cd45c5 a kill at a post block hook leaves one effect per key", async () => {
  const cluster = started.cluster;
  const ownerPool = createPool(cluster.ownerUrl, { max: 1 });
  const appPool = createPool(cluster.appEndpoint, { max: 2 });
  let proc: EngineProcess | undefined;
  try {
    const tenant = await readTenant(ownerPool);
    const runId = "r_hook_c2";
    const logFile = join(cluster.dataDir, "effects-c2.log");
    const slackKey = idemKey(tenant.tenantId, runId, "pay", 1);
    const paymentKey = idemKey(tenant.tenantId, runId, "pay", 0);

    proc = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      faultPoints: ["after:pay:post:notify"],
      args: {
        tenantId: tenant.tenantId,
        reviewProfile: tenant.reviewProfile,
        runId,
        effects: "effects-c2.log",
        flow: "notify-pay",
      },
    });
    const engine = proc;

    await waitFor(
      () => engine.deaths === 1,
      "the after:pay:post:notify child dies exactly once",
    );

    const slackAtDeath = countEffects(logFile).byTool["slack.post_message@1"];
    assert.ok(slackAtDeath !== undefined, "the slack hook ran before the death");
    assert.deepEqual(slackAtDeath, { calls: 1, effects: 1, duplicates: 0 });
    const intentAtDeath = await readIntent(ownerPool, tenant, slackKey);
    assert.ok(intentAtDeath !== undefined, "the hook intent exists at the death");
    assert.equal(intentAtDeath.state, "intent");
    assert.equal(intentAtDeath.node_id, "pay");
    assert.equal(intentAtDeath.tool, "slack.post_message@1");

    await engine.restart();
    const store = createRunStore(appPool);
    const run = await waitForRun(store, tenant, runId, ["completed", "failed"], DEADLINE_MS);
    assert.equal(
      run.state,
      "completed",
      `the restarted run completed: ${JSON.stringify(run.error)}`,
    );

    const counted = countEffects(logFile);
    const slack = counted.byTool["slack.post_message@1"];
    assert.ok(slack !== undefined, "the slack hook was called");
    assert.deepEqual(slack, { calls: 2, effects: 1, duplicates: 1 });
    const payment = counted.byTool["erp.create_payment@1"];
    assert.ok(payment !== undefined, "the payment tool was called");
    assert.deepEqual(payment, { calls: 1, effects: 1, duplicates: 0 });

    const slackLines = logEntries(logFile).filter(
      (entry) => entry.tool === "slack.post_message@1",
    );
    assert.deepEqual(
      slackLines.map((entry) => entry.idemKey),
      [slackKey, slackKey],
      "both slack calls carry the hook key",
    );

    const slackDone = await readIntent(ownerPool, tenant, slackKey);
    assert.ok(slackDone !== undefined, "the hook intent survived the restart");
    assert.equal(slackDone.state, "done");
    assert.equal(slackDone.result_ref, payloadDigest({ ts: "1.0" }));
    const paymentDone = await readIntent(ownerPool, tenant, paymentKey);
    assert.ok(paymentDone !== undefined, "the node intent survived the restart");
    assert.equal(paymentDone.state, "done");

    const listed = await store.listSteps(tenant, runId, { limit: 100 });
    assert.deepEqual(
      listed.steps.map((step) => step.nodeId),
      ["lookup", "route", "pay", "done"],
    );
    const pay = listed.steps.find((step) => step.nodeId === "pay");
    assert.ok(pay !== undefined, "the pay row exists");
    assert.deepEqual(pay.hooks?.entries, [
      {
        label: "post:notify",
        kind: "block",
        fused: false,
        attempt: 1,
        state: "completed",
        action: "continue",
        mutated: null,
        to: null,
        error: null,
        tool: "slack.post_message@1",
        idemKey: slackKey,
      },
    ]);
  } finally {
    if (proc !== undefined) {
      await proc.stop().catch(() => undefined);
    }
    await ownerPool.end().catch(() => undefined);
    await appPool.end().catch(() => undefined);
  }
});

test("C-6dc836af a kill at the retried attempt of an effect node leaves one effect per key", async () => {
  const cluster = started.cluster;
  const ownerPool = createPool(cluster.ownerUrl, { max: 1 });
  const appPool = createPool(cluster.appEndpoint, { max: 2 });
  let proc: EngineProcess | undefined;
  try {
    const tenant = await readTenant(ownerPool);
    const runId = "r_hook_c6";
    const logFile = join(cluster.dataDir, "effects-c6.log");
    const firstKey = idemKey(tenant.tenantId, runId, "send", 0, 0);
    const secondKey = idemKey(tenant.tenantId, runId, "send", 0, 1);

    proc = await spawnOrFail({
      cluster,
      scenario: SCENARIO,
      faultPoints: ["after:send:r2"],
      args: {
        tenantId: tenant.tenantId,
        reviewProfile: tenant.reviewProfile,
        runId,
        effects: "effects-c6.log",
        flow: "f-eff",
      },
    });
    const engine = proc;

    await waitFor(() => engine.deaths === 1, "the after:send:r2 child dies exactly once");

    const mailAtDeath = countEffects(logFile).byTool["mail.send@1"];
    assert.ok(mailAtDeath !== undefined, "the mail tool ran before the death");
    assert.deepEqual(mailAtDeath, { calls: 2, effects: 2, duplicates: 0 });
    const retryAtDeath = await readIntent(ownerPool, tenant, secondKey);
    assert.ok(retryAtDeath !== undefined, "the retried intent exists at the death");
    assert.equal(retryAtDeath.state, "intent");
    assert.equal(retryAtDeath.node_id, "send");
    assert.equal(retryAtDeath.tool, "mail.send@1");

    await engine.restart();
    const store = createRunStore(appPool);
    const run = await waitForRun(store, tenant, runId, ["completed", "failed"], DEADLINE_MS);
    assert.equal(
      run.state,
      "completed",
      `the restarted run completed: ${JSON.stringify(run.error)}`,
    );

    const mail = countEffects(logFile).byTool["mail.send@1"];
    assert.ok(mail !== undefined, "the mail tool was called");
    assert.deepEqual(mail, { calls: 3, effects: 2, duplicates: 1 });

    const mailLines = logEntries(logFile).filter((entry) => entry.tool === "mail.send@1");
    assert.deepEqual(
      mailLines.map((entry) => entry.idemKey),
      [firstKey, secondKey, secondKey],
      "the retried attempt reuses its generation key",
    );

    const firstDone = await readIntent(ownerPool, tenant, firstKey);
    assert.ok(firstDone !== undefined, "the first attempt intent exists");
    assert.equal(firstDone.state, "done");
    const secondDone = await readIntent(ownerPool, tenant, secondKey);
    assert.ok(secondDone !== undefined, "the retried intent survived the restart");
    assert.equal(secondDone.state, "done");

    const listed = await store.listSteps(tenant, runId, { limit: 100 });
    assert.deepEqual(
      listed.steps.map((step) => [step.nodeId, step.attempt, step.seq, step.idemKey, step.state]),
      [
        ["send", 1, 0, firstKey, "completed"],
        ["send", 2, 1, secondKey, "completed"],
        ["done", 1, 2, null, "completed"],
      ],
    );
  } finally {
    if (proc !== undefined) {
      await proc.stop().catch(() => undefined);
    }
    await ownerPool.end().catch(() => undefined);
    await appPool.end().catch(() => undefined);
  }
});
