/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { grantBody, parseGrant, type GrantDraft } from "./grants.ts";

const ID128 = "a" + "b".repeat(127);
const ID129 = ID128 + "b";
const ID1024 = "a" + "b".repeat(1023);

function rec(nodeId: string): Record<string, unknown> {
  return {
    grant: {
      id: "grant_1",
      subject: { kind: "role", role: "author" },
      tool: "acme.create_payment@1",
      scope: { kind: "node", flowId: "pay-run", nodeId },
      args: [],
    },
    status: "active",
  };
}

function draft(nodeId: string): GrantDraft {
  return {
    subjectKind: "role",
    subject: "author",
    tool: "acme.create_payment@1",
    scopeKind: "node",
    flowId: "pay-run",
    nodeId,
  };
}

const STEP_TEXT =
  "A step id is lowercase letters, digits and underscores, starting with a letter.";

function body128(): unknown {
  return {
    subject: { kind: "role", role: "author" },
    tool: "acme.create_payment@1",
    scope: { kind: "node", flowId: "pay-run", nodeId: ID128 },
    args: [],
  };
}

test("C-a714f000 parseGrant accepts a step id of 128 characters and refuses 129 and 1024", () => {
  const ok = parseGrant(rec(ID128));
  assert.ok(ok !== null);
  assert.equal(ok.scope, `pay-run / ${ID128}`);
  assert.equal(parseGrant(rec(ID129)), null);
  assert.equal(parseGrant(rec(ID1024)), null);
});

test("C-a714f000 grantBody accepts a step id of 128 characters and refuses 129 and 1024", () => {
  assert.deepEqual(grantBody(draft(ID128)), { ok: true, body: body128() });
  assert.deepEqual(grantBody(draft(" " + ID128 + " ")), { ok: true, body: body128() });
  const refusal = { ok: false, field: "nodeId", message: STEP_TEXT };
  assert.deepEqual(grantBody(draft(ID129)), refusal);
  assert.deepEqual(grantBody(draft(ID1024)), refusal);
});
