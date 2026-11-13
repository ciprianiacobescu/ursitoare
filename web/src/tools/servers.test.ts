/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  approvalView,
  parseToolServer,
  serverRowText,
  stateNote,
  toolRows,
  type ToolServerView,
} from "./servers.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const DP = `sha256:0123456789ab${"c".repeat(52)}`;
const DA = `sha256:fedcba987654${"d".repeat(52)}`;
const IO = { type: "object" };

function surf(): { tools: Record<string, unknown>[] } {
  return {
    tools: [
      {
        name: "lookup_vendor",
        effect: "read",
        input: IO,
        output: IO,
        untrusted_result: false,
        http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
      },
      {
        name: "create_payment",
        effect: "pay",
        input: IO,
        output: IO,
        unsafe_to_retry: true,
        http: { method: "POST", path: "/blocks/erp.create_payment@1" },
      },
    ],
  };
}

function surf2(): { tools: Record<string, unknown>[] } {
  return {
    tools: [
      {
        name: "lookup_vendor",
        effect: "write",
        input: IO,
        output: IO,
        untrusted_result: false,
        http: { method: "POST", path: "/blocks/erp.lookup_vendor@2" },
      },
      {
        name: "refund",
        effect: "pay",
        input: IO,
        output: IO,
        http: { method: "POST", path: "/blocks/erp.refund@1" },
      },
    ],
  };
}

function tools(refs: [string | null, string | null] = [null, null]): Record<string, unknown>[] {
  return [
    { name: "lookup_vendor", effect: "read", ref: refs[0] },
    { name: "create_payment", effect: "pay", ref: refs[1] },
  ];
}

function raw(): Record<string, unknown> {
  return {
    id: "acme",
    adapter: "fixture",
    origin: "https://tools.fake.test",
    local: false,
    state: "pending",
    registeredBy: "u_carol",
    registeredAt: "2026-11-06T10:00:00.000000Z",
    approvedDigest: null,
    pendingDigest: DP,
    pendingSubmittedBy: "u_carol",
    tools: tools(),
    approvedSurface: null,
    pendingSurface: surf(),
  };
}

function approvedRaw(): Record<string, unknown> {
  return {
    ...raw(),
    state: "approved",
    approvedDigest: DA,
    approvedSurface: surf(),
    pendingDigest: null,
    pendingSurface: null,
    pendingSubmittedBy: null,
    tools: tools(["acme.lookup_vendor@1", "acme.create_payment@1"]),
  };
}

function driftRaw(): Record<string, unknown> {
  return {
    ...raw(),
    state: "drifted",
    approvedDigest: DA,
    pendingSubmittedBy: "u_dave",
    tools: tools(["acme.lookup_vendor@1", "acme.create_payment@1"]),
    approvedSurface: surf(),
    pendingSurface: surf2(),
  };
}

function omit(
  source: Record<string, unknown>,
  ...keys: string[]
): Record<string, unknown> {
  return Object.fromEntries(Object.entries(source).filter(([k]) => !keys.includes(k)));
}

function listItem(): Record<string, unknown> {
  return omit(raw(), "approvedSurface", "pendingSurface");
}

const VTOOLS: ToolServerView["tools"] = [
  {
    name: "lookup_vendor",
    effect: "read",
    ref: null,
    untrusted_result: false,
    unsafe_to_retry: false,
    http: { method: "POST", path: "/blocks/erp.lookup_vendor@1" },
  },
  {
    name: "create_payment",
    effect: "pay",
    ref: null,
    untrusted_result: true,
    unsafe_to_retry: true,
    http: { method: "POST", path: "/blocks/erp.create_payment@1" },
  },
];

const VIEW: ToolServerView = {
  id: "acme",
  adapter: "fixture",
  origin: "https://tools.fake.test",
  state: "pending",
  registeredBy: "u_carol",
  pendingDigest: DP,
  approvedDigest: null,
  tools: VTOOLS,
  pendingSubmittedBy: "u_carol",
};

function flatTools(refs: [string | null, string | null]): ToolServerView["tools"] {
  return [
    {
      name: "lookup_vendor",
      effect: "read",
      ref: refs[0],
      untrusted_result: true,
      unsafe_to_retry: false,
      http: null,
    },
    {
      name: "create_payment",
      effect: "pay",
      ref: refs[1],
      untrusted_result: true,
      unsafe_to_retry: false,
      http: null,
    },
  ];
}

const REFS: [string, string] = ["acme.lookup_vendor@1", "acme.create_payment@1"];

const APPROVED_VIEW: ToolServerView = {
  ...VIEW,
  state: "approved",
  approvedDigest: DA,
  pendingDigest: null,
  pendingSubmittedBy: null,
  tools: VTOOLS.map((t, i) => ({ ...t, ref: REFS[i] ?? null })),
};

