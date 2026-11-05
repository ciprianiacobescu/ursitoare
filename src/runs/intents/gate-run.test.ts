import assert from "node:assert/strict";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import { canonicalizeFlow, validateFlow } from "../../../src/authoring/index.ts";
import type { Catalogue, JsonValue } from "../../../src/authoring/index.ts";
import { fixedClock, sequentialIds } from "../../../src/core/index.ts";
import {
  executeRun,
  memoryWorkflowOps,
  startRun,
} from "../../../src/interpreter/index.ts";
import type {
  InterpreterDeps,
  LoadedVersion,
  MemoryWorkflowOps,
  ToolInvoker,
} from "../../../src/interpreter/index.ts";
import { withTenantTx } from "../../../src/tenancy/index.ts";
import type { TenantContext } from "../../../src/tenancy/index.ts";
import { loadTestCatalogue } from "../../../test/support/catalogue/loader.ts";
import { countEffects } from "../../../test/support/crash/effects.ts";
import {
  effectLogInvoker,
  payOnceCatalogue,
  payOnceVersion,
} from "../../../test/support/crash/pay-once.ts";
import { withTestDatabase } from "../../../test/support/pg.ts";
import type { TestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { payloadDigest } from "../store/canonical.ts";
import { createRunStore } from "../store/run-store.ts";
import type { PayloadValue, StepRecord } from "../store/types.ts";
import { createEffectIntents } from "./gate.ts";
import { idemKey } from "./key.ts";

assert.equal(typeof createEffectIntents, "function");
assert.equal(typeof executeRun, "function");
assert.equal(typeof startRun, "function");

const PAY_ONCE_INPUT: JsonValue = { vendor: "Acme", invoice: "inv-1", amount: 120 };
const PAY_ARGS: PayloadValue = {
  vendor_id: "v1",
  amount: 120,
  currency: "EUR",
  reference: "inv-1",
};
const PAID: PayloadValue = { payment_id: "pay-1", status: "paid" };
const END_OUTPUT: PayloadValue = { payment_id: "pay-1" };
const AT = "2026-11-02T10:00:00.000000Z";

// A stub's "not implemented" error must surface as an assertion failure, not a bare error.
function loadedVersion(): LoadedVersion {
  let value: LoadedVersion | undefined;
  assert.doesNotThrow(() => {
    value = payOnceVersion();
  });
  assert.ok(value !== undefined, "payOnceVersion returned a version");
  return value;
}

function catalogueOf(): Catalogue {
  let value: Catalogue | undefined;
  assert.doesNotThrow(() => {
    value = payOnceCatalogue();
  });
  assert.ok(value !== undefined, "payOnceCatalogue returned a catalogue");
  return value;
}

function invokerOf(file: string): ToolInvoker {
  let value: ToolInvoker | undefined;
  assert.doesNotThrow(() => {
    value = effectLogInvoker(file);
  });
  assert.ok(value !== undefined, "effectLogInvoker returned an invoker");
  return value;
}

interface CapturingOps extends MemoryWorkflowOps {
  readonly values: readonly JsonValue[];
}

function capturingOps(
  workflowId: string,
  recorded: readonly JsonValue[] = [],
): CapturingOps {
  const base = memoryWorkflowOps(workflowId, recorded);
  const values: JsonValue[] = [];
  return {
    get workflowId(): string {
      return base.workflowId;
    },
    async runStep<T extends JsonValue>(name: string, fn: () => Promise<T>): Promise<T> {
      const value = await base.runStep(name, fn);
      values.push(value);
      return value;
    },
    async sleep(ms: number): Promise<void> {
      await base.sleep(ms);
    },
    get executed(): readonly string[] {
      return base.executed;
    },
    get slept(): readonly number[] {
      return base.slept;
    },
    get values(): readonly JsonValue[] {
      return values;
    },
  };
}

function depsFor(db: TestDatabase, version: LoadedVersion, file: string): InterpreterDeps {
  return {
    store: createRunStore(db.appPool),
    durable: null,
    loadVersion: async (_ctx, flowId, hash) =>
      flowId === version.flowId && hash === version.hash ? version : null,
    catalogueFor: async () => catalogueOf(),
    invokerFor: async () => invokerOf(file),
    effects: createEffectIntents(db.appPool),
    clock: fixedClock("2026-11-02T10:00:00Z"),
    ids: sequentialIds(0),
  };
}

interface IntentRow {
  idem_key: string;
  run_id: string;
  node_id: string;
  tool: string;
  args_digest: string;
  mode: string;
  state: string;
  result_ref: string | null;
  created_at: string;
  completed_at: string | null;
}

const INTENT_SELECT = `SELECT idem_key, run_id, node_id, tool, args_digest, mode, state, result_ref,
    to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS created_at,
    CASE WHEN completed_at IS NULL THEN NULL
      ELSE to_char(completed_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')
    END AS completed_at
  FROM ursitoare.effect_intent
  WHERE tenant_id = $1
  ORDER BY idem_key`;

async function intentRows(db: TestDatabase, ctx: TenantContext): Promise<IntentRow[]> {
  return withTenantTx(db.ownerPool, ctx, async (tx) => {
    const { rows } = await tx.query<IntentRow>(INTENT_SELECT, [ctx.tenantId]);
    return rows;
  });
}

async function stepRows(
  db: TestDatabase,
  ctx: TenantContext,
  runId: string,
): Promise<StepRecord[]> {
  const listed = await createRunStore(db.appPool).listSteps(ctx, runId, { limit: 100 });
  return listed.steps;
}

interface EffectLine {
  tool: string;
  idemKey: string | null;
  nodeId: string;
}

function logEntries(file: string): EffectLine[] {
  return readFileSync(file, "utf8")
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => JSON.parse(line) as EffectLine);
}

