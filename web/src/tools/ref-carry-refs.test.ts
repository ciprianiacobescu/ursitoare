/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  approvedEffects,
  changedRefs,
  refNoticeText,
  refState,
  REF_MARKERS,
} from "./ref-carry.ts";
import type { ToolServerView } from "./servers.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const CP1 = "ledger.create_payment@1";
const CP2 = "ledger.create_payment@2";
const LV1 = "ledger.list_vendors@1";
const LV2 = "ledger.list_vendors@2";

type Tool = ToolServerView["tools"][number];

function t(name: string, ref: string | null, effect: Tool["effect"] = "read"): Tool {
  return { name, effect, ref, untrusted_result: true, unsafe_to_retry: false, http: null };
}

function srv(id: string, state: ToolServerView["state"], tools: readonly Tool[]): ToolServerView {
  return {
    id,
    adapter: "http_openapi",
    origin: "https://tools.fake.test",
    state,
    registeredBy: "u_carol",
    pendingDigest: null,
    approvedDigest: null,
    pendingSubmittedBy: null,
    tools: [...tools],
  };
}

function surface(name: string, effect: string): Record<string, unknown> {
  return {
    name,
    effect,
    input: { type: "object" },
    output: { type: "object" },
    http: { method: "POST", path: `/v1/${name}` },
  };
}

const S1 = { tools: [surface("create_payment", "read"), surface("list_vendors", "read")] };

const L = [
  srv("ledger", "approved", [t("create_payment", CP2)]),
  srv("acme", "drifted", [t("lookup_vendor", "acme.lookup_vendor@1")]),
  srv("crm", "approved", [t("find_vendor", "crm.find_vendor@1")]),
  srv("fresh", "pending", [t("ping", null)]),
  srv("nulled", "approved", [t("ghost", null)]),
];

test("C-d008fd69 changedRefs finds the bumped tool and sorts the changes by tool name", () => {
  const before = srv("ledger", "drifted", [t("create_payment", CP1), t("list_vendors", LV1)]);

  const oneBumped = srv("ledger", "approved", [
    t("create_payment", CP2),
    t("list_vendors", LV1),
  ]);
  assert.deepEqual(call(() => changedRefs(before, oneBumped)), [
    { tool: "create_payment", from: CP1, to: CP2 },
  ]);

  const bothBumpedReordered = srv("ledger", "approved", [
    t("list_vendors", LV2),
    t("create_payment", CP2),
  ]);
  assert.deepEqual(call(() => changedRefs(before, bothBumpedReordered)), [
    { tool: "create_payment", from: CP1, to: CP2 },
    { tool: "list_vendors", from: LV1, to: LV2 },
  ]);

  const sameRefs = srv("ledger", "approved", [t("create_payment", CP1), t("list_vendors", LV1)]);
  assert.deepEqual(call(() => changedRefs(before, sameRefs)), []);
});

test("C-d008fd69 changedRefs skips a first approval an added and a removed tool and a null ref", () => {
  const pending = srv("ledger", "pending", [t("create_payment", null)]);
  const firstApproval = srv("ledger", "approved", [t("create_payment", CP1)]);
  assert.deepEqual(call(() => changedRefs(pending, firstApproval)), []);

  const addedRemovedBefore = srv("ledger", "drifted", [
    t("create_payment", CP1),
    t("old_tool", "ledger.old_tool@1"),
  ]);
  const addedRemovedAfter = srv("ledger", "approved", [
    t("create_payment", CP2),
    t("refund", "ledger.refund@1"),
  ]);
  assert.deepEqual(call(() => changedRefs(addedRemovedBefore, addedRemovedAfter)), [
    { tool: "create_payment", from: CP1, to: CP2 },
  ]);

  const nullBefore = srv("ledger", "drifted", [
    t("create_payment", CP1),
    t("list_vendors", LV1),
  ]);
  const nullAfter = srv("ledger", "approved", [
    t("create_payment", null),
    t("list_vendors", LV2),
  ]);
  assert.deepEqual(call(() => changedRefs(nullBefore, nullAfter)), [
    { tool: "list_vendors", from: LV1, to: LV2 },
  ]);
});

test("C-d008fd69 changedRefs adds an effect only from the approved effects", () => {
  const before = srv("ledger", "drifted", [
    t("create_payment", CP1, "pay"),
    t("list_vendors", LV1),
  ]);
  const after = srv("ledger", "approved", [
    t("create_payment", CP2, "pay"),
    t("list_vendors", LV2),
  ]);
  const effects = call(() => approvedEffects(S1));
  assert.deepEqual(call(() => changedRefs(before, after, effects)), [
    { tool: "create_payment", from: CP1, to: CP2, effect: { from: "read", to: "pay" } },
    { tool: "list_vendors", from: LV1, to: LV2 },
  ]);
  assert.deepEqual(call(() => changedRefs(before, after)), [
    { tool: "create_payment", from: CP1, to: CP2 },
    { tool: "list_vendors", from: LV1, to: LV2 },
  ]);
});

test("C-d008fd69 approvedEffects maps a readable surface and is empty otherwise", () => {
  assert.deepEqual([...call(() => approvedEffects(S1))], [
    ["create_payment", "read"],
    ["list_vendors", "read"],
  ]);
  assert.deepEqual([...call(() => approvedEffects(null))], []);
  assert.deepEqual([...call(() => approvedEffects({ tools: "x" }))], []);
});

test("C-d008fd69 refNoticeText words the changes as old to new", () => {
  assert.equal(call(() => refNoticeText([])), null);
  assert.equal(
    call(() => refNoticeText([{ tool: "create_payment", from: CP1, to: CP2 }])),
    "Refs changed: ledger.create_payment@1 → ledger.create_payment@2. Grants and flows still name the old refs.",
  );
  assert.equal(
    call(() =>
      refNoticeText([
        { tool: "create_payment", from: CP1, to: CP2 },
        { tool: "list_vendors", from: LV1, to: LV2 },
      ]),
    ),
    "Refs changed: ledger.create_payment@1 → ledger.create_payment@2, ledger.list_vendors@1 → ledger.list_vendors@2. Grants and flows still name the old refs.",
  );
});

test("C-568a8224 refState tells current superseded and waiting on the listing server", () => {
  assert.equal(call(() => refState("ledger.create_payment@2", L)), "current");
  assert.equal(call(() => refState("ledger.create_payment@1", L)), "superseded");
  assert.equal(call(() => refState("acme.lookup_vendor@1", L)), "waiting");
  assert.equal(call(() => refState("acme.lookup_vendor@2", L)), "superseded");
  assert.equal(call(() => refState("crm.find_vendor@1", L)), "current");
});

test("C-568a8224 refState gives null for a ref that no non-pending server lists", () => {
  for (const tool of [
    "crm.find_customer@1",
    "fresh.ping@1",
    "nope.tool@1",
    "nulled.ghost@1",
    "plain@1",
    "ledger.create_payment",
    ".x@1",
    "ledger.@1",
    "ledger.create.payment@2",
    "__proto__.x@1",
  ]) {
    assert.equal(call(() => refState(tool, L)), null, tool);
  }
  assert.equal(call(() => refState("ledger.create_payment@2", [])), null);
});

test("C-568a8224 REF_MARKERS holds the superseded and waiting texts", () => {
  assert.deepEqual(REF_MARKERS, {
    superseded: "superseded",
    waiting: "waiting for approval",
  });
});
