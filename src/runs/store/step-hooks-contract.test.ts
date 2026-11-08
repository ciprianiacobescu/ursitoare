import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import { withTenantTx } from "../../tenancy/index.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { createMemoryRunStore, createRunStore, envelopeStore, idemKey, payloadDigest } from "../index.ts";
import type { NewRun, RunStore, StepHookEntry, StepRecord, StepWrite } from "../index.ts";

const AT = new Date("2026-11-02T10:00:00.000Z");
const RUN_ID = "r_1";
const MEMORY_A: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };
const MEMORY_B: TenantContext = { tenantId: "tenant_b", reviewProfile: "team" };

const NEW_RUN: NewRun = {
  runId: RUN_ID,
  lineageId: RUN_ID,
  parentRunId: null,
  flowId: "hook-onion",
  flowHash: `sha256:${"a".repeat(64)}`,
  ownerTeam: "finance",
  mode: "mock",
  trigger: "test",
  principal: { userId: "u_alice", kind: "human" },
  actorChain: ["u_alice"],
  input: { vendor: "  Acme " },
  mocks: null,
};

const ORIG = { vendor_name: "  Acme " };
const TRIM = { vendor_name: "Acme" };

const D_ORIG = payloadDigest(ORIG);
const D_TRIM = payloadDigest(TRIM);

const K_PAY = idemKey("tenant_a", "r_1", "pay", 0, 0);
const K_SEND0 = idemKey("tenant_a", "r_1", "send", 0, 0);

function E(label: string, over: Partial<StepHookEntry> = {}): StepHookEntry {
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
    ...over,
  };
}

const PAY_LABELS: readonly string[] = [
  "pre:rule.rule_a",
  "pre:rule.rule_b",
  "pre:pay_pre_note",
  "post:pay_post_note",
  "post:rule.rule_b",
  "post:rule.rule_a",
];

const TELL = E("post:tell", {
  kind: "block",
  state: "failed",
  action: null,
  error: { code: "HOOK_ERROR", message: "block hook failed (tool_failed)" },
  tool: "mail.send@1",
  idemKey: K_SEND0,
});

const REDIRECT = E("post:to_review", { action: "redirect", to: "review" });

function W(nodeId: string, seq: number, over: Partial<StepWrite> = {}): StepWrite {
  return {
    runId: RUN_ID,
    nodeId,
    effectSeq: 0,
    turn: 0,
    attempt: 1,
    generation: 0,
    seq,
    kind: "block",
    state: "completed",
    input: null,
    output: null,
    outcome: null,
    error: null,
    taint: [],
    policyDecisionId: null,
    idemKey: null,
    startedAt: AT,
    endedAt: AT,
    ...over,
  };
}

type HooksProbe = { inputOriginalRef?: unknown; entries?: unknown } | undefined;

function hooksOf(record: StepRecord): HooksProbe {
  return (record as { hooks?: HooksProbe }).hooks;
}

