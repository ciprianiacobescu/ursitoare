/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import { registerToolMessages, toolsErrorMessage } from "./messages.ts";
import {
  approveDialog,
  approveFailure,
  approveRequest,
  ownBoxShown,
  parseToolServer,
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
const TICK = 'Tick "I approve my own surface" to approve a surface you submitted.';
const ME = { userId: "u_carol", reviewProfile: "solo" } as const;
const TEAM_ME = { userId: "u_carol", reviewProfile: "team" } as const;

function server(over: Record<string, unknown>): ToolServerView {
  const view = parseToolServer({
    id: "acme",
    adapter: "fixture",
    origin: "https://tools.fake.test",
    state: "pending",
    registeredBy: "u_erin",
    approvedDigest: null,
    pendingDigest: DP,
    pendingSubmittedBy: "u_carol",
    tools: [],
    ...over,
  });
  assert.ok(view !== null, "the fixture parses");
  return view;
}

function refused(reason: unknown): ApiRequestError {
  return new ApiRequestError(422, "OPERATION_REFUSED", "m", { details: { reason } });
}

const MINE = (): ToolServerView => server({});
const UNKNOWN = (): ToolServerView => server({ pendingSubmittedBy: null });
const NONE = (): ToolServerView =>
  server({ state: "approved", approvedDigest: DA, pendingDigest: null, pendingSubmittedBy: null });

test("C-4f5443ee approveRequest asks for the tick of a surface the approver submitted", () => {
  assert.doesNotThrow(() => {
    registerToolMessages();
  });
  assert.deepEqual(call(() => approveRequest(MINE(), ME, { ticked: false, ownSurface: false })), {
    ok: false,
    message: TICK,
  });
  assert.deepEqual(call(() => approveRequest(MINE(), ME, { ticked: true, ownSurface: false })), {
    ok: true,
    body: { digest: DP, selfApproval: true },
  });
});

test("C-4f5443ee approveRequest with an unknown submitter shows the box only for an own surface", () => {
  assert.doesNotThrow(() => {
    registerToolMessages();
  });
  assert.deepEqual(call(() => approveRequest(UNKNOWN(), ME, { ticked: false, ownSurface: false })), {
    ok: true,
    body: { digest: DP, selfApproval: false },
  });
  assert.deepEqual(call(() => approveRequest(UNKNOWN(), ME, { ticked: false, ownSurface: true })), {
    ok: false,
    message: TICK,
  });
  assert.deepEqual(call(() => approveRequest(UNKNOWN(), ME, { ticked: true, ownSurface: true })), {
    ok: true,
    body: { digest: DP, selfApproval: true },
  });
});

test("C-4f5443ee approveRequest refuses with the approvalView message", () => {
  assert.deepEqual(call(() => approveRequest(server({}), TEAM_ME, { ticked: true, ownSurface: false })), {
    ok: false,
    message: "Another admin must approve this surface.",
  });
  assert.deepEqual(call(() => approveRequest(NONE(), ME, { ticked: true, ownSurface: false })), {
    ok: false,
    message: "Nothing to approve.",
  });
});

test("C-4f5443ee ownBoxShown is selfApproval or ownSurface", () => {
  assert.equal(call(() => ownBoxShown({ selfApproval: false }, false)), false);
  assert.equal(call(() => ownBoxShown({ selfApproval: true }, false)), true);
  assert.equal(call(() => ownBoxShown({ selfApproval: false }, true)), true);
  assert.equal(call(() => ownBoxShown({ selfApproval: true }, true)), true);
});

test("C-4f5443ee approveDialog names the short digest and is null with nothing pending", () => {
  assert.deepEqual(call(() => approveDialog(MINE())), {
    title: "Approve surface 0123456789ab?",
    description: "Once approved, the tools of acme can be used in flows that grants allow.",
    action: "Approve surface",
  });
  assert.equal(approveDialog(NONE()), null);
});

test("C-4f5443ee approveFailure carries ownSurface and reload for the four approval reasons", () => {
  assert.doesNotThrow(() => {
    registerToolMessages();
  });
  const rows: [string, string, boolean, boolean][] = [
    [
      "self_approval_required",
      'You submitted this surface. Tick "I approve my own surface" to approve it.',
      true,
      false,
    ],
    ["approver_is_submitter", "Another admin must approve this surface.", false, false],
    [
      "digest_mismatch",
      "The surface changed while you were reading it. Reload the page and review it again.",
      false,
      true,
    ],
    ["nothing_pending", "Nothing to approve.", false, true],
  ];
  for (const [reason, message, ownSurface, reload] of rows) {
    assert.deepEqual(call(() => approveFailure(refused(reason))), { message, ownSurface, reload });
  }
});

test("C-4f5443ee approveFailure falls back to the kit text for other errors", () => {
  assert.doesNotThrow(() => {
    registerToolMessages();
  });
  const fallback = "The engine refused this operation.";
  const plain = { ownSurface: false, reload: false };
  assert.deepEqual(call(() => approveFailure(refused("weird"))), { message: fallback, ...plain });
  assert.deepEqual(call(() => approveFailure(refused("__proto__"))), { message: fallback, ...plain });
  assert.deepEqual(
    call(() => approveFailure(new ApiRequestError(422, "OPERATION_REFUSED", "m"))),
    { message: fallback, ...plain },
  );
  const forbidden = new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_1" } });
  assert.deepEqual(call(() => approveFailure(forbidden)), {
    message: `${errorPanelModel(forbidden).message} Decision id: dec_1`,
    ...plain,
  });
  const notFound = new ApiRequestError(404, "NOT_FOUND", "m");
  assert.deepEqual(call(() => approveFailure(notFound)), {
    message: errorPanelModel(notFound).message,
    ...plain,
  });
  const other = new Error("x");
  assert.deepEqual(call(() => approveFailure(other)), {
    message: errorPanelModel(other).message,
    ...plain,
  });
});

test("C-4f5443ee toolsErrorMessage gives each of the 13 reasons its text", () => {
  assert.doesNotThrow(() => {
    registerToolMessages();
  });
  const rows: [string, string][] = [
    ["nothing_pending", "Nothing to approve."],
    [
      "digest_mismatch",
      "The surface changed while you were reading it. Reload the page and review it again.",
    ],
    ["approver_is_submitter", "Another admin must approve this surface."],
    [
      "self_approval_required",
      'You submitted this surface. Tick "I approve my own surface" to approve it.',
    ],
    ["role_unknown", "That role does not exist."],
    ["user_unknown", "That user does not exist."],
    ["tool_unknown", "That tool is not in the registry."],
    ["flow_unknown", "That flow does not exist."],
    ["version_not_validated", "That flow has no validated version yet."],
    ["node_unknown", "That flow has no such step."],
    ["not_node_scoped", "Only a grant for one step can be confirmed."],
    ["revoked", "That grant is revoked."],
    ["policy_invalid", "The policy is not valid."],
  ];
  assert.equal(rows.length, 13);
  for (const [reason, text] of rows) {
    assert.equal(call(() => toolsErrorMessage(refused(reason))), text);
  }
});
