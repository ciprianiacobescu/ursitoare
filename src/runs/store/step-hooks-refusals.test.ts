import assert from "node:assert/strict";
import { test } from "node:test";

import { withTestDatabase } from "../../../test/support/pg.ts";
import { seedTwoTenants } from "../../../test/support/tenants.ts";
import type { TenantContext } from "../../tenancy/index.ts";
import { createMemoryRunStore, createRunStore, payloadDigest } from "../index.ts";
import type { NewRun, RunStore, StepRecord, StepWrite } from "../index.ts";

const AT = new Date("2026-11-02T10:00:00.000Z");
const RUN_ID = "r_1";
const MEMORY_CTX: TenantContext = { tenantId: "tenant_a", reviewProfile: "team" };

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

const ORIG: PayloadValueAlias = { vendor_name: "  Acme " };
const TRIM: PayloadValueAlias = { vendor_name: "Acme" };
const LEAK: PayloadValueAlias = { leak: 1 };

type PayloadValueAlias = Parameters<typeof payloadDigest>[0];

const D_ORIG = "364f588406d58da425488ae35b7aeb5ae04e6a5b18e212ff5c52472a33a8bd2b";
const D_TRIM = "1f19c0e68ba33e917a5cee0413aec2965a2fcecb63a8c97784998936bd6f67f6";
const D_LEAK = "3df46b464a978c8002f0b17711d860a05429d9524a1a45c133b32cc7b0f3eb24";

function E(label: string, over: Record<string, unknown> = {}): Record<string, unknown> {
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

const E1 = E("post:a");

function W(nodeId: string, seq: number, over: Record<string, unknown> = {}): StepWrite {
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
  } as StepWrite;
}

function sixtyFive(prefix: string, over: Record<string, unknown> = {}): Record<string, unknown>[] {
  return Array.from({ length: 65 }, () => E(prefix, over));
}

const REFUSALS: ReadonlyArray<readonly [string, Record<string, unknown>]> = [
  ["u0000 message", {
    inputOriginal: null,
    entries: [E("post:a", { state: "failed", error: { code: "HOOK_ERROR", message: "a\u0000b" } })],
  }],
  ["lone surrogate message", {
    inputOriginal: null,
    entries: [E("post:a", { state: "failed", error: { code: "HOOK_ERROR", message: "a\ud800" } })],
  }],
  ["message of 501 characters", {
    inputOriginal: null,
    entries: [E("post:a", { state: "failed", error: { code: "HOOK_ERROR", message: "x".repeat(501) } })],
  }],
  ["error with an extra member", {
    inputOriginal: null,
    entries: [E("post:a", { error: { code: "HOOK_ERROR", message: "m", node: null } })],
  }],
  ["label with an uppercase id", { inputOriginal: null, entries: [E("pre:Bad", {})] }],
  ["label with a node form", { inputOriginal: null, entries: [E("pay/pre:rule.rule_a", {})] }],
  ["label with an attempt suffix", { inputOriginal: null, entries: [E("pre:rule.rule_a:r2", {})] }],
  ["label without an id", { inputOriginal: null, entries: [E("pre:", {})] }],
  ["65 entries", { inputOriginal: null, entries: sixtyFive("pre:a") }],
  ["entries that is not an array", { inputOriginal: null, entries: "x" }],
  ["attempt 0", { inputOriginal: null, entries: [E("post:a", { attempt: 0 })] }],
  ["attempt 1.5", { inputOriginal: null, entries: [E("post:a", { attempt: 1.5 })] }],
  ["attempt over the integer maximum", {
    inputOriginal: null,
    entries: [E("post:a", { attempt: 2147483648 })],
  }],
  ["to that is not a node id", { inputOriginal: null, entries: [E("post:a", { to: "Review" })] }],
  ["tool without a version", {
    inputOriginal: null,
    entries: [E("post:a", { kind: "block", tool: "mail.send" })],
  }],
  ["idemKey keith prefix without hex", { inputOriginal: null, entries: [E("post:a", { idemKey: "ik1_x" })] }],
  ["action outside its enum", { inputOriginal: null, entries: [E("post:a", { action: "explode" })] }],
  ["kind outside its enum", { inputOriginal: null, entries: [E("post:a", { kind: "llm" })] }],
  ["entry with an extra member", { inputOriginal: null, entries: [{ ...E1, extra: 1 }] }],
  ["entry without a member", {
    inputOriginal: null,
    entries: [{
      label: "post:a",
      kind: "code",
      fused: true,
      attempt: 1,
      state: "completed",
      action: "continue",
      mutated: null,
      to: null,
      error: null,
      idemKey: null,
    }],
  }],
  ["hooks with an extra member", { inputOriginal: null, entries: [E1], extra: 1 }],
  ["state started", { inputOriginal: null, entries: [E("post:a", { state: "started" })] }],
  ["mutated both", { inputOriginal: null, entries: [E("post:a", { mutated: "both" })] }],
  ["fused yes", { inputOriginal: null, entries: [E("post:a", { fused: "yes" })] }],
  ["inputOriginal NaN", { inputOriginal: NaN, entries: [E1] }],
  ["inputOriginal with U+0000", { inputOriginal: { a: "x\u0000" }, entries: [E1] }],
  ["hooks without inputOriginal", { entries: [E1] }],
  ["hooks that is an array", { hooks: [] as unknown[] }],
];