async function runSequence(store: RunStore, ctx: TenantContext, which: string): Promise<void> {
  await store.createRun(ctx, NEW_RUN, AT);

  assert.equal(
    await store.getPayload(ctx, D_ORIG),
    null,
    `${which}: the untrimmed input is not stored before the lookup final write`,
  );

  const started = await store.recordStep(ctx, W("lookup", 0, { state: "started", endedAt: null }));
  assert.equal("hooks" in started, false, `${which}: the started record has no hooks key`);

  const preTrim = E("pre:trim_name", { mutated: "input" });
  const lookup = await store.recordStep(ctx, W("lookup", 0, {
    input: TRIM,
    output: { vendor_id: "v1", status: "active" },
    hooks: { inputOriginal: ORIG, entries: [preTrim] },
  }));
  assert.equal(lookup.seq, 0, `${which}: the lookup final write keeps seq 0`);
  assert.equal(lookup.inputRef, D_TRIM, `${which}: the lookup step input is the trimmed payload`);
  assert.deepEqual(
    hooksOf(lookup),
    { inputOriginalRef: D_ORIG, entries: [preTrim] },
    `${which}: the lookup final write stores its trace and the original input digest`,
  );
  const original = await store.getPayload(ctx, D_ORIG);
  assert.ok(original !== null, `${which}: the untrimmed input payload is stored`);
  assert.deepEqual(original.data, ORIG, `${which}: the untrimmed input payload is kept whole`);

  const pay = await store.recordStep(ctx, W("pay", 1, {
    idemKey: K_PAY,
    hooks: { inputOriginal: null, entries: PAY_LABELS.map((label) => E(label)) },
  }));
  assert.deepEqual(
    hooksOf(pay),
    { inputOriginalRef: null, entries: PAY_LABELS.map((label) => E(label)) },
    `${which}: the pay write carries its six entries with a null inputOriginalRef`,
  );

  const done = await store.recordStep(ctx, W("done", 2, { kind: "end" }));
  assert.equal("hooks" in done, false, `${which}: a write without hooks has no hooks key`);

  const n1 = await store.recordStep(ctx, W("n1", 3, { hooks: null }));
  assert.equal("hooks" in n1, false, `${which}: an explicit null hooks has no hooks key`);

  const n2 = await store.recordStep(ctx, W("n2", 4, { hooks: { inputOriginal: null, entries: [] } }));
  assert.deepEqual(
    hooksOf(n2),
    { inputOriginalRef: null, entries: [] },
    `${which}: the empty trace is stored as an empty entries list`,
  );

  const one = await store.recordStep(ctx, W("pay", 1, {
    idemKey: K_PAY,
    hooks: { inputOriginal: null, entries: [E("post:rule.rule_a")] },
  }));
  assert.deepEqual(
    hooksOf(one)?.entries,
    [E("post:rule.rule_a")],
    `${which}: rewriting pay replaces its trace with one entry`,
  );

  const none = await store.recordStep(ctx, W("pay", 1, { idemKey: K_PAY }));
  assert.equal(
    "hooks" in none,
    false,
    `${which}: rewriting pay without hooks removes the trace`,
  );
  assert.equal(none.seq, 1, `${which}: the pay rewrite keeps its seq`);

  const n3 = await store.recordStep(ctx, W("n3", 5, { hooks: { inputOriginal: null, entries: [TELL] } }));
  assert.deepEqual(
    hooksOf(n3),
    { inputOriginalRef: null, entries: [TELL] },
    `${which}: the failed block entry comes back member for member`,
  );

  const n4 = await store.recordStep(ctx, W("n4", 6, { hooks: { inputOriginal: null, entries: [REDIRECT] } }));
  assert.deepEqual(
    hooksOf(n4),
    { inputOriginalRef: null, entries: [REDIRECT] },
    `${which}: the redirect entry comes back member for member`,
  );

  const final = await store.listSteps(ctx, RUN_ID, { limit: 100 });
  assert.deepEqual(
    final.steps.map((step) => [step.seq, step.nodeId]),
    [[0, "lookup"], [1, "pay"], [2, "done"], [3, "n1"], [4, "n2"], [5, "n3"], [6, "n4"]],
    `${which}: the final list holds the seven rows in seq order`,
  );
  assert.deepEqual(
    final.steps.filter((step) => step.hooks !== undefined).map((step) => step.nodeId),
    ["lookup", "n2", "n3", "n4"],
    `${which}: exactly the traced rows carry hooks`,
  );

  const firstTrace = final.steps.find((step) => step.nodeId === "lookup");
  assert.ok(firstTrace !== undefined, `${which}: the final list holds the lookup row`);
  assert.ok(firstTrace.hooks !== undefined, `${which}: the returned lookup row carries hooks`);
  const firstEntry = firstTrace.hooks.entries[0];
  assert.ok(firstEntry !== undefined, `${which}: the returned lookup trace holds one entry`);
  firstEntry.label = "tampered";
  const again = await store.listSteps(ctx, RUN_ID, { limit: 100 });
  const storedTrace = again.steps.find((step) => step.nodeId === "lookup");
  assert.ok(storedTrace !== undefined, `${which}: the listed lookup row survives a mutation attempt`);
  assert.equal(
    storedTrace.hooks?.entries[0]?.label,
    "pre:trim_name",
    `${which}: a returned record is a copy, the stored trace is untouched`,
  );
}

test("C-2cbc7c16 one sequence gives equal hook traces in both stores", async () => {
  assert.equal(typeof createMemoryRunStore, "function");
  assert.equal(typeof createRunStore, "function");
  assert.equal(typeof envelopeStore.referencedBy, "function");
  assert.equal(K_PAY, "ik1_677d835c8e07871e5aabcc92745361cea1baa4e358b55523a1862f6cc5132714");
  assert.equal(D_ORIG, "364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b");
  assert.equal(D_TRIM, "1f19c0e68ba33e917a5cee0413aec2965a2fcecb63a8c97784998936bd6f67f6");

  const db = await withTestDatabase();
  try {
    const { a, b } = await seedTwoTenants(db);
    const memory = createMemoryRunStore();
    const database = createRunStore(db.appPool);

    await runSequence(memory, MEMORY_A, "memory");
    const memorySteps = (await memory.listSteps(MEMORY_A, RUN_ID, { limit: 100 })).steps;
    await runSequence(database, a, "database");
    const databaseSteps = (await database.listSteps(a, RUN_ID, { limit: 100 })).steps;

    assert.deepEqual(
      memorySteps,
      databaseSteps,
      "the two stores return equal lists for the same sequence",
    );

    const referenced = await withTenantTx(db.appPool, a, (tx) =>
      envelopeStore.referencedBy(tx, a, RUN_ID, D_ORIG),
    );
    assert.equal(
      referenced,
      false,
      "the original input payload is not referenced by the run, so the payload route would refuse it",
    );

    assert.deepEqual(
      (await database.listSteps(b, RUN_ID, { limit: 100 })).steps,
      [],
      "tenant B lists no steps of tenant A",
    );
    assert.equal(await database.getPayload(b, D_ORIG), null, "tenant B reads no payload of tenant A");
    assert.deepEqual(
      (await memory.listSteps(MEMORY_B, RUN_ID, { limit: 100 })).steps,
      [],
      "the memory store isolates tenant B as well",
    );
    assert.equal(await memory.getPayload(MEMORY_B, D_ORIG), null, "the memory store isolates the payload");
  } finally {
    await db.close();
  }
});
