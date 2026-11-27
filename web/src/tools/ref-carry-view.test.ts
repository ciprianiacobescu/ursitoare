/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { Api } from "../admin/shared.ts";
import { ApiRequestError } from "../api/client.ts";
import {
  carryGrants,
  carryKeys,
  carryView,
  fillRefText,
  grantLabel,
  parseGrantRecord,
} from "./ref-carry.ts";
import type { CopyOutcome, CopyPlan, GrantRecord, RefChange } from "./ref-carry.ts";

assert.equal(typeof fillRefText, "function");
assert.equal(typeof grantLabel, "function");
assert.equal(typeof carryView, "function");
assert.equal(typeof carryGrants, "function");

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

const RAW_G1 = G({ id: "grant_1", tool: CP1 });
const RAW_G2 = G(
  {
    id: "grant_2",
    tool: CP1,
    subject: { kind: "user", userId: "u_bob" },
    args: [{ arg: "amount", op: "lte", value: 100 }],
  },
  "needs_reconfirm",
);
const RAW_G3 = G({
  id: "grant_3",
  tool: CP1,
  scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
});
const RAW_G4 = G({ id: "grant_4", tool: CP1, state: "revoked" }, "revoked");
const RAW_G5 = G({ id: "grant_5", tool: "acme.lookup_vendor@1" });
const RAW_G6 = G({ id: "grant_6", tool: LV1 });

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
const G6 = rec("grant_6", LV1);

const PL: CopyPlan = {
  copy: [
    { grant: G1, to: CP2 },
    { grant: G2, to: CP2 },
    { grant: G6, to: LV2 },
  ],
  flowFirst: [],
  effectChanged: [],
};

const PF: CopyPlan = { ...PL, flowFirst: [{ grant: G3, to: CP2 }] };

const OC: CopyOutcome[] = [
  { grantId: "grant_1", to: CP2, ok: true, newId: "grant_n1" },
  { grantId: "grant_2", to: CP2, ok: false, reason: "arg_unknown" },
  { grantId: "grant_6", to: LV2, ok: true, newId: "grant_n3" },
];

const EMPTY: CopyPlan = { copy: [], flowFirst: [], effectChanged: [] };

const CV1_LINES = [
  "Created ledger.create_payment@2 for role author · any step.",
  "Not created for user u_bob · any step: arg_unknown.",
  "Created ledger.list_vendors@2 for role author · any step.",
  "Update the flow first: role author · pay-run / pay (ledger.create_payment@2).",
];

const EFFECT_LINES = [
  "Effect changed: read → pay; grant it again on the Grants page: role author · any step (ledger.create_payment@2).",
  "Effect changed: read → pay; grant it again on the Grants page: role author · pay-run / pay (ledger.create_payment@2).",
];

const SIG = new AbortController().signal;

interface RecordedGet {
  path: string;
  opts: unknown;
}

interface RecordedPost {
  path: string;
  body: unknown;
  opts: unknown;
}

