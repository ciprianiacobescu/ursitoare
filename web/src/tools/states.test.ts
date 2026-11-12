/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { actionState, regionState } from "./pages.ts";
import type { ActionPhase, RegionLoad } from "./pages.ts";
import { approveControl, parseToolServer } from "./servers.ts";
import type { ToolServerView } from "./servers.ts";

assert.equal(typeof regionState, "function");
assert.equal(typeof actionState, "function");
assert.equal(typeof approveControl, "function");

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
const CAROL = { userId: "u_carol", reviewProfile: "solo" } as const;
const TEAM = { userId: "u_carol", reviewProfile: "team" } as const;
const error = new ApiRequestError(404, "NOT_FOUND", "m");
const EMPTY = (v: ToolServerView): boolean => v.tools.length === 0;

function server(over: Record<string, unknown> = {}): ToolServerView {
  const view = parseToolServer({
    id: "acme",
    adapter: "fixture",
    origin: "https://tools.fake.test",
    state: "pending",
    registeredBy: "u_erin",
    approvedDigest: null,
    pendingDigest: DP,
    pendingSubmittedBy: "u_carol",
    tools: [{ name: "lookup_vendor", effect: "read", ref: null }],
    ...over,
  });
  assert.ok(view !== null, "the fixture parses");
  return view;
}

const VIEW = server();
const MINE = server();
const OTHER = server({ pendingSubmittedBy: "u_dave" });
const UNKNOWN = server({ pendingSubmittedBy: null });
const NONE = server({
  state: "approved",
  approvedDigest: DA,
  pendingDigest: null,
  pendingSubmittedBy: null,
});

test("C-4c2144fe regionState maps the loading error ready and empty rows", () => {
  assert.deepEqual(call(() => regionState({ phase: "loading" })), {
    view: "loading",
    actionsDisabled: true,
  });
  assert.deepEqual(call(() => regionState({ phase: "error", error })), {
    view: "error",
    actionsDisabled: true,
  });
  assert.deepEqual(call(() => regionState({ phase: "ready", value: VIEW }, EMPTY)), {
    view: "ready",
    actionsDisabled: false,
  });
  assert.deepEqual(
    call(() => regionState({ phase: "ready", value: { ...VIEW, tools: [] } }, EMPTY)),
    { view: "empty", actionsDisabled: false },
  );
  assert.deepEqual(
    call(() =>
      regionState(
        { phase: "ready", value: { version: null, source: "", pendingGrants: 0 } },
        (v) => v.version === null,
      ),
    ),
    { view: "empty", actionsDisabled: false },
  );
});

test("C-4c2144fe an unknown region phase is a RangeError", () => {
  const gone = { phase: "gone" } as unknown as RegionLoad<ToolServerView>;
  assert.throws(() => regionState(gone), RangeError, "an unknown phase is refused");
});

test("C-4c2144fe actionState maps the idle busy done and failed rows", () => {
  assert.deepEqual(call(() => actionState({ phase: "idle" })), {
    disabled: false,
    status: null,
  });
  assert.deepEqual(call(() => actionState({ phase: "busy" })), {
    disabled: true,
    status: null,
  });
  assert.deepEqual(call(() => actionState({ phase: "done", text: "Grant created." })), {
    disabled: false,
    status: { role: "status", text: "Grant created." },
  });
  assert.deepEqual(call(() => actionState({ phase: "failed", text: "That role does not exist." })), {
    disabled: false,
    status: { role: "alert", text: "That role does not exist." },
  });
});

test("C-4c2144fe an unknown action phase and an empty text are RangeErrors", () => {
  const gone = { phase: "gone" } as unknown as ActionPhase;
  assert.throws(() => actionState(gone), RangeError, "an unknown phase is refused");
  assert.throws(
    () => actionState({ phase: "done", text: "" }),
    RangeError,
    "an empty done text is refused",
  );
});

test("C-4c2144fe approveControl is disabled without a server or a session", () => {
  const off = { disabled: true, selfApproval: false, message: null };
  assert.deepEqual(call(() => approveControl(null, CAROL, false)), off);
  assert.deepEqual(call(() => approveControl(VIEW, null, false)), off);
});

test("C-4c2144fe approveControl allows another submitter and is disabled while busy", () => {
  const allowed = { disabled: false, selfApproval: false, message: null };
  assert.deepEqual(call(() => approveControl(OTHER, TEAM, false)), allowed);
  assert.deepEqual(call(() => approveControl(OTHER, TEAM, true)), {
    ...allowed,
    disabled: true,
  });
  assert.deepEqual(call(() => approveControl(UNKNOWN, TEAM, false)), allowed);
});

test("C-4c2144fe approveControl follows the approvalView for a submitter and nothing pending", () => {
  assert.deepEqual(call(() => approveControl(MINE, TEAM, false)), {
    disabled: true,
    selfApproval: false,
    message: "Another admin must approve this surface.",
  });
  assert.deepEqual(call(() => approveControl(MINE, CAROL, false)), {
    disabled: false,
    selfApproval: true,
    message: "You submitted this surface. Approving it is recorded as a self-approval.",
  });
  assert.deepEqual(call(() => approveControl(NONE, CAROL, false)), {
    disabled: true,
    selfApproval: false,
    message: "Nothing to approve.",
  });
});
