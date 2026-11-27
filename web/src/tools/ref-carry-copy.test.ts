/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import {
  carryKeys,
  copyGrantBody,
  copyGrants,
  copyPlan,
  parseGrantRecord,
} from "./ref-carry.ts";
import type {
  CopyOutcome,
  CopyPlan,
  GrantRecord,
  RefChange,
} from "./ref-carry.ts";

assert.equal(typeof copyPlan, "function");
assert.equal(typeof copyGrantBody, "function");
assert.equal(typeof copyGrants, "function");
assert.equal(typeof carryKeys, "function");

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

async function settled<T>(p: Promise<T>): Promise<T> {
  await assert.doesNotReject(p);
  return await p;
}

const CP1 = "ledger.create_payment@1";
const CP2 = "ledger.create_payment@2";
const LV1 = "ledger.list_vendors@1";
const LV2 = "ledger.list_vendors@2";

const CH: RefChange[] = [
  { tool: "create_payment", from: CP1, to: CP2 },
  { tool: "list_vendors", from: LV1, to: LV2 },
];

const CHE: RefChange[] = [
  { tool: "create_payment", from: CP1, to: CP2, effect: { from: "read", to: "pay" } },
  { tool: "list_vendors", from: LV1, to: LV2 },
];

function G(over: Record<string, unknown> = {}, status = "active"): Record<string, unknown> {
  return {
    grant: {
      id: "grant_1",
      subject: { kind: "role", role: "author" },
      tool: CP1,
      scope: { kind: "any_step" },
      args: [],
      fingerprints: [],
      state: "active",
      createdBy: "u_carol",
      createdAt: "2026-11-06T10:00:00.000000Z",
      revokedBy: null,
      revokedAt: null,
      ...over,
    },
    status,
  };
}

function rec(
  id: string,
  tool: string,
  over: Record<string, unknown> = {},
  status = "active",
): GrantRecord {
  const parsed = parseGrantRecord(G({ id, tool, ...over }, status));
  assert.ok(parsed !== null, `the grant ${id} parses`);
  return parsed;
}

const G1 = rec("grant_1", CP1);
const G2 = rec(
  "grant_2",
  CP1,
  { subject: { kind: "user", userId: "u_bob" }, args: [{ arg: "amount", op: "lte", value: 100 }] },
  "needs_reconfirm",
);
const G3 = rec("grant_3", CP1, {
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
});
const G4 = rec("grant_4", CP1, { state: "revoked" }, "revoked");
const G5 = rec("grant_5", "acme.lookup_vendor@1");
const G6 = rec("grant_6", LV1);
const G7 = rec("grant_7", CP2);

function refusal(reason?: string): ApiRequestError {
  if (reason === undefined) {
    return new ApiRequestError(422, "OPERATION_REFUSED", "m");
  }
  return new ApiRequestError(422, "OPERATION_REFUSED", "m", { details: { reason } });
}

interface RecordedPost {
  path: string;
  body: unknown;
  opts: unknown;
}