const DRIFT_VIEW: ToolServerView = {
  ...VIEW,
  state: "drifted",
  approvedDigest: DA,
  pendingSubmittedBy: "u_dave",
  tools: [
    {
      name: "lookup_vendor",
      effect: "write",
      ref: "acme.lookup_vendor@1",
      untrusted_result: false,
      unsafe_to_retry: false,
      http: { method: "POST", path: "/blocks/erp.lookup_vendor@2" },
    },
    {
      name: "refund",
      effect: "pay",
      ref: null,
      untrusted_result: true,
      unsafe_to_retry: false,
      http: { method: "POST", path: "/blocks/erp.refund@1" },
    },
  ],
};

test("C-debfaec1 RAW parses to VIEW and stays unchanged", () => {
  const input = raw();
  const before = structuredClone(input);
  assert.deepEqual(
    call(() => parseToolServer(input)),
    VIEW,
  );
  assert.deepEqual(input, before);
});

test("C-debfaec1 the submitter is read when named and null when absent", () => {
  assert.deepEqual(
    call(() => parseToolServer({ ...raw(), pendingSubmittedBy: "u_dave" })),
    { ...VIEW, pendingSubmittedBy: "u_dave" },
  );
  assert.deepEqual(
    call(() => parseToolServer(omit(raw(), "pendingSubmittedBy"))),
    { ...VIEW, pendingSubmittedBy: null },
  );
});

test("C-debfaec1 an approved server reads the approved surface with its refs", () => {
  assert.deepEqual(
    call(() => parseToolServer(approvedRaw())),
    APPROVED_VIEW,
  );
});

test("C-debfaec1 a drifted server shows the pending surface's tools only", () => {
  assert.deepEqual(
    call(() => parseToolServer(driftRaw())),
    DRIFT_VIEW,
  );
});

test("C-debfaec1 a list item and a surface that is null give the flat view", () => {
  const flat: ToolServerView = { ...VIEW, tools: flatTools([null, null]) };
  assert.deepEqual(
    call(() => parseToolServer(listItem())),
    flat,
  );
  assert.deepEqual(
    call(() => parseToolServer({ ...raw(), pendingSurface: null, approvedSurface: null })),
    flat,
  );
});

test("C-debfaec1 an approve answer without surfaces gives the flat approved view", () => {
  const accepted = omit(approvedRaw(), "approvedSurface", "pendingSurface");
  assert.deepEqual(
    call(() => parseToolServer(accepted)),
    {
      ...VIEW,
      state: "approved",
      approvedDigest: DA,
      pendingDigest: null,
      pendingSubmittedBy: null,
      tools: flatTools(REFS),
    },
  );
});

function withTool(patch: Record<string, unknown>): Record<string, unknown> {
  return { ...raw(), tools: [{ name: "lookup_vendor", effect: "read", ref: null, ...patch }] };
}

function withSurfaceTool(patch: Record<string, unknown>): Record<string, unknown> {
  return {
    ...raw(),
    pendingSurface: { tools: [{ ...(surf().tools[0] as Record<string, unknown>), ...patch }] },
  };
}

function manyTools(n: number): Record<string, unknown>[] {
  return Array.from({ length: n }, (_, i) => ({
    name: `t${String(i)}`,
    effect: "read",
    ref: null,
  }));
}

const MALFORMED: [string, unknown][] = [
  ["null", null],
  ["string", "x"],
  ["array", []],
  ["number", 5],
  ["id Acme", { ...raw(), id: "Acme" }],
  ["id proto", { ...raw(), id: "__proto__" }],
  ["adapter soap", { ...raw(), adapter: "soap" }],
  ["state gone", { ...raw(), state: "gone" }],
  ["origin empty", { ...raw(), origin: "" }],
  ["registeredBy number", { ...raw(), registeredBy: 5 }],
  ["pendingDigest short", { ...raw(), pendingDigest: "sha256:abc" }],
  ["approvedDigest missing", omit(raw(), "approvedDigest")],
  ["tools string", { ...raw(), tools: "x" }],
  ["tool named Bad", withTool({ name: "Bad" })],
  ["effect delete", withTool({ effect: "delete" })],
  ["ref acme", withTool({ ref: "acme" })],
  ["101 tools", { ...raw(), tools: manyTools(101) }],
  ["submitter number", { ...raw(), pendingSubmittedBy: 5 }],
  ["submitter empty", { ...raw(), pendingSubmittedBy: "" }],
  ["untrusted_result no", withSurfaceTool({ untrusted_result: "no" })],
  ["http without path", withSurfaceTool({ http: { method: "POST" } })],
  ["pendingSurface number", { ...raw(), pendingSurface: 5 }],
  ["pendingSurface tools string", { ...raw(), pendingSurface: { tools: "x" } }],
];

test("C-debfaec1 the 23 malformed values give null and RAW still parses", () => {
  assert.equal(MALFORMED.length, 23);
  assert.notEqual(
    call(() => parseToolServer(raw())),
    null,
    "a valid server is not null",
  );
  for (const [label, value] of MALFORMED) {
    assert.equal(
      call(() => parseToolServer(value)),
      null,
      label,
    );
  }
});

