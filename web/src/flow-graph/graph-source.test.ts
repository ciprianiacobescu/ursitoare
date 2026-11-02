/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { errorPanelModel } from "../kit/error-panel.ts";
import type { VersionRow } from "../flows/versions.ts";
import { graphView } from "./graph-model.ts";
import { GRAPH_LOADING, loadGraphDocument, loadLatestGraph, settleGraphLoad } from "./graph-source.ts";
import type { GraphLoad, LatestGraph } from "./graph-source.ts";
import { needsDocument } from "./pages.ts";

const H = `sha256:${"a".repeat(64)}`;

const S = {
  start: "a",
  nodes: {
    a: { kind: "block", next: "b" },
    b: { kind: "switch", on: "x", cases: { x: "c", y: "d" }, default: "d" },
    c: { kind: "block", next: "e" },
    d: { kind: "end" },
    e: { kind: "end" },
  },
};

const V: VersionRow = {
  flowId: "demo-graph",
  number: 2,
  hash: H,
  state: "validated",
  surface: "yaml",
  author: "u1",
  requestedBy: null,
  createdAt: "2026-10-25T09:00:00.000000Z",
  validatedAt: "2026-10-25T09:00:00.000000Z",
  validationOk: true,
};
const F = {
  flowId: "demo-graph",
  ownerTeam: "finance",
  createdBy: "u1",
  createdAt: V.createdAt,
  versionCount: 2,
  latest: V,
};
const F0 = { ...F, versionCount: 0, latest: null };
const D = { ...V, text: "flow: demo-graph\n", canonical: S, result: null };

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

function recordingClient(answers: unknown[]): { client: Pick<ApiClient, "get">; calls: GetCall[] } {
  const calls: GetCall[] = [];
  const queue = [...answers];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const next = queue.shift();
      if (next instanceof Error) throw next;
      return next as T;
    },
  };
  return { client, calls };
}

async function latest(
  client: Pick<ApiClient, "get">,
  flowId: string,
  signal: AbortSignal,
): Promise<LatestGraph | undefined> {
  let out: LatestGraph | undefined;
  await assert.doesNotReject(async () => {
    out = await loadLatestGraph(client, flowId, signal);
  });
  return out;
}

function rejected(reason: unknown): Promise<unknown> {
  const promise = Promise.reject(reason);
  promise.catch(() => undefined);
  return promise;
}

async function settled(load: Promise<unknown>): Promise<GraphLoad | undefined> {
  let out: GraphLoad | undefined;
  await assert.doesNotReject(async () => {
    out = await settleGraphLoad(load);
  });
  return out;
}

test("C-99ed5dc0 loadLatestGraph reads the flow then the latest version", async () => {
  const signal = new AbortController().signal;
  const { client, calls } = recordingClient([F, D]);
  const result = await latest(client, "demo-graph", signal);
  assert.deepEqual(calls, [
    { path: "/flows/demo-graph", opts: { signal } },
    { path: `/flows/demo-graph/versions/${encodeURIComponent(H)}`, opts: { signal } },
  ]);
  assert.deepEqual(result, { saved: true, version: 2, canonical: S });
});

test("C-99ed5dc0 loadLatestGraph without a saved version makes one call", async () => {
  const signal = new AbortController().signal;
  const { client, calls } = recordingClient([F0]);
  const result = await latest(client, "demo-graph", signal);
  assert.equal(calls.length, 1);
  assert.deepEqual(result, { saved: false, version: null, canonical: null });
});

test("C-99ed5dc0 loadLatestGraph passes a rejection on and refuses a bad id", async () => {
  const failure = new ApiRequestError(404, "NOT_FOUND", "m");
  const { client } = recordingClient([failure]);
  let seen: unknown = null;
  await loadLatestGraph(client, "demo-graph").catch((e: unknown) => {
    seen = e;
  });
  assert.equal(seen, failure);

  const bad = recordingClient([F]);
  let error: unknown = null;
  await loadLatestGraph(bad.client, "Bad_Name").catch((e: unknown) => {
    error = e;
  });
  assert.ok(error instanceof RangeError);
  assert.equal(bad.calls.length, 0);
});

test("C-4ca8acf8 loadGraphDocument reads the document of one version", async () => {
  assert.equal(needsDocument(V, null), true);
  assert.equal(needsDocument(V, undefined), true);
  assert.equal(needsDocument(V, S), false);
  assert.equal(needsDocument(null, null), false);

  const signal = new AbortController().signal;
  const { client, calls } = recordingClient([D]);
  let doc: unknown;
  await assert.doesNotReject(async () => {
    doc = await loadGraphDocument(client, "demo-graph", H, signal);
  });
  assert.deepEqual(calls, [
    { path: `/flows/demo-graph/versions/${encodeURIComponent(H)}`, opts: { signal } },
  ]);
  assert.deepEqual(doc, S);
  assert.deepEqual(GRAPH_LOADING, { phase: "loading", label: "Loading graph" });
});

test("C-4ca8acf8 settleGraphLoad settles a document and a null document", async () => {
  assert.deepEqual(await settled(Promise.resolve(S)), { phase: "ready", value: S });
  const empty = await settled(Promise.resolve(null));
  assert.deepEqual(empty, { phase: "ready", value: null });
  const view = graphView(null, true);
  assert.equal(view.state, "invalid");
  assert.equal(view.message, "This version's document is not a flow: it is not a mapping.");
});

test("C-4ca8acf8 settleGraphLoad turns a 403 into an error with its decision id", async () => {
  const failure = new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } });
  const out = await settled(rejected(failure));
  assert.ok(out !== undefined && out.phase === "error");
  assert.equal(out.retryLabel, "Try again");
  assert.equal(out.error, failure);
  const model = errorPanelModel(out.error);
  assert.equal(model.status, 403);
  assert.equal(model.title, "Not allowed");
  assert.equal(
    model.message,
    "You are not allowed to do this. If you think you should be, give the decision id to an administrator.",
  );
  assert.equal(model.decisionId, "d-1");
});

test("C-4ca8acf8 settleGraphLoad maps a RangeError to a 404 and keeps other errors", async () => {
  const range = await settled(rejected(new RangeError("x")));
  assert.ok(range !== undefined && range.phase === "error");
  assert.ok(range.error instanceof ApiRequestError);
  assert.equal(range.error.status, 404);
  assert.equal(range.error.code, "NOT_FOUND");
  assert.equal(errorPanelModel(range.error).title, "Not found");

  const failure = new ApiRequestError(500, "INTERNAL", "m");
  const server = await settled(rejected(failure));
  assert.ok(server !== undefined && server.phase === "error");
  assert.equal(server.error, failure);
  assert.equal(server.retryLabel, "Try again");
  const model = errorPanelModel(server.error);
  assert.equal(model.title, "Something went wrong");
  assert.equal(
    model.message,
    "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
  );

  const text = await settled(rejected("s"));
  assert.ok(text !== undefined && text.phase === "error");
  assert.equal(text.error, "s");
  assert.equal(text.retryLabel, "Try again");
});