function fakes(
  getReplies: readonly unknown[],
  postReplies: readonly unknown[],
): { gets: RecordedGet[]; posts: RecordedPost[]; api: Api<"get" | "post"> } {
  const gets: RecordedGet[] = [];
  const posts: RecordedPost[] = [];
  let gi = 0;
  let pi = 0;
  const api = {
    get: async (path: string, opts?: unknown): Promise<unknown> => {
      gets.push({ path, opts });
      const reply = getReplies[Math.min(gi, getReplies.length - 1)];
      gi += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
    post: async (path: string, body?: unknown, opts?: unknown): Promise<unknown> => {
      posts.push({ path, body, opts });
      const reply = postReplies[Math.min(pi, postReplies.length - 1)];
      pi += 1;
      if (reply instanceof Error) throw reply;
      return reply;
    },
  } as unknown as Api<"get" | "post">;
  return { gets, posts, api };
}

function counterKeys(): (grantId: string, to: string) => string {
  let n = 0;
  return carryKeys(() => {
    n += 1;
    return `n${n}`;
  });
}

function refusal(reason: string): ApiRequestError {
  return new ApiRequestError(422, "OPERATION_REFUSED", "m", { details: { reason } });
}

test("C-1733a357 fillRefText replaces own keys once and literally", () => {
  assert.equal(
    call(() => fillRefText("Created {to} for {grant}.", { to: "a@2", grant: "role x · any step" })),
    "Created a@2 for role x · any step.",
  );
  assert.equal(
    call(() => fillRefText("Created {to} for {grant}.", { to: "a@2", grant: "$& {to} $1" })),
    "Created a@2 for $& {to} $1.",
  );
  assert.equal(
    call(() => fillRefText("{x} {constructor} {to}", { to: "a@2" })),
    "{x} {constructor} a@2",
  );
});

test("C-1733a357 grantLabel names the subject and the scope", () => {
  assert.equal(call(() => grantLabel(G1)), "role author · any step");
  assert.equal(call(() => grantLabel(G2)), "user u_bob · any step");
  assert.equal(call(() => grantLabel(G3)), "role author · pay-run / pay");
});

test("C-1733a357 carryView gives one line per outcome then the update the flow first line", () => {
  assert.deepEqual(call(() => carryView(PF, OC, true)), {
    lines: CV1_LINES,
    empty: null,
    incomplete: null,
    deploy: true,
  });
});

test("C-1733a357 carryView of nothing says no grant names the old refs", () => {
  assert.deepEqual(call(() => carryView(EMPTY, [], true)), {
    lines: [],
    empty: "No grant names the old refs.",
    incomplete: null,
    deploy: false,
  });
});

test("C-1733a357 carryView notes an incomplete read and deploys only after a created grant", () => {
  const second = OC[1];
  assert.ok(second !== undefined);
  assert.deepEqual(
    call(() => carryView({ copy: [{ grant: G2, to: CP2 }], flowFirst: [], effectChanged: [] }, [second], false)),
    {
      lines: ["Not created for user u_bob · any step: arg_unknown."],
      empty: null,
      incomplete: "Only the first 10,000 grants were read.",
      deploy: false,
    },
  );
});

test("C-1733a357 carryView refuses outcomes that do not follow the plan copy", () => {
  assert.deepEqual(call(() => carryView(PL, OC, true)).lines.length, 3);
  assert.throws(() => carryView(PL, OC.slice(0, 2), true), RangeError);
  const [a, b, c] = OC;
  assert.ok(a !== undefined && b !== undefined && c !== undefined);
  assert.throws(() => carryView(PL, [b, a, c], true), RangeError);
});

test("C-1733a357 carryView lists a changed effect and copies nothing for it", () => {
  const view = call(() =>
    carryView(
      {
        copy: [],
        flowFirst: [],
        effectChanged: [
          { grant: G1, to: CP2, effect: { from: "read", to: "pay" } },
          { grant: G3, to: CP2, effect: { from: "read", to: "pay" } },
        ],
      },
      [],
      true,
    ),
  );
  assert.deepEqual(view, { lines: EFFECT_LINES, empty: null, incomplete: null, deploy: false });
});

test("C-1733a357 carryGrants reads every page then copies and reports every grant", async () => {
  const { gets, posts, api } = fakes(
    [
      { items: [RAW_G1, RAW_G2, RAW_G3], next_cursor: "c2" },
      { items: [RAW_G4, RAW_G5, RAW_G6], next_cursor: null },
    ],
    [{ id: "grant_n1" }, refusal("arg_unknown"), { id: "grant_n3" }],
  );

  const view = await settled(carryGrants(api, CH, counterKeys(), SIG));

  assert.deepEqual(view, { lines: CV1_LINES, empty: null, incomplete: null, deploy: true });
  assert.deepEqual(gets, [
    { path: "/grants", opts: { query: { limit: 100 }, signal: SIG } },
    { path: "/grants", opts: { query: { limit: 100, cursor: "c2" }, signal: SIG } },
  ]);
  assert.deepEqual(
    posts.map((p) => (p.opts as { headers: Record<string, string> }).headers["Idempotency-Key"]),
    ["n1", "n2", "n3"],
  );
  assert.deepEqual(
    posts.map((p) => (p.body as { tool: string }).tool),
    [CP2, CP2, LV2],
  );
});

test("C-1733a357 carryGrants rejects with the read error before any post", async () => {
  const failure = new ApiRequestError(403, "FORBIDDEN", "m");
  const { posts, api } = fakes([failure], [{ id: "grant_n1" }]);

  await assert.rejects(carryGrants(api, CH, counterKeys(), SIG), (err: unknown) => err === failure);
  assert.deepEqual(posts, []);
});

test("C-1733a357 carryGrants posts nothing when no grant names an old ref", async () => {
  const { posts, api } = fakes(
    [{ items: [RAW_G5], next_cursor: null }],
    [{ id: "grant_n1" }],
  );

  const view = await settled(carryGrants(api, CH, counterKeys(), SIG));

  assert.deepEqual(view, {
    lines: [],
    empty: "No grant names the old refs.",
    incomplete: null,
    deploy: false,
  });
  assert.deepEqual(posts, []);
});

test("C-1733a357 carryGrants never copies a grant whose effect changed", async () => {
  const { posts, api } = fakes(
    [{ items: [RAW_G1, RAW_G3, RAW_G6], next_cursor: null }],
    [{ id: "grant_n3" }],
  );

  const view = await settled(carryGrants(api, CHE, counterKeys(), SIG));

  assert.deepEqual(view.lines, [
    "Created ledger.list_vendors@2 for role author · any step.",
    ...EFFECT_LINES,
  ]);
  assert.equal(view.deploy, true);
  assert.equal(posts.length, 1);
  assert.equal((posts[0]?.body as { tool: string }).tool, LV2);
});