function postFake(replies: readonly unknown[]): { calls: RecordedPost[]; api: Api<"post"> } {
  const calls: RecordedPost[] = [];
  let index = 0;
  const api = {
    post: async (path: string, body?: unknown, opts?: unknown): Promise<unknown> => {
      calls.push({ path, body, opts });
      const reply = replies[Math.min(index, replies.length - 1)];
      index += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
  } as unknown as Api<"post">;
  return { calls, api };
}

const PL: CopyPlan = {
  copy: [
    { grant: G1, to: CP2 },
    { grant: G2, to: CP2 },
    { grant: G6, to: LV2 },
  ],
  flowFirst: [],
  effectChanged: [],
};

const ONE: CopyPlan = {
  copy: [{ grant: G1, to: CP2 }],
  flowFirst: [],
  effectChanged: [],
};

const KEY_OF = (id: string, to: string): string => "k-" + id + "-" + to;

test("C-b4fa2d61 copyPlan copies any step grants and lists node grants as update the flow first", () => {
  const plan = call(() => copyPlan([G1, G2, G3, G4, G5, G6, G7], CH));

  assert.deepEqual(plan.copy, [
    { grant: G1, to: CP2 },
    { grant: G2, to: CP2 },
    { grant: G6, to: LV2 },
  ]);
  assert.deepEqual(plan.flowFirst, [{ grant: G3, to: CP2 }]);
  assert.deepEqual(plan.effectChanged, []);
});

test("C-b4fa2d61 copyPlan lists a changed effect whatever the grant scope", () => {
  const plan = call(() => copyPlan([G1, G3, G4, G6], CHE));

  assert.deepEqual(plan.copy, [{ grant: G6, to: LV2 }]);
  assert.deepEqual(plan.flowFirst, []);
  assert.deepEqual(plan.effectChanged, [
    { grant: G1, to: CP2, effect: { from: "read", to: "pay" } },
    { grant: G3, to: CP2, effect: { from: "read", to: "pay" } },
  ]);
});

test("C-b4fa2d61 copyPlan gives empty lists without changes or grants", () => {
  assert.deepEqual(call(() => copyPlan([G1, G2, G3], [])), {
    copy: [],
    flowFirst: [],
    effectChanged: [],
  });
  assert.deepEqual(call(() => copyPlan([], CH)), {
    copy: [],
    flowFirst: [],
    effectChanged: [],
  });
});

test("C-b4fa2d61 copyGrantBody returns a fresh any step body and refuses a bad ref", () => {
  const grant = rec("grant_8", CP1, {
    args: [
      { arg: "amount", op: "lte", value: 100 },
      { arg: "currency", op: "eq", value: "EUR" },
    ],
  });

  const body = call(() => copyGrantBody(grant, CP2));
  assert.deepEqual(body, {
    subject: { kind: "role", role: "author" },
    tool: CP2,
    scope: { kind: "any_step" },
    args: [
      { arg: "amount", op: "lte", value: 100 },
      { arg: "currency", op: "eq", value: "EUR" },
    ],
  });

  const firstArg = body.args[0];
  assert.ok(firstArg !== undefined);
  firstArg.value = 999;
  if (body.subject.kind === "role") body.subject.role = "other";
  assert.equal(grant.args[0]?.value, 100);
  assert.deepEqual(grant.subject, { kind: "role", role: "author" });

  assert.deepEqual(call(() => copyGrantBody(G2, CP2)), {
    subject: { kind: "user", userId: "u_bob" },
    tool: CP2,
    scope: { kind: "any_step" },
    args: [{ arg: "amount", op: "lte", value: 100 }],
  });

  assert.throws(() => copyGrantBody(grant, "bad"), RangeError);
});

test("C-0db1d5a2 copyGrants sends one post per grant in order and reports each answer", async () => {
  const { calls, api } = postFake([{ id: "grant_n1" }, refusal("arg_unknown"), { id: "grant_n3" }]);

  const outcomes = await settled(copyGrants(api, PL, KEY_OF));

  assert.deepEqual(outcomes, [
    { grantId: "grant_1", to: CP2, ok: true, newId: "grant_n1" },
    { grantId: "grant_2", to: CP2, ok: false, reason: "arg_unknown" },
    { grantId: "grant_6", to: LV2, ok: true, newId: "grant_n3" },
  ]);
  assert.deepEqual(calls, [
    {
      path: "/grants",
      body: {
        subject: { kind: "role", role: "author" },
        tool: CP2,
        scope: { kind: "any_step" },
        args: [],
      },
      opts: { headers: { "Idempotency-Key": "k-grant_1-ledger.create_payment@2" } },
    },
    {
      path: "/grants",
      body: {
        subject: { kind: "user", userId: "u_bob" },
        tool: CP2,
        scope: { kind: "any_step" },
        args: [{ arg: "amount", op: "lte", value: 100 }],
      },
      opts: { headers: { "Idempotency-Key": "k-grant_2-ledger.create_payment@2" } },
    },
    {
      path: "/grants",
      body: {
        subject: { kind: "role", role: "author" },
        tool: LV2,
        scope: { kind: "any_step" },
        args: [],
      },
      opts: { headers: { "Idempotency-Key": "k-grant_6-ledger.list_vendors@2" } },
    },
  ]);
});

test("C-0db1d5a2 copyGrants reports a refusal reason or an error code without stopping", async () => {
  const rows: [string, unknown, string][] = [
    ["a refusal without a reason", refusal(), "OPERATION_REFUSED"],
    ["a refusal with free text", refusal("Bad Reason!"), "OPERATION_REFUSED"],
    ["a refusal with a word", refusal("role_unknown"), "role_unknown"],
    [
      "an idempotency clash",
      new ApiRequestError(409, "IDEMPOTENCY_KEY_REUSED", "m"),
      "IDEMPOTENCY_KEY_REUSED",
    ],
    ["an internal failure", new ApiRequestError(500, "INTERNAL", "m"), "INTERNAL"],
    [
      "a forbidden request with a reason",
      new ApiRequestError(403, "FORBIDDEN", "m", { details: { reason: "role_unknown" } }),
      "FORBIDDEN",
    ],
    ["a network failure", new Error("boom"), "request_failed"],
    ["an empty answer", {}, "INVALID_RESPONSE"],
    ["an answer whose id is not a grant id", { id: "x" }, "INVALID_RESPONSE"],
  ];

  for (const [label, reply, reason] of rows) {
    const { api } = postFake([reply]);
    const outcomes = await settled(copyGrants(api, ONE, KEY_OF));
    assert.deepEqual(
      outcomes,
      [{ grantId: "grant_1", to: CP2, ok: false, reason }],
      label,
    );
  }
});

test("C-0db1d5a2 copyGrants sends nothing for an unusable key and for an empty plan", async () => {
  for (const badKey of ["", "has space", "k".repeat(129)]) {
    const { calls, api } = postFake([{ id: "grant_n1" }]);
    const outcomes = await settled(copyGrants(api, PL, () => badKey));
    const expected: CopyOutcome[] = [
      { grantId: "grant_1", to: CP2, ok: false, reason: "request_failed" },
      { grantId: "grant_2", to: CP2, ok: false, reason: "request_failed" },
      { grantId: "grant_6", to: LV2, ok: false, reason: "request_failed" },
    ];
    assert.deepEqual(outcomes, expected, badKey);
    assert.deepEqual(calls, [], badKey);
  }

  const empty = postFake([{ id: "grant_n1" }]);
  assert.deepEqual(
    await settled(
      copyGrants(empty.api, { copy: [], flowFirst: [], effectChanged: [] }, KEY_OF),
    ),
    [],
  );
  assert.deepEqual(empty.calls, []);
});

test("C-0db1d5a2 carryKeys reuses one key per pair and refuses a key outside the header alphabet", () => {
  let made = 0;
  const keyOf = call(() =>
    carryKeys(() => {
      made += 1;
      return `n${made}`;
    }),
  );

  assert.equal(call(() => keyOf("g1", "a@2")), "n1");
  assert.equal(call(() => keyOf("g1", "a@2")), "n1");
  assert.equal(call(() => keyOf("g1", "b@2")), "n2");
  assert.equal(call(() => keyOf("g2", "a@2")), "n3");
  assert.equal(made, 3);

  for (const bad of ["has space", "k".repeat(129), ""]) {
    const key = call(() => carryKeys(() => bad));
    assert.throws(() => key("g", "a@1"), RangeError, bad);
  }

  let other = 0;
  const keys = call(() =>
    carryKeys(() => {
      other += 1;
      return `n${other}`;
    }),
  );
  assert.equal(call(() => keys("a", "b@1")), "n1");
  assert.equal(call(() => keys("a\u0000b", "@1")), "n2");
});