function hooksOf(record: StepRecord): unknown {
  return (record as { hooks?: unknown }).hooks;
}

type HookEntryProbe = { label?: string; attempt?: number; error?: { message?: string } | null };

function entryOf(hooks: unknown, index: number): HookEntryProbe | undefined {
  return (hooks as { entries?: HookEntryProbe[] } | undefined)?.entries?.[index];
}

async function assertLimits(store: RunStore, ctx: TenantContext, which: string): Promise<void> {
  const sixtyFour = Array.from({ length: 64 }, () => E("pre:a"));
  const b64 = await store.recordStep(ctx, W("b64", 10, { hooks: { inputOriginal: null, entries: sixtyFour } }));
  assert.deepEqual(
    hooksOf(b64),
    { inputOriginalRef: null, entries: sixtyFour },
    `${which}: a write with 64 entries is stored whole`,
  );

  const b500 = await store.recordStep(ctx, W("b500", 11, {
    hooks: {
      inputOriginal: null,
      entries: [E("post:a", { state: "failed", error: { code: "HOOK_ERROR", message: "m".repeat(500) } })],
    },
  }));
  const b500entry = entryOf(hooksOf(b500), 0);
  assert.ok(b500entry !== undefined, `${which}: the 500-character limit entry is stored`);
  assert.equal(b500entry.error?.message?.length, 500, `${which}: a message of 500 characters is stored`);

  const bmax = await store.recordStep(ctx, W("bmax", 12, {
    hooks: { inputOriginal: null, entries: [E("post:a", { attempt: 2147483647 })] },
  }));
  assert.equal(
    entryOf(hooksOf(bmax), 0)?.attempt,
    2147483647,
    `${which}: attempt at the integer maximum is stored`,
  );

  const b128 = await store.recordStep(ctx, W("b128", 13, {
    hooks: { inputOriginal: null, entries: [E(`post:rule.${"a".repeat(128)}`)] },
  }));
  assert.equal(
    entryOf(hooksOf(b128), 0)?.label?.length,
    138,
    `${which}: a label with a 128-character id is stored`,
  );

  await assert.rejects(
    store.recordStep(ctx, W("bad", 14, {
      hooks: { inputOriginal: null, entries: [E(`post:rule.${"a".repeat(129)}`)] },
    })),
    { code: "RUN_DATA_INVALID" },
    `${which}: a label with a 129-character id is refused`,
  );
}

async function assertRefusals(store: RunStore, ctx: TenantContext, which: string): Promise<void> {
  await store.createRun(ctx, NEW_RUN, AT);

  for (const [name, hooks] of REFUSALS) {
    await assert.rejects(
      store.recordStep(ctx, W("bad", 9, { hooks })),
      { code: "RUN_DATA_INVALID" },
      `${which}: ${name} is refused before anything is stored`,
    );
  }

  await assert.rejects(
    store.recordStep(ctx, W("leak", 16, {
      hooks: { inputOriginal: LEAK, entries: sixtyFive("post:a") },
    })),
    { code: "RUN_DATA_INVALID" },
    `${which}: a good payload beside too many entries is refused altogether`,
  );
  assert.equal(await store.getPayload(ctx, D_LEAK), null, `${which}: the leak payload was never stored`);

  await assert.rejects(
    store.recordStep(ctx, W("big", 15, {
      hooks: { inputOriginal: { s: "x".repeat(1_048_577) }, entries: [] },
    })),
    { code: "RUN_DATA_TOO_LARGE" },
    `${which}: an oversized inputOriginal is refused as too large`,
  );

  await assertLimits(store, ctx, which);

  const list = await store.listSteps(ctx, RUN_ID, { limit: 100 });
  assert.deepEqual(
    list.steps.map((step) => step.nodeId),
    ["b64", "b500", "bmax", "b128"],
    `${which}: every refused write left no row`,
  );
}

test("C-15cabb6c both stores refuse the malformed hook traces and keep the limit writes", async () => {
  assert.equal(typeof createMemoryRunStore, "function");
  assert.equal(typeof createRunStore, "function");

  assert.equal(payloadDigest(ORIG), D_ORIG);
  assert.equal(payloadDigest(TRIM), D_TRIM);
  assert.equal(payloadDigest(LEAK), D_LEAK);

  const db = await withTestDatabase();
  try {
    const { a } = await seedTwoTenants(db);
    const stores: ReadonlyArray<readonly [string, RunStore]> = [
      ["memory", createMemoryRunStore()],
      ["database", createRunStore(db.appPool)],
    ];
    for (const [which, store] of stores) {
      await assertRefusals(store, which === "memory" ? MEMORY_CTX : a, which);
    }
  } finally {
    await db.close();
  }
});
