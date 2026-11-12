/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  GRANT_DONE,
  grantActions,
  grantBody,
  grantRowText,
  parseGrant,
  type GrantDraft,
  type GrantView,
} from "./grants.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function rec(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "grant_1",
    subject: { kind: "role", role: "author" },
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
    args: [],
    fingerprints: ["nf1_" + "a".repeat(64)],
    state: "active",
    createdBy: "u_carol",
    createdAt: "2026-11-06T10:00:00.000000Z",
    revokedBy: null,
    revokedAt: null,
    ...over,
  };
}

function item(over: Record<string, unknown>, status: string): unknown {
  return { grant: rec(over), status };
}

const ROWS: {
  name: string;
  raw: unknown;
  view: GrantView;
  text: string;
  actions: { revoke: boolean; confirm: boolean };
}[] = [
  {
    name: "needs_reconfirm node grant",
    raw: item({}, "needs_reconfirm"),
    view: {
      id: "grant_1",
      subject: "role author",
      tool: "acme.create_payment@1",
      scope: "pay-run / pay",
      status: "needs_reconfirm",
    },
    text: "role author · acme.create_payment@1 · pay-run / pay · needs_reconfirm",
    actions: { revoke: true, confirm: true },
  },
  {
    name: "user any-step grant",
    raw: item(
      {
        id: "grant_2",
        subject: { kind: "user", userId: "u_bob" },
        tool: "acme.lookup_vendor@1",
        scope: { kind: "any_step" },
      },
      "active",
    ),
    view: {
      id: "grant_2",
      subject: "user u_bob",
      tool: "acme.lookup_vendor@1",
      scope: "any step",
      status: "active",
    },
    text: "user u_bob · acme.lookup_vendor@1 · any step · active",
    actions: { revoke: true, confirm: false },
  },
  {
    name: "revoked grant",
    raw: item({ id: "grant_3", state: "revoked" }, "revoked"),
    view: {
      id: "grant_3",
      subject: "role author",
      tool: "acme.create_payment@1",
      scope: "pay-run / pay",
      status: "revoked",
    },
    text: "role author · acme.create_payment@1 · pay-run / pay · revoked",
    actions: { revoke: false, confirm: false },
  },
  {
    name: "longest role",
    raw: item({ id: "grant_4", subject: { kind: "role", role: "a" + "9".repeat(31) } }, "active"),
    view: {
      id: "grant_4",
      subject: "role a" + "9".repeat(31),
      tool: "acme.create_payment@1",
      scope: "pay-run / pay",
      status: "active",
    },
    text: "role a" + "9".repeat(31) + " · acme.create_payment@1 · pay-run / pay · active",
    actions: { revoke: true, confirm: false },
  },
  {
    name: "longest user id",
    raw: item(
      {
        id: "grant_5",
        subject: { kind: "user", userId: "Ab_-".repeat(16) },
        scope: { kind: "node", flowId: "pay-run-2", nodeId: "pay_2" },
      },
      "active",
    ),
    view: {
      id: "grant_5",
      subject: "user " + "Ab_-".repeat(16),
      tool: "acme.create_payment@1",
      scope: "pay-run-2 / pay_2",
      status: "active",
    },
    text: "user " + "Ab_-".repeat(16) + " · acme.create_payment@1 · pay-run-2 / pay_2 · active",
    actions: { revoke: true, confirm: false },
  },
];

const MALFORMED: [string, unknown][] = [
  ["null", null],
  ["number", 5],
  ["array", []],
  ["empty object", {}],
  ["no status", { grant: rec() }],
  ["status gone", item({}, "gone")],
  ["id g1", item({ id: "g1" }, "active")],
  ["tool Acme", item({ tool: "Acme" }, "active")],
  ["subject kind team", item({ subject: { kind: "team", role: "author" } }, "active")],
  ["role without name", item({ subject: { kind: "role" } }, "active")],
  ["node without step", item({ scope: { kind: "node", flowId: "pay-run" } }, "active")],
  ["scope kind flow", item({ scope: { kind: "flow" } }, "active")],
  ["user id with NUL", item({ subject: { kind: "user", userId: "a\u0000b" } }, "active")],
  ["role Author", item({ subject: { kind: "role", role: "Author" } }, "active")],
  ["user id a/b", item({ subject: { kind: "user", userId: "a/b" } }, "active")],
  ["flow Pay", item({ scope: { kind: "node", flowId: "Pay", nodeId: "pay" } }, "active")],
  ["step a-b", item({ scope: { kind: "node", flowId: "pay-run", nodeId: "a-b" } }, "active")],
  ["flat record", { ...rec(), status: "active" }],
];

for (const row of ROWS) {
  test(`C-228ef9c6 parseGrant reads the ${row.name} into its view`, () => {
    assert.deepEqual(
      call(() => parseGrant(row.raw)),
      row.view,
    );
  });
  test(`C-228ef9c6 grantRowText and grantActions read the ${row.name}`, () => {
    assert.equal(
      call(() => grantRowText(row.view)),
      row.text,
    );
    assert.deepEqual(
      call(() => grantActions(row.view)),
      row.actions,
    );
  });
}

test("C-228ef9c6 parseGrant gives null for each of the malformed items and the flat record", () => {
  assert.equal(MALFORMED.length, 18);
  assert.ok(parseGrant !== undefined);
  assert.notEqual(
    call(() => parseGrant(ROWS[0]?.raw)),
    null,
  );
  for (const [name, raw] of MALFORMED) {
    assert.equal(
      call(() => parseGrant(raw)),
      null,
      name,
    );
  }
});

