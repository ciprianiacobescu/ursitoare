/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiClient, RequestOptions } from "../api/client.ts";
import { ApiRequestError } from "../api/client.ts";
import type { CursorList, CursorPage, FetchPage } from "../kit/data/cursor-list.ts";
import { createCursorList } from "../kit/data/cursor-list.ts";
import { tableView } from "../kit/data/data-table.ts";
import { loadPayload, loadRun, loadSteps, runListFetcher } from "./runs-source.ts";
import type { RunView, StepView } from "./types.ts";

assert.equal(typeof runListFetcher, "function");

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

const PAY_INPUT = { vendor_id: "V-1", amount: 12.5, currency: "EUR", reference: "demo" };

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface RecordingGetClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGetClient(...answers: unknown[]): RecordingGetClient {
  const calls: GetCall[] = [];
  let index = 0;
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const answer = answers[Math.min(index, answers.length - 1)] as unknown;
      index += 1;
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };
  return { client, calls };
}

function endlessStepsClient(): RecordingGetClient {
  const calls: GetCall[] = [];
  let index = 0;
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const page = index;
      index += 1;
      return { items: [step(page, `n${page}`, "block")], next_cursor: `c${page}` } as T;
    },
  };
  return { client, calls };
}

interface SwitchableGetClient extends RecordingGetClient {
  setAnswer(next: unknown): void;
}

function switchableGetClient(): SwitchableGetClient {
  const calls: GetCall[] = [];
  let answer: unknown;
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };
  return { client, calls, setAnswer(next: unknown): void { answer = next; } };
}

async function builtFetchPage(
  client: Pick<ApiClient, "get">,
  label: string,
): Promise<FetchPage<RunView>> {
  let holder: FetchPage<RunView> | undefined;
  assert.doesNotThrow(() => {
    holder = runListFetcher(client);
  }, `the run list fetcher over ${label} is built`);
  assert.ok(holder !== undefined, `the run list fetcher over ${label} was produced`);
  return holder;
}