test("C-debfaec1 the row text joins id, origin and state", () => {
  assert.equal(
    call(() => serverRowText(VIEW)),
    "acme · https://tools.fake.test · pending",
  );
  assert.equal(
    call(() => serverRowText(APPROVED_VIEW)),
    "acme · https://tools.fake.test · approved",
  );
});

test("C-debfaec1 the tool rows show block, result and call", () => {
  assert.deepEqual(
    call(() => toolRows(VIEW)),
    [
      {
        name: "lookup_vendor",
        effect: "read",
        block: "—",
        result: "trusted",
        call: "POST /blocks/erp.lookup_vendor@1",
      },
      {
        name: "create_payment",
        effect: "pay",
        block: "—",
        result: "untrusted",
        call: "POST /blocks/erp.create_payment@1",
      },
    ],
  );
  assert.deepEqual(
    call(() => toolRows(APPROVED_VIEW)).map((r) => r.block),
    REFS,
  );
});

test("C-debfaec1 the flat and drifted tool rows", () => {
  const flat = call(() => toolRows({ ...VIEW, tools: flatTools([null, null]) }));
  assert.deepEqual(
    flat.map((r) => [r.block, r.result, r.call]),
    [
      ["—", "untrusted", "—"],
      ["—", "untrusted", "—"],
    ],
  );
  assert.deepEqual(
    call(() => toolRows(DRIFT_VIEW)),
    [
      {
        name: "lookup_vendor",
        effect: "write",
        block: "acme.lookup_vendor@1",
        result: "trusted",
        call: "POST /blocks/erp.lookup_vendor@2",
      },
      {
        name: "refund",
        effect: "pay",
        block: "—",
        result: "untrusted",
        call: "POST /blocks/erp.refund@1",
      },
    ],
  );
});

test("C-debfaec1 the state note names the short digests", () => {
  assert.equal(
    call(() => stateNote(VIEW)),
    "This server has not been approved. Its tools cannot be used yet. Pending surface 0123456789ab.",
  );
  assert.equal(
    call(() => stateNote({ ...VIEW, state: "drifted", approvedDigest: DA })),
    "The surface changed after it was approved. Its tools stop working until the new surface is approved. Approved surface fedcba987654, pending surface 0123456789ab. The table lists the pending surface.",
  );
  assert.equal(
    call(() => stateNote(APPROVED_VIEW)),
    null,
  );
});

const CAROL = { userId: "u_carol", reviewProfile: "solo" } as const;
const TEAM = { userId: "u_carol", reviewProfile: "team" } as const;
const MINE: ToolServerView = { ...VIEW, registeredBy: "u_erin", pendingSubmittedBy: "u_carol" };
const OTHER: ToolServerView = { ...VIEW, pendingSubmittedBy: "u_dave" };
const NONE: ToolServerView = APPROVED_VIEW;
const DRIFT: ToolServerView = { ...OTHER, state: "drifted", approvedDigest: DA };
const UNKNOWN: ToolServerView = { ...VIEW, pendingSubmittedBy: null };

const ALLOWED = { canApprove: true, selfApproval: false, message: null };

test("C-464ddcf9 nothing pending cannot be approved in either profile", () => {
  const expected = { canApprove: false, selfApproval: false, message: "Nothing to approve." };
  assert.deepEqual(
    call(() => approvalView(NONE, TEAM)),
    expected,
  );
  assert.deepEqual(
    call(() => approvalView(NONE, CAROL)),
    expected,
  );
});

test("C-464ddcf9 the submitter is blocked in a team tenant", () => {
  assert.deepEqual(
    call(() => approvalView(MINE, TEAM)),
    {
      canApprove: false,
      selfApproval: false,
      message: "Another admin must approve this surface.",
    },
  );
});

test("C-464ddcf9 the submitter self-approves in a solo tenant", () => {
  assert.deepEqual(
    call(() => approvalView(MINE, CAROL)),
    {
      canApprove: true,
      selfApproval: true,
      message:
        "You submitted this surface. Approving it is recorded as a self-approval.",
    },
  );
});

test("C-464ddcf9 another submitter, a drift and an unknown submitter are allowed", () => {
  assert.deepEqual(
    call(() => approvalView(OTHER, TEAM)),
    ALLOWED,
  );
  assert.deepEqual(
    call(() => approvalView(OTHER, CAROL)),
    ALLOWED,
  );
  assert.deepEqual(
    call(() => approvalView(DRIFT, TEAM)),
    ALLOWED,
  );
  assert.deepEqual(
    call(() => approvalView(UNKNOWN, TEAM)),
    ALLOWED,
  );
  assert.deepEqual(
    call(() => approvalView(UNKNOWN, CAROL)),
    ALLOWED,
  );
});
