/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { detailCell, runHeaderView, runRowView } from "./run-view.ts";
import type { RunView } from "./types.ts";

assert.equal(typeof runHeaderView, "function");
assert.equal(typeof runRowView, "function");
assert.equal(typeof detailCell, "function");

const D = (c: string): string => c.repeat(64);

const NAMES = new Map([["user-1", "Alice Example"]]);

const RUN: RunView = {
  id: "run_1",
  flowId: "demo-pay",
  flowHash: `sha256:${D("a")}`,
  mode: "mock",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "user-1", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: null,
  outputRef: null,
  createdAt: "2026-11-17T10:00:00.000000Z",
  startedAt: "2026-11-17T10:00:01.000000Z",
  endedAt: "2026-11-17T10:00:03.500000Z",
};

function run(over: Partial<RunView>): RunView {
  return { ...RUN, ...over };
}

const t = (iso: string): number => Date.parse(iso);

function header(
  r: RunView,
  names: ReadonlyMap<string, string>,
  nowMs: number,
): ReturnType<typeof runHeaderView> {
  let out: ReturnType<typeof runHeaderView> | undefined;
  assert.doesNotThrow(() => {
    out = runHeaderView(r, names, nowMs);
  }, "runHeaderView answers");
  assert.ok(out !== undefined);
  return out;
}

function row(
  r: RunView,
  names: ReadonlyMap<string, string>,
  nowMs: number,
): ReturnType<typeof runRowView> {
  let out: ReturnType<typeof runRowView> | undefined;
  assert.doesNotThrow(() => {
    out = runRowView(r, names, nowMs);
  }, "runRowView answers");
  assert.ok(out !== undefined);
  return out;
}

function cell(input: { term: string; value: string }): ReturnType<typeof detailCell> {
  let out: ReturnType<typeof detailCell> | undefined;
  assert.doesNotThrow(() => {
    out = detailCell(input);
  }, "detailCell answers");
  assert.ok(out !== undefined);
  return out;
}

test("C-56e16a37 header views for completed running queued unended and unknown-user runs", () => {
  const now = t("2026-11-17T10:05:00Z");

  assert.deepEqual(header(RUN, NAMES, now), {
    stateText: "State: completed",
    tone: "success",
    flowId: "demo-pay",
    mode: "mock",
    startedBy: "Alice Example",
    started: "2026-11-17 10:00 UTC",
    startedIso: "2026-11-17T10:00:01.000000Z",
    duration: "2.5 s",
  });

  assert.deepEqual(
    header(run({ state: "running", endedAt: null }), NAMES, t("2026-11-17T10:01:06Z")),
    {
      stateText: "State: running",
      tone: "info",
      flowId: "demo-pay",
      mode: "mock",
      startedBy: "Alice Example",
      started: "2026-11-17 10:00 UTC",
      startedIso: "2026-11-17T10:00:01.000000Z",
      duration: "1 min 5 s",
    },
  );

  assert.deepEqual(
    header(
      run({ state: "queued", startedAt: null, endedAt: null }),
      NAMES,
      t("2026-11-17T10:00:30Z"),
    ),
    {
      stateText: "State: queued",
      tone: "neutral",
      flowId: "demo-pay",
      mode: "mock",
      startedBy: "Alice Example",
      started: "2026-11-17 10:00 UTC",
      startedIso: "2026-11-17T10:00:00.000000Z",
      duration: "30.0 s",
    },
  );

  assert.deepEqual(
    header(run({ state: "failed", endedAt: null }), NAMES, t("2026-11-17T10:05:00Z")),
    {
      stateText: "State: failed",
      tone: "danger",
      flowId: "demo-pay",
      mode: "mock",
      startedBy: "Alice Example",
      started: "2026-11-17 10:00 UTC",
      startedIso: "2026-11-17T10:00:01.000000Z",
      duration: "—",
    },
  );

  assert.deepEqual(header(run({ state: "cancelled" }), new Map(), now), {
    stateText: "State: cancelled",
    tone: "neutral",
    flowId: "demo-pay",
    mode: "mock",
    startedBy: "user-1",
    started: "2026-11-17 10:00 UTC",
    startedIso: "2026-11-17T10:00:01.000000Z",
    duration: "2.5 s",
  });
});

test("C-56e16a37 row views for completed started and running runs", () => {
  assert.deepEqual(row(RUN, NAMES, t("2026-11-17T10:05:00Z")), {
    id: "run_1",
    linkName: "Open run run_1",
    flowId: "demo-pay",
    mode: "mock",
    state: "completed",
    tone: "success",
    started: "4 min ago",
    duration: "2.5 s",
    startedBy: "Alice Example",
  });

  assert.deepEqual(
    row(
      run({
        startedAt: null,
        createdAt: "2026-11-17T09:00:00.000000Z",
        endedAt: "2026-11-17T09:00:02.000000Z",
      }),
      NAMES,
      t("2026-11-17T10:05:00Z"),
    ),
    {
      id: "run_1",
      linkName: "Open run run_1",
      flowId: "demo-pay",
      mode: "mock",
      state: "completed",
      tone: "success",
      started: "1 h ago",
      duration: "2.0 s",
      startedBy: "Alice Example",
    },
  );

  assert.deepEqual(
    row(
      run({
        state: "running",
        startedAt: null,
        endedAt: null,
        principal: { userId: "usr_9", kind: "service" },
      }),
      NAMES,
      t("2026-11-17T10:00:12Z"),
    ),
    {
      id: "run_1",
      linkName: "Open run run_1",
      flowId: "demo-pay",
      mode: "mock",
      state: "running",
      tone: "info",
      started: "just now",
      duration: "12.0 s",
      startedBy: "usr_9",
    },
  );
});

test("C-01ce6552 detail cells read Started and Ended as instants and keep the other rows raw", () => {
  assert.deepEqual(cell({ term: "Started", value: "2026-11-02T10:00:01.000000Z" }), {
    text: "2026-11-02 10:00 UTC",
    iso: "2026-11-02T10:00:01.000000Z",
  });

  assert.deepEqual(cell({ term: "Ended", value: "not ended" }), {
    text: "not ended",
    iso: null,
  });

  assert.deepEqual(cell({ term: "Node", value: "2026-11-02T10:00:01.000000Z" }), {
    text: "2026-11-02T10:00:01.000000Z",
    iso: null,
  });

  assert.deepEqual(cell({ term: "Started", value: "junk" }), {
    text: "junk",
    iso: null,
  });
});