async function loadedRun(
  client: Pick<ApiClient, "get">,
  runId: string,
  label: string,
  signal?: AbortSignal,
): Promise<RunView> {
  let result: RunView | undefined;
  await assert.doesNotReject(async () => {
    result = await loadRun(client, runId, signal);
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned a run`);
  return result;
}

async function loadedSteps(
  client: Pick<ApiClient, "get">,
  runId: string,
  label: string,
  signal?: AbortSignal,
): Promise<{ steps: StepView[]; truncated: boolean }> {
  let result: { steps: StepView[]; truncated: boolean } | undefined;
  await assert.doesNotReject(async () => {
    result = await loadSteps(client, runId, signal);
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned the steps`);
  return result;
}

async function loadedPayload(
  client: Pick<ApiClient, "get">,
  runId: string,
  sha256: string,
  label: string,
  signal?: AbortSignal,
): Promise<unknown> {
  let result: unknown;
  await assert.doesNotReject(async () => {
    result = await loadPayload(client, runId, sha256, signal);
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned a payload`);
  return result;
}

async function builtRunList(client: Pick<ApiClient, "get">): Promise<CursorList<RunView>> {
  const fetchPage = await builtFetchPage(client, "the run list");
  let holder: CursorList<RunView> | undefined;
  assert.doesNotThrow(() => {
    holder = createCursorList(fetchPage);
  }, "the run list is built");
  assert.ok(holder !== undefined, "the run list was produced");
  return holder;
}

test("C-8a285469 runListFetcher asks the runs path with the limit then the cursor", async () => {
  const recording = recordingGetClient(
    { items: [RUN], next_cursor: "c1" },
    { items: [{ ...RUN, state: "paused" }], next_cursor: null },
  );
  const fetchPage = await builtFetchPage(recording.client, "the recording client");

  const signal = new AbortController().signal;
  let page: CursorPage<RunView> | undefined;
  await assert.doesNotReject(async () => {
    page = await fetchPage({ cursor: null, limit: 50, signal });
  }, "the first page resolves");
  assert.ok(page !== undefined, "the first page was produced");
  assert.deepEqual(page, { items: [RUN], next_cursor: "c1" }, "the first page carries the parsed run");
  assert.equal(recording.calls.length, 1, "the first page made one call");
  assert.deepEqual(
    recording.calls[0],
    { path: "/runs", opts: { query: { limit: 50 }, signal } },
    "the first page asks for the limit without a cursor",
  );

  await assert.rejects(
    fetchPage({ cursor: "c1", limit: 50, signal }),
    (error: unknown) =>
      error instanceof ApiRequestError && error.status === 200 && error.code === "INVALID_RESPONSE",
    "a page with an unparseable run rejects with INVALID_RESPONSE of status 200",
  );
  assert.equal(recording.calls.length, 2, "the second page made one call");
  assert.deepEqual(
    recording.calls[1],
    { path: "/runs", opts: { query: { limit: 50, cursor: "c1" }, signal } },
    "the next page carries the cursor in the query",
  );
});

test("C-8a285469 loadRun returns the parsed run and refuses a bad id without a call", async () => {
  const recording = recordingGetClient(RUN);
  const signal = new AbortController().signal;
  const run = await loadedRun(recording.client, "run_1", "an existing run", signal);
  assert.deepEqual(run, RUN, "the loaded run is read");
  assert.equal(recording.calls.length, 1, "the load made one call");
  assert.deepEqual(
    recording.calls[0],
    { path: "/runs/run_1", opts: { signal } },
    "the load asks exactly the run path with its signal",
  );

  const badId = recordingGetClient(RUN);
  await assert.rejects(loadRun(badId.client, "bad id"), RangeError, "a bad run id is refused");
  assert.equal(badId.calls.length, 0, "nothing was sent for the bad run id");
});

test("C-8a285469 loadSteps pages the steps path and stops after the last page", async () => {
  const recording = recordingGetClient(
    { items: [STEPS[0], STEPS[1]], next_cursor: "c1" },
    { items: [STEPS[2], STEPS[3]], next_cursor: null },
  );

  const signal = new AbortController().signal;
  const loaded = await loadedSteps(recording.client, "run_1", "the step list", signal);
  assert.deepEqual(loaded, { steps: STEPS, truncated: false }, "the steps of both pages are joined");
  assert.equal(recording.calls.length, 2, "the reads stopped after the page with no cursor");
  assert.deepEqual(
    recording.calls[0],
    { path: "/runs/run_1/steps", opts: { query: { limit: 200 }, signal } },
    "the first page asks for two hundred steps with the signal",
  );
  assert.deepEqual(
    recording.calls[1],
    { path: "/runs/run_1/steps", opts: { query: { limit: 200, cursor: "c1" }, signal } },
    "the next page carries the cursor in the query",
  );
});

test("C-8a285469 loadSteps caps five pages and reports the truncation", async () => {
  const recording = endlessStepsClient();
  const loaded = await loadedSteps(recording.client, "run_1", "the endless list");
  assert.equal(loaded.truncated, true, "an endless list is reported truncated");
  assert.equal(recording.calls.length, 5, "the endless list is read five times");
  assert.deepEqual(
    recording.calls[0],
    {
      path: "/runs/run_1/steps",
      opts: {
        query: { limit: 200 },
        signal: recording.calls[0]?.opts?.signal ?? "missing signal",
      },
    },
    "the first page asks for two hundred steps with a signal",
  );
  assert.equal(loaded.steps.length, 5, "the five capped pages make five steps");
});

test("C-8a285469 loadPayload reads the payload path by digest and refuses a short digest", async () => {
  const recording = recordingGetClient(
    { sha256: D("3"), mediaType: "application/json", size: 69, data: PAY_INPUT },
    { sha256: D("4"), mediaType: "application/json", size: 38, data: { payment_id: "P-1", status: "created" } },
  );

  const signal = new AbortController().signal;
  const input = await loadedPayload(recording.client, "run_1", D("3"), "the input payload", signal);
  assert.deepEqual(
    input,
    { sha256: D("3"), mediaType: "application/json", size: 69, data: PAY_INPUT },
    "the parsed input payload is read",
  );
  const output = await loadedPayload(recording.client, "run_1", D("4"), "the output payload", signal);
  assert.deepEqual(
    output,
    { sha256: D("4"), mediaType: "application/json", size: 38, data: { payment_id: "P-1", status: "created" } },
    "the parsed output payload is read",
  );
  assert.deepEqual(
    recording.calls[0],
    { path: `/runs/run_1/payloads/${D("3")}`, opts: { signal } },
    "the input payload asks exactly its path",
  );
  assert.deepEqual(
    recording.calls[1],
    { path: `/runs/run_1/payloads/${D("4")}`, opts: { signal } },
    "the output payload asks exactly its path",
  );
  assert.equal(recording.calls.length, 2, "the two payloads made two calls");

  const short = recordingGetClient();
  await assert.rejects(loadPayload(short.client, "run_1", "a".repeat(63)), RangeError, "a short digest is refused");
  assert.equal(short.calls.length, 0, "nothing was sent for the short digest");
});

test("C-8a285469 the run list shows its retry message while it fails and drops it once it loads", async () => {
  const recording = switchableGetClient();
  recording.setAnswer(new ApiRequestError(500, "INTERNAL", "m"));

  const list = await builtRunList(recording.client);
  await assert.doesNotReject(async () => {
    await list.load();
  }, "the loading of the run list settles");

  const failing = tableView(list.getState());
  assert.equal(failing.retry, "again", "a failed load offers to try again");
  assert.equal(failing.retryLabel, "Try again", "the failing table labels its retry");
  assert.equal(failing.showError, true, "the failing table shows its error");

  recording.setAnswer({ items: [RUN], next_cursor: null });
  await assert.doesNotReject(async () => {
    await list.retry();
  }, "the retry of the run list settles");
  assert.equal(list.getState().status, "loaded", "the retried list carries rows");
  assert.deepEqual([...list.getState().items], [RUN], "the retried list holds the run");
  assert.equal(tableView(list.getState()).retryLabel, null, "the loaded table drops its retry label");
});
