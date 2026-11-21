/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  detailCell,
  outputPreview,
  previewRefs,
  runHeaderView,
  runRowView,
  stepRowViews,
} from "./run-view.ts";
import type { PayloadLoad } from "./timeline.ts";
import type { PayloadValue, RunState, RunView, StepView } from "./types.ts";

assert.equal(typeof runHeaderView, "function");
assert.equal(typeof runRowView, "function");
assert.equal(typeof detailCell, "function");
assert.equal(typeof stepRowViews, "function");
assert.equal(typeof outputPreview, "function");
assert.equal(typeof previewRefs, "function");

const D = (c: string | number): string =>
  typeof c === "number" ? c.toString(16).padStart(64, "0") : c.repeat(64);

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

const STEP_BASE_MS = Date.parse("2026-11-17T10:00:00.000000Z");

function instant(offsetMs: number): string {
  const date = new Date(STEP_BASE_MS + offsetMs);
  const pad = (value: number, width = 2): string => String(value).padStart(width, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}.${pad(date.getUTCMilliseconds(), 3)}000Z`;
}

function step(
  seq: number,
  nodeId: string,
  kind: string,
  out: number | null,
  state: StepView["state"] = "completed",
  outcome: string | null = null,
  endedAt: string | null = instant((seq + 1) * 1000 + 500),
): StepView {
  return {
    seq,
    nodeId,
    kind,
    effectSeq: 0,
    attempt: 1,
    state,
    outcome,
    error: null,
    inputRef: D(1000 + seq),
    outputRef: out === null ? null : D(out),
    idemKey: null,
    policyDecisionId: null,
    taint: [],
    startedAt: instant((seq + 1) * 1000),
    endedAt,
  };
}

function rows(
  steps: readonly StepView[],
  runState: RunState,
  loads: ReadonlyMap<string, PayloadLoad>,
  nowMs: number,
): ReturnType<typeof stepRowViews> {
  let out: ReturnType<typeof stepRowViews> | undefined;
  assert.doesNotThrow(() => {
    out = stepRowViews(steps, runState, loads, nowMs);
  }, "stepRowViews answers");
  assert.ok(out !== undefined);
  return out;
}

function output(ref: string | null, load: PayloadLoad | undefined): string | null {
  let out: string | null | undefined;
  assert.doesNotThrow(() => {
    out = outputPreview(ref, load);
  }, "outputPreview answers");
  assert.ok(out !== undefined);
  return out;
}

function previewText(value: PayloadValue): string {
  const out = output(D(1), { phase: "ready", value });
  assert.equal(typeof out, "string");
  return out as string;
}

function refs(steps: readonly StepView[]): string[] {
  let out: string[] | undefined;
  assert.doesNotThrow(() => {
    out = previewRefs(steps);
  }, "previewRefs answers");
  assert.ok(out !== undefined);
  return out;
}

function hasLoneSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff) {
      const next = value.charCodeAt(index + 1);
      if (!(next >= 0xdc00 && next <= 0xdfff)) return true;
      index += 1;
    } else if (code >= 0xdc00 && code <= 0xdfff) {
      return true;
    }
  }
  return false;
}

test("C-39bfdc20 step rows for ready absent error interrupted and live steps plus fifty limits", () => {
  const r1Loads = new Map<string, PayloadLoad>([
    [D(1), { phase: "ready", value: { vendor_id: "V-1", status: "active" } }],
    [D(3), { phase: "error", error: 1 }],
  ]);
  const r1 = rows(
    [
      step(2, "pay", "block", 2),
      step(0, "lookup", "block", 1),
      step(3, "done", "end", 3),
      step(1, "route", "switch", null, "completed", "active"),
    ],
    "completed",
    r1Loads,
    t("2026-11-17T10:05:00Z"),
  );
  assert.deepEqual(r1, [
    {
      seq: 0,
      nodeId: "lookup",
      text: "block · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: '{"vendor_id":"V-1","status":"active"}',
    },
    {
      seq: 1,
      nodeId: "route",
      text: "switch: active · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: null,
    },
    {
      seq: 2,
      nodeId: "pay",
      text: "block · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: "Loading output…",
    },
    {
      seq: 3,
      nodeId: "done",
      text: "end · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: "Output not loaded.",
    },
  ]);

  const liveSteps = [
    step(0, "lookup", "block", 1),
    step(1, "pay", "block", null, "started", null, null),
  ];
  const r2 = rows(liveSteps, "running", new Map(), t("2026-11-17T10:00:12Z"));
  assert.deepEqual(r2, [
    {
      seq: 0,
      nodeId: "lookup",
      text: "block · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: "Loading output…",
    },
    {
      seq: 1,
      nodeId: "pay",
      text: "block · running",
      state: "running",
      tone: "info",
      duration: "10.0 s",
      preview: null,
    },
  ]);

  const r3 = rows(liveSteps, "failed", new Map(), t("2026-11-17T10:00:12Z"));
  assert.deepEqual(r3, [
    {
      seq: 0,
      nodeId: "lookup",
      text: "block · completed",
      state: "completed",
      tone: "success",
      duration: "<1 s",
      preview: "Loading output…",
    },
    {
      seq: 1,
      nodeId: "pay",
      text: "block · Interrupted (Not finalized)",
      state: "Interrupted",
      tone: "warning",
      duration: "—",
      preview: null,
    },
  ]);

  const longSteps = Array.from({ length: 60 }, (_, index) =>
    step(index, `n${index}`, "block", 100 + index),
  );
  const longLoads = new Map<string, PayloadLoad>(
    longSteps.map((view): [string, PayloadLoad] => [
      view.outputRef ?? "",
      { phase: "ready", value: { n: 1 } },
    ]),
  );
  const r4 = rows(longSteps, "completed", longLoads, t("2026-11-17T10:05:00Z"));
  assert.equal(r4.length, 60);
  const previewed = r4.filter((row) => row.preview !== null);
  assert.equal(previewed.length, 50);
  for (const row of previewed) assert.equal(row.preview, '{"n":1}');
  assert.equal(r4[50]?.preview, null);
  assert.equal(r4[59]?.preview, null);
});

test("C-6bf9588b preview texts the cut and the first fifty refs", () => {
  assert.equal(output(null, undefined), null);
  assert.equal(output(D(1), undefined), "Loading output…");
  assert.equal(output(D(1), { phase: "loading" }), "Loading output…");
  assert.equal(output(D(1), { phase: "error", error: 1 }), "Output not loaded.");

  const p2 = previewText({ items: "x".repeat(300) });
  assert.equal([...p2].length, 120);
  assert.equal(p2.slice(0, 20), '{"items":"xxxxxxxxxx');
  assert.equal(p2.slice(-3), "xx…");

  for (const n of [117, 118]) {
    const full = `"${"y".repeat(n)}"`;
    assert.equal(previewText("y".repeat(n)), full);
    assert.equal([...full].length, n + 2);
    assert.equal(full.slice(-2), 'y"');
  }
  for (const n of [119, 120]) {
    const cut = previewText("y".repeat(n));
    assert.equal([...cut].length, 120);
    assert.equal(cut.slice(-2), "y…");
  }

  const emoji = previewText("😀".repeat(200));
  assert.equal([...emoji].length, 120);
  assert.equal(emoji.endsWith("…"), true);
  assert.equal(hasLoneSurrogate(emoji), false);

  assert.equal(previewText(null), "null");
  assert.equal(previewText([1, { a: "b c" }]), '[1,{"a":"b c"}]');
  const escaped = previewText("line\nbreak");
  assert.equal(escaped, '"line\\nbreak"');
  assert.equal(escaped.includes("\n"), false);

  const f1 = refs([
    step(2, "c", "block", 5),
    step(0, "a", "block", 5),
    step(1, "b", "block", null),
    step(3, "d", "block", 7),
  ]);
  assert.deepEqual(f1, [D(5), D(7)]);

  const f2Steps = Array.from({ length: 60 }, (_, index) =>
    step(index, `n${index}`, "block", 100 + index),
  );
  const f2 = refs(f2Steps);
  assert.equal(f2.length, 50);
  assert.equal(f2[49], D(149));
  assert.equal(f2.includes(D(150)), false);
});