test("C-228ef9c6 parseGrant ignores other members and leaves its input unchanged", () => {
  const raw = item({ extra: { deep: 1 } }, "active");
  const before = JSON.stringify(raw);
  assert.deepEqual(
    call(() => parseGrant(raw)),
    {
      id: "grant_1",
      subject: "role author",
      tool: "acme.create_payment@1",
      scope: "pay-run / pay",
      status: "active",
    },
  );
  assert.equal(JSON.stringify(raw), before);
});

test("C-228ef9c6 GRANT_DONE holds the three outcome texts", () => {
  assert.deepEqual(GRANT_DONE, {
    created: "Grant created.",
    revoked: "Grant revoked.",
    confirmed: "Grant confirmed for the newest version.",
  });
});

const BASE: GrantDraft = {
  subjectKind: "role",
  subject: "author",
  tool: "acme.lookup_vendor@1",
  scopeKind: "any_step",
  flowId: "",
  nodeId: "",
};

const ROLE_ANY = {
  subject: { kind: "role", role: "author" },
  tool: "acme.lookup_vendor@1",
  scope: { kind: "any_step" },
  args: [],
};

const ROLE_TEXT = "A role is lowercase letters, digits and underscores, starting with a letter.";
const USER_TEXT = "A user id has 1 to 64 letters, digits, underscores and hyphens.";
const FLOW_TEXT = "A flow name is lowercase words joined by hyphens, up to 64 characters.";
const STEP_TEXT =
  "A step id is lowercase letters, digits and underscores, starting with a letter.";

function refusal(field: string, message: string): unknown {
  return { ok: false, field, message };
}

test("C-35974302 grantBody builds the role body and ignores flow and step for any step", () => {
  assert.deepEqual(
    call(() => grantBody(BASE)),
    { ok: true, body: ROLE_ANY },
  );
  assert.deepEqual(
    call(() => grantBody({ ...BASE, flowId: "Bad Flow", nodeId: "9" })),
    { ok: true, body: ROLE_ANY },
  );
});

test("C-35974302 grantBody trims a user and builds a node scope", () => {
  assert.deepEqual(
    call(() => grantBody({ ...BASE, subjectKind: "user", subject: " u_bob " })),
    { ok: true, body: { ...ROLE_ANY, subject: { kind: "user", userId: "u_bob" } } },
  );
  assert.deepEqual(
    call(() =>
      grantBody({
        ...BASE,
        tool: "acme.create_payment@1",
        scopeKind: "node",
        flowId: " pay-run ",
        nodeId: " pay ",
      }),
    ),
    {
      ok: true,
      body: {
        ...ROLE_ANY,
        tool: "acme.create_payment@1",
        scope: { kind: "node", flowId: "pay-run", nodeId: "pay" },
      },
    },
  );
});

test("C-35974302 grantBody refuses a blank or malformed subject", () => {
  assert.deepEqual(
    call(() => grantBody({ ...BASE, subject: "  " })),
    refusal("subject", "Enter a role."),
  );
  assert.deepEqual(
    call(() => grantBody({ ...BASE, subjectKind: "user", subject: "" })),
    refusal("subject", "Enter a user id."),
  );
  for (const subject of ["Author", "__proto__"]) {
    assert.deepEqual(
      call(() => grantBody({ ...BASE, subject })),
      refusal("subject", ROLE_TEXT),
    );
  }
  assert.deepEqual(
    call(() => grantBody({ ...BASE, subjectKind: "user", subject: "a/b" })),
    refusal("subject", USER_TEXT),
  );
});

test("C-35974302 grantBody refuses a missing or malformed tool and keeps the stored-tool bound", () => {
  assert.deepEqual(
    call(() => grantBody({ ...BASE, tool: "" })),
    refusal("tool", "Choose a tool."),
  );
  for (const tool of ["lookup", "acme.lookup_vendor@1000000000", "acme.lookup_vendor@01"]) {
    assert.deepEqual(
      call(() => grantBody({ ...BASE, tool })),
      refusal("tool", "Choose a tool from the list."),
      tool,
    );
  }
  assert.deepEqual(
    call(() => grantBody({ ...BASE, tool: "acme.lookup_vendor@999999999" })),
    { ok: true, body: { ...ROLE_ANY, tool: "acme.lookup_vendor@999999999" } },
  );
});

test("C-35974302 grantBody refuses a malformed flow or step for one step", () => {
  const node: GrantDraft = { ...BASE, scopeKind: "node", flowId: "pay-run", nodeId: "pay" };
  assert.deepEqual(
    call(() => grantBody({ ...node, flowId: "" })),
    refusal("flowId", "Enter the flow."),
  );
  for (const flowId of ["Pay", "a".repeat(65)]) {
    assert.deepEqual(
      call(() => grantBody({ ...node, flowId })),
      refusal("flowId", FLOW_TEXT),
    );
  }
  assert.deepEqual(
    call(() => grantBody({ ...node, nodeId: "" })),
    refusal("nodeId", "Enter the step."),
  );
  assert.deepEqual(
    call(() => grantBody({ ...node, nodeId: "a-b" })),
    refusal("nodeId", STEP_TEXT),
  );
});
