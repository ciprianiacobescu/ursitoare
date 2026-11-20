/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { CapabilityState } from "../kit/capabilities.ts";
import type { RunView } from "../runs/types.ts";
import { homeView, recentRunLinkName, runRows } from "./home.ts";

const NOW = Date.UTC(2026, 10, 18, 12, 0, 0);
const HASH = "sha256:" + "ab".repeat(32);

function run(
  idTail: string,
  flowId: string,
  state: RunView["state"],
  userId: string,
  startedAt: string | null,
  endedAt: string | null,
  createdAt: string,
): RunView {
  return {
    id: `run_01a1eb${idTail}`,
    flowId,
    flowHash: HASH,
    mode: "mock",
    trigger: "test",
    state,
    ownerTeam: "finance",
    principal: { userId, kind: "human" },
    terminalNode: null,
    error: null,
    inputRef: null,
    outputRef: null,
    createdAt,
    startedAt,
    endedAt,
  };
}

const R1 = run("72-3179-7000-a94d-6c6eaf5d03ac", "demo-pay", "completed", "usr_me", "2026-11-18T11:56:40Z", "2026-11-18T11:56:41.400Z", "2026-11-18T11:56:35Z");
const R2 = run("70-0000-7000-8000-00000000be11", "demo-grants", "failed", "usr_bob", "2026-11-18T09:55:00Z", "2026-11-18T09:56:15Z", "2026-11-18T09:54:50Z");
const R3 = run("6f-0000-7000-8000-00000000cafe", "demo-pay", "queued", "usr_bob", null, null, "2026-11-17T12:00:00Z");
const R4 = run("6e-0000-7000-8000-00000000f00d", "demo-pay", "running", "usr_ghost", "2026-11-18T11:59:50Z", null, "2026-11-18T11:59:49Z");
const R5 = run("6d-0000-7000-8000-00000000d00d", "demo-pay", "cancelled", "usr_pad", "2026-11-18T11:00:00Z", "2026-11-18T11:00:00.300Z", "2026-11-18T10:59:59Z");
const R6 = run("6c-0000-7000-8000-00000000a001", "demo-pay", "completed", "usr_me", "2026-11-18T10:00:00Z", "2026-11-18T10:00:01Z", "2026-11-18T10:00:00Z");
const R7 = run("6b-0000-7000-8000-00000000a002", "demo-pay", "completed", "usr_me", "2026-11-18T09:00:00Z", "2026-11-18T10:30:00Z", "2026-11-18T09:00:00Z");

test("C-f82b7f78 runRows keeps five runs with their badge, time, duration and name", () => {
  assert.equal(typeof runRows, "function");
  const names = new Map([
    ["usr_bob", "Bob Example"],
    ["usr_pad", "   "],
  ]);
  const rows = runRows([R1, R2, R3, R4, R5, R6, R7], { nowMs: NOW, meId: "usr_me", names });
  assert.deepEqual(
    rows.map((r) => [r.shortId, r.tone, r.started, r.exact, r.duration, r.by]),
    [
      ["af5d03ac", "success", "3 min ago", "2026-11-18 11:56 UTC", "1.4 s", "by you"],
      ["0000be11", "danger", "2 h ago", "2026-11-18 09:55 UTC", "1 min 15 s", "by Bob Example"],
      ["0000cafe", "neutral", "1 d ago", "2026-11-17 12:00 UTC", "—", "by Bob Example"],
      ["0000f00d", "info", "just now", "2026-11-18 11:59 UTC", "10.0 s", null],
      ["0000d00d", "neutral", "1 h ago", "2026-11-18 11:00 UTC", "<1 s", null],
    ],
  );
  assert.equal(rows[0]?.href, `/runs/${R1.id}`);
  assert.equal(rows[0]?.startedIso, "2026-11-18T11:56:40.000000Z");
  assert.equal(rows[0]?.state, "completed");
  assert.equal(rows[0]?.flowId, "demo-pay");
  assert.deepEqual(runRows([], { nowMs: NOW, meId: "usr_me", names }), []);
});

test("C-f82b7f78 recentRunLinkName names the run by its last eight characters", () => {
  assert.equal(typeof recentRunLinkName, "function");
  assert.doesNotThrow(() => {
    assert.equal(recentRunLinkName({ id: R1.id, flowId: "demo-pay" }), "Run af5d03ac of demo-pay");
    assert.equal(
      recentRunLinkName({ id: "run_01a1eb72-3179-7000-a94d-6c6eaf5d03ad", flowId: "demo-pay" }),
      "Run af5d03ad of demo-pay",
    );
    assert.equal(recentRunLinkName({ id: "r1", flowId: "x-y" }), "Run r1 of x-y");
  });
});

test("C-48588514 homeView shows the dashboard only for a ready session", () => {
  assert.equal(typeof homeView, "function");
  const ready: CapabilityState = {
    status: "ready",
    me: {
      user: { id: "usr_me", displayName: "Alice Example", email: null },
      tenant: { id: "ten_a", name: "Acme", reviewProfile: "solo" },
      capabilities: new Set(["read_self", "read_run"]),
      csrfToken: "x",
    },
  };
  assert.deepEqual(homeView(null), { kind: "public" });
  assert.deepEqual(homeView({ status: "signed_out" }), { kind: "public" });
  assert.deepEqual(homeView({ status: "failed", code: "UNKNOWN_ERROR" }), { kind: "public" });
  const view = homeView(ready);
  assert.equal(view.kind, "dashboard");
  if (view.kind === "dashboard") {
    assert.deepEqual([...view.capabilities], ["read_self", "read_run"]);
    assert.equal(view.userId, "usr_me");
    assert.equal(view.displayName, "Alice Example");
  }
});