test("C-59e4a405 the gate inside executeRun records one intent and a replay changes nothing", async () => {
  const dir = mkdtempSync(join(tmpdir(), "intents-gate-run-"));
  const file = join(dir, "effects.log");
  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const version = loadedVersion();

    const checked = validateFlow(canonicalizeFlow(version.flow), loadTestCatalogue());
    assert.equal(
      checked.ok,
      true,
      `the pay-once flow validates: ${JSON.stringify(checked.errors)}`,
    );

    const deps = depsFor(db, version, file);
    await startRun(deps, a, {
      flowId: version.flowId,
      hash: version.hash,
      mode: "live",
      input: PAY_ONCE_INPUT,
      mocks: null,
      principal: { userId: "u_alice", kind: "human" },
      actorChain: ["u_alice"],
      runId: "r_gate_1",
    });

    const first = capturingOps("r_gate_1");
    const run = await executeRun(first, deps, a, "r_gate_1");
    assert.equal(run.state, "completed");
    assert.equal(run.outputRef, payloadDigest(END_OUTPUT));

    const key = idemKey(a.tenantId, "r_gate_1", "pay", 0);
    const rows = await intentRows(db, a);
    assert.equal(rows.length, 1, "the tenant holds exactly one effect intent");
    const row = rows[0];
    assert.ok(row !== undefined, "the intent row exists");
    assert.equal(row.idem_key, key);
    assert.equal(row.run_id, "r_gate_1");
    assert.equal(row.node_id, "pay");
    assert.equal(row.tool, "erp.create_payment@1");
    assert.equal(row.args_digest, payloadDigest(PAY_ARGS));
    assert.equal(row.mode, "live");
    assert.equal(row.state, "done");
    assert.equal(row.result_ref, payloadDigest(PAID));
    assert.equal(row.created_at, AT);
    assert.equal(row.completed_at, AT);

    const steps = await stepRows(db, a, "r_gate_1");
    const payStep = steps.find((step) => step.nodeId === "pay");
    const lookupStep = steps.find((step) => step.nodeId === "lookup");
    assert.ok(payStep !== undefined, "the pay step row exists");
    assert.ok(lookupStep !== undefined, "the lookup step row exists");
    assert.equal(payStep.idemKey, key);
    assert.equal(lookupStep.idemKey, null);

    const entries = logEntries(file);
    assert.deepEqual(
      entries.map((entry) => [entry.nodeId, entry.idemKey]),
      [
        ["lookup", null],
        ["pay", key],
      ],
    );
    const counted = countEffects(file);
    assert.equal(counted.calls, 2);
    assert.equal(counted.effects, 2);
    assert.equal(counted.duplicates, 0);

    const before = await intentRows(db, a);
    const replay = capturingOps("r_gate_1", first.values.slice(0, 5));
    const replayed = await executeRun(replay, deps, a, "r_gate_1");
    assert.deepEqual(replay.executed, ["pay#done", "done", "run:finish"]);
    assert.equal(replayed.state, "completed");
    assert.equal(replayed.outputRef, payloadDigest(END_OUTPUT));
    assert.equal(countEffects(file).calls, 2);
    assert.deepEqual(await intentRows(db, a), before);
  } finally {
    await db.close();
  }
});
