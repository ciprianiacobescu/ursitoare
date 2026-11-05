/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiClient, RequestOptions } from "../api/client.ts";
import { ApiRequestError } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import { failureView, runPageView } from "./failures.ts";
import { followRun, nextPollDelay, RunFollowError } from "./polling.ts";
import type { RunSnapshot } from "./polling.ts";
import { loadRun } from "./runs-source.ts";
import type { RunState, RunView, StepView } from "./types.ts";

const D = (c: string): string => c.repeat(64);

const RUN: RunView = {
  id: "run_1",
  flowId: "demo-pay",
  flowHash: `sha256:${D("a")}`,
  mode: "mock",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: D("b"),
  outputRef: D("c"),
  createdAt: "2026-11-02T10:00:00.000000Z",
  startedAt: "2026-11-02T10:00:01.000000Z",
  endedAt: "2026-11-02T10:00:02.000000Z",
};

function step(seq: number, nodeId: string, kind: string, over: Partial<StepView> = {}): StepView {
  return {
    seq,
    nodeId,
    kind,
    effectSeq: 0,
    attempt: 1,
    state: "completed",
    outcome: null,
    error: null,
    inputRef: null,
    outputRef: null,
    idemKey: null,
    policyDecisionId: null,
    taint: [],
    startedAt: "2026-11-02T10:00:01.000000Z",
    endedAt: "2026-11-02T10:00:01.500000Z",
    ...over,
  };
}

const STEPS: readonly StepView[] = [
  step(0, "lookup", "block", { inputRef: D("1"), outputRef: D("2") }),
  step(1, "route", "switch", { outcome: "active" }),
  step(2, "pay", "block", { inputRef: D("3"), outputRef: D("4"), taint: ["untrusted"] }),
  step(3, "done", "end"),
];

const E500 = new ApiRequestError(500, "INTERNAL", "m");
const E403 = new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } });
const SNAP: RunSnapshot = { run: { ...RUN, state: "running" }, steps: [...STEPS], truncated: false };
const NOT_FOUND_VIEW = {
  model: {
    code: "NOT_FOUND",
    status: 404,
    title: "Not found",
    message: "That item does not exist, or you cannot see it.",
    decisionId: null,
  },
  retryLabel: "Try again",
};

interface Call {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface Script {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: Call[];
}

// Answers per path, in turn; the last answer repeats. An Error answer is thrown.
function scriptedClient(runs: readonly unknown[], steps: readonly unknown[]): Script {
  const calls: Call[] = [];
  const counters = new Map<string, number>();
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const answers = path.endsWith("/steps") ? steps : runs;
      const index = counters.get(path) ?? 0;
      counters.set(path, index + 1);
      const answer = answers[Math.min(index, answers.length - 1)] as unknown;
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };
  return { client, calls };
}

function runAnswer(state: RunState): RunView {
  return { ...RUN, state };
}

function stepsAnswer(count: number): unknown {
  return { items: STEPS.slice(0, count), next_cursor: null };
}

async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => undefined,
    (e: unknown) => e ?? new Error("rejected with nothing"),
  );
}

test("C-f2512ba4 delays double from 250 to 2000 and stop at a terminal state", () => {
  let delays: (number | null)[] = [];
  assert.doesNotThrow(() => {
    delays = [
      nextPollDelay("queued", 0),
      nextPollDelay("running", 0),
      nextPollDelay("running", 1),
      nextPollDelay("running", 2),
      nextPollDelay("running", 3),
      nextPollDelay("running", -1),
      nextPollDelay("running", Number.NaN),
      nextPollDelay("completed", 0),
      nextPollDelay("failed", 7),
      nextPollDelay("cancelled", 0),
    ];
  });
  assert.deepEqual(delays, [250, 250, 500, 1000, 2000, 250, 250, null, null, null]);
});

test("C-f2512ba4 a followed run resolves with the last snapshot", async () => {
  const states: RunState[] = ["queued", "running", "running", "completed"];
  const { client, calls } = scriptedClient(
    states.map(runAnswer),
    [0, 1, 2, 4].map(stepsAnswer),
  );
  const slept: number[] = [];
  const seen: RunState[] = [];
  let result: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    result = await followRun(client, "run_1", {
      sleep: async (ms) => {
        slept.push(ms);
      },
      now: () => 0,
      deadlineMs: 20000,
      onUpdate: (snapshot) => {
        seen.push(snapshot.run.state);
      },
    });
  });
  assert.ok(result !== undefined);
  assert.equal(result.run.state, "completed");
  assert.equal(result.steps.length, 4);
  assert.equal(result.truncated, false);
  assert.deepEqual(slept, [250, 500, 1000]);
  assert.deepEqual(seen, states);
  assert.deepEqual(
    calls.map((call) => call.path),
    Array.from({ length: 4 }, () => ["/runs/run_1", "/runs/run_1/steps"]).flat(),
  );
});

test("C-f2512ba4 a run that never ends hits the deadline", async () => {
  const { client } = scriptedClient([runAnswer("running")], [stepsAnswer(1)]);
  const slept: number[] = [];
  const times = [0, 6000, 12000, 18000, 24000];
  let at = 0;
  const error = await rejectionOf(
    followRun(client, "run_1", {
      sleep: async (ms) => {
        slept.push(ms);
      },
      now: () => times[Math.min(at++, times.length - 1)] ?? 0,
      deadlineMs: 20000,
    }),
  );
  assert.ok(error instanceof RunFollowError);
  assert.equal(error.code, "RUN_FOLLOW_TIMEOUT");
  assert.deepEqual(slept, [250, 500, 1000]);
});

test("C-f2512ba4 a failed poll rejects, calls onUpdate not, and a restart works", async () => {
  const first = scriptedClient([E500], [stepsAnswer(4)]);
  let updates = 0;
  const error = await rejectionOf(
    followRun(first.client, "run_1", {
      sleep: async () => {},
      now: () => 0,
      onUpdate: () => {
        updates += 1;
      },
    }),
  );
  assert.equal(error, E500);
  assert.equal(updates, 0);

  const second = scriptedClient([runAnswer("completed")], [stepsAnswer(4)]);
  let result: RunSnapshot | undefined;
  await assert.doesNotReject(async () => {
    result = await followRun(second.client, "run_1", { sleep: async () => {}, now: () => 0 });
  });
  assert.equal(result?.run.state, "completed");
  assert.equal(result?.steps.length, 4);
});

test("C-f2512ba4 a forbidden poll is not restarted and has a decision id", async () => {
  const { client, calls } = scriptedClient([E403], [stepsAnswer(4)]);
  const error = await rejectionOf(
    followRun(client, "run_1", { sleep: async () => {}, now: () => 0 }),
  );
  assert.equal(error, E403);
  assert.deepEqual(
    calls.map((call) => call.path),
    ["/runs/run_1"],
  );
  let view: unknown;
  assert.doesNotThrow(() => {
    view = failureView(E403);
  });
  assert.deepEqual(view, { model: errorPanelModel(E403), retryLabel: "Try again" });
  const model = (view as { model: { status: number; title: string; decisionId: string } }).model;
  assert.equal(model.status, 403);
  assert.equal(model.title, "Not allowed");
  assert.equal(model.decisionId, "d-1");
});

test("C-f2512ba4 an abort during the wait rejects with an AbortError", async () => {
  const { client, calls } = scriptedClient([runAnswer("running")], [stepsAnswer(1)]);
  const controller = new AbortController();
  let updates = 0;
  const error = await rejectionOf(
    followRun(client, "run_1", {
      signal: controller.signal,
      sleep: async (_ms, signal) => {
        controller.abort();
        throw signal?.reason ?? new DOMException("Aborted", "AbortError");
      },
      now: () => 0,
      onUpdate: () => {
        updates += 1;
      },
    }),
  );
  assert.ok(error instanceof Error);
  assert.equal(error.name, "AbortError");
  assert.equal(updates, 1);
  assert.equal(calls.length, 2);

  const idle = scriptedClient([runAnswer("running")], [stepsAnswer(1)]);
  const stopped = new AbortController();
  stopped.abort();
  const early = await rejectionOf(
    followRun(idle.client, "run_1", { signal: stopped.signal, sleep: async () => {}, now: () => 0 }),
  );
  assert.ok(early instanceof Error);
  assert.equal(early.name, "AbortError");
  assert.equal(idle.calls.length, 0);
});

test("C-f2512ba4 an unreadable answer shows the INVALID_RESPONSE panel", () => {
  let view: unknown;
  assert.doesNotThrow(() => {
    view = failureView(new ApiRequestError(200, "INVALID_RESPONSE", "m"));
  });
  assert.deepEqual(view, {
    model: {
      code: "INVALID_RESPONSE",
      status: 200,
      title: "Something went wrong",
      message: "The engine sent an answer this page cannot read.",
      decisionId: null,
    },
    retryLabel: "Try again",
  });
});

test("C-f2512ba4 a malformed run id is a 404 panel without a request", async () => {
  const { client, calls } = scriptedClient([runAnswer("completed")], [stepsAnswer(1)]);
  const error = await rejectionOf(loadRun(client, "bad id!"));
  assert.ok(error instanceof RangeError);
  assert.equal(calls.length, 0);
  let view: unknown;
  let viewOfNotFound: unknown;
  assert.doesNotThrow(() => {
    view = failureView(error);
    viewOfNotFound = failureView(new ApiRequestError(404, "NOT_FOUND", "m"));
  });
  assert.deepEqual(view, NOT_FOUND_VIEW);
  assert.deepEqual(viewOfNotFound, NOT_FOUND_VIEW);
});

test("C-f2512ba4 the page view keeps the snapshot and stops polling on a failure", () => {
  let views: unknown[] = [];
  assert.doesNotThrow(() => {
    views = [
      runPageView(null, undefined),
      runPageView(SNAP, undefined),
      runPageView(SNAP, E500),
      runPageView(null, new RangeError("bad id")),
    ];
  });
  assert.deepEqual(views, [
    { loading: true, polling: true, snapshot: null, failure: null },
    { loading: false, polling: true, snapshot: SNAP, failure: null },
    {
      loading: false,
      polling: false,
      snapshot: SNAP,
      failure: { model: errorPanelModel(E500), retryLabel: "Try again" },
    },
    { loading: false, polling: false, snapshot: null, failure: NOT_FOUND_VIEW },
  ]);
});
