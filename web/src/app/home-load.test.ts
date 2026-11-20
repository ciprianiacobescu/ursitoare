/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiClient, RequestOptions } from "../api/client.ts";
import { ApiRequestError } from "../api/client.ts";
import {
  loadFlowSet,
  loadPendingServers,
  loadPolicyFact,
  loadRecentRuns,
  loadUnassigned,
} from "./home.ts";

const HASH = "sha256:" + "ab".repeat(32);
const DIGEST = "sha256:" + "c".repeat(64);
const POLICY_VERSION = "f".repeat(64);

interface GetCall {
  readonly path: string;
  readonly query: unknown;
  readonly signal: AbortSignal | undefined;
}

interface FakeClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function fake(answer: unknown): FakeClient {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, query: opts?.query, signal: opts?.signal });
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };
  return { client, calls };
}

async function loaded<T>(label: string, run: () => Promise<T>): Promise<T> {
  let result: T | undefined;
  await assert.doesNotReject(async () => {
    result = await run();
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned a result`);
  return result;
}

function isInvalidResponse(error: unknown): boolean {
  return (
    error instanceof ApiRequestError &&
    error.status === 200 &&
    error.code === "INVALID_RESPONSE"
  );
}

async function expectInvalid(label: string, run: () => Promise<unknown>): Promise<void> {
  await assert.rejects(run(), isInvalidResponse, `${label} rejects with INVALID_RESPONSE of status 200`);
}

function runBody(id: string): Record<string, unknown> {
  return {
    id,
    flowId: "demo-pay",
    flowHash: HASH,
    mode: "mock",
    trigger: "test",
    state: "completed",
    ownerTeam: "finance",
    principal: { userId: "usr_me", kind: "human" },
    terminalNode: null,
    error: null,
    inputRef: null,
    outputRef: null,
    createdAt: "2026-11-18T11:56:35Z",
    startedAt: "2026-11-18T11:56:40Z",
    endedAt: "2026-11-18T11:56:41.400Z",
  };
}

function flowBody(flowId: string): Record<string, unknown> {
  return {
    flowId,
    ownerTeam: "finance",
    createdBy: "usr_me",
    createdAt: "2026-11-14T08:00:00Z",
    versionCount: 0,
    latest: null,
  };
}

function serverBody(id: string, state: string): Record<string, unknown> {
  return {
    id,
    adapter: "fixture",
    origin: "https://tools.fake.test",
    state,
    registeredBy: "u_carol",
    pendingDigest: state === "approved" ? null : DIGEST,
    approvedDigest: state === "approved" ? DIGEST : null,
    tools: [{ name: "lookup_vendor", effect: "read", ref: null }],
  };
}

function userBody(
  userId: string,
  kind: string,
  state: string,
  roles: string[] = [],
  localRoles: string[] = [],
): Record<string, unknown> {
  return { userId, kind, displayName: userId, email: null, state, roles, teams: [], localRoles };
}

const RUN_ID = "run_01a1eb72-3179-7000-a94d-6c6eaf5d03ac";

test("C-4771fd19 loadRecentRuns asks one page of five runs", async () => {
  assert.equal(typeof loadRecentRuns, "function");
  const signal = new AbortController().signal;
  const recording = fake({
    items: [runBody(RUN_ID), runBody("run_2")],
    next_cursor: "c1",
  });
  const runs = await loaded("the runs page", () => loadRecentRuns(recording.client, signal));
  assert.deepEqual(
    runs.map((run) => run.id),
    [RUN_ID, "run_2"],
  );
  assert.equal(runs[0]?.state, "completed");
  assert.equal(recording.calls.length, 1);
  assert.deepEqual(
    recording.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/runs", query: { limit: 5 } }],
  );
  assert.equal(recording.calls[0]?.signal, signal);

  const empty = fake({ items: [], next_cursor: null });
  const none = await loaded("the empty runs page", () => loadRecentRuns(empty.client, signal));
  assert.deepEqual(none, []);
  assert.deepEqual(
    empty.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/runs", query: { limit: 5 } }],
  );
});

test("C-4771fd19 loadFlowSet reads one page and reports whether it is complete", async () => {
  assert.equal(typeof loadFlowSet, "function");
  const signal = new AbortController().signal;
  const full = fake({
    items: [flowBody("alpha-flow"), flowBody("beta-flow"), flowBody("demo-pay")],
    next_cursor: null,
  });
  const page = await loaded("the flows page", () => loadFlowSet(full.client, signal));
  assert.deepEqual(
    page.items.map((flow) => flow.flowId),
    ["alpha-flow", "beta-flow", "demo-pay"],
  );
  assert.equal(page.complete, true);
  assert.equal(full.calls.length, 1);
  assert.deepEqual(
    full.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/flows", query: { limit: 200 } }],
  );
  assert.equal(full.calls[0]?.signal, signal);

  const partial = fake({ items: [flowBody("alpha-flow")], next_cursor: "alpha-flow" });
  const rest = await loaded("the partial flows page", () => loadFlowSet(partial.client, signal));
  assert.equal(rest.items.length, 1);
  assert.equal(rest.complete, false);
  assert.deepEqual(
    partial.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/flows", query: { limit: 200 } }],
  );
});

test("C-4771fd19 loadPendingServers counts the pending servers on one page", async () => {
  assert.equal(typeof loadPendingServers, "function");
  const signal = new AbortController().signal;
  const full = fake({
    items: [
      serverBody("s1", "pending"),
      serverBody("s2", "approved"),
      serverBody("s3", "drifted"),
      serverBody("s4", "pending"),
    ],
    next_cursor: null,
  });
  const counted = await loaded("the servers page", () => loadPendingServers(full.client, signal));
  assert.deepEqual(counted, { count: 2, complete: true });
  assert.equal(full.calls.length, 1);
  assert.deepEqual(
    full.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/tool-servers", query: { limit: 200 } }],
  );
  assert.equal(full.calls[0]?.signal, signal);

  const partial = fake({ items: [serverBody("s1", "pending")], next_cursor: "n" });
  const rest = await loaded("the partial servers page", () =>
    loadPendingServers(partial.client, signal),
  );
  assert.deepEqual(rest, { count: 1, complete: false });
  assert.deepEqual(
    partial.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/tool-servers", query: { limit: 200 } }],
  );
});

test("C-4771fd19 loadUnassigned counts active humans without any role", async () => {
  assert.equal(typeof loadUnassigned, "function");
  const signal = new AbortController().signal;
  const recording = fake({
    items: [
      userBody("u1", "human", "active"),
      userBody("u2", "human", "active", ["author"]),
      userBody("u3", "human", "active", [], ["author"]),
      userBody("u4", "human", "disabled"),
      userBody("u5", "service", "active"),
      userBody("u6", "human", "active"),
    ],
    next_cursor: null,
  });
  const counted = await loaded("the users page", () => loadUnassigned(recording.client, signal));
  assert.deepEqual(counted, { count: 2, complete: true });
  assert.equal(recording.calls.length, 1);
  assert.deepEqual(
    recording.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/users", query: { limit: 200 } }],
  );
  assert.equal(recording.calls[0]?.signal, signal);
});

test("C-4771fd19 loadPolicyFact reads the current policy and pending grants", async () => {
  assert.equal(typeof loadPolicyFact, "function");
  const signal = new AbortController().signal;
  const none = fake({ current: null, pendingGrants: 2 });
  const before = await loaded("the policy without a deployment", () =>
    loadPolicyFact(none.client, signal),
  );
  assert.deepEqual(before, { deployed: false, pendingGrants: 2 });
  assert.equal(none.calls.length, 1);
  assert.deepEqual(
    none.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/policies", query: undefined }],
  );
  assert.equal(none.calls[0]?.signal, signal);

  const deployed = fake({
    current: { version: POLICY_VERSION, source: "permit (principal, action, resource);" },
    pendingGrants: 0,
  });
  const after = await loaded("the deployed policy", () => loadPolicyFact(deployed.client, signal));
  assert.deepEqual(after, { deployed: true, pendingGrants: 0 });
  assert.deepEqual(
    deployed.calls.map((call) => ({ path: call.path, query: call.query })),
    [{ path: "/policies", query: undefined }],
  );
});

test("C-4771fd19 the loaders reject a malformed body with INVALID_RESPONSE", async () => {
  assert.equal(typeof loadRecentRuns, "function");
  assert.equal(typeof loadFlowSet, "function");
  assert.equal(typeof loadPendingServers, "function");
  assert.equal(typeof loadUnassigned, "function");
  assert.equal(typeof loadPolicyFact, "function");
  const signal = new AbortController().signal;

  const runsRefused = fake({ items: [{ id: "x" }], next_cursor: null });
  await expectInvalid("a refused run item", () => loadRecentRuns(runsRefused.client, signal));

  const runsNotPage = fake({ items: "no", next_cursor: null });
  await expectInvalid("a runs body that is not a page", () =>
    loadRecentRuns(runsNotPage.client, signal),
  );

  const flowsRefused = fake({ items: [{ flowId: "Bad Id" }], next_cursor: null });
  await expectInvalid("a refused flow item", () => loadFlowSet(flowsRefused.client, signal));

  const serversNotPage = fake({});
  await expectInvalid("a servers body that is not a page", () =>
    loadPendingServers(serversNotPage.client, signal),
  );

  const serversNonRecord = fake({ items: [7], next_cursor: null });
  await expectInvalid("a non-record server item", () =>
    loadPendingServers(serversNonRecord.client, signal),
  );

  const usersNonRecord = fake({ items: [null], next_cursor: null });
  await expectInvalid("a non-record user item", () => loadUnassigned(usersNonRecord.client, signal));

  const policyNotRecord = fake([]);
  await expectInvalid("a policy body that is not a record", () =>
    loadPolicyFact(policyNotRecord.client, signal),
  );

  const policyNegative = fake({ current: null, pendingGrants: -1 });
  await expectInvalid("a negative pending grant count", () =>
    loadPolicyFact(policyNegative.client, signal),
  );

  const policyCurrentText = fake({ current: "x", pendingGrants: 1 });
  await expectInvalid("a text current policy", () => loadPolicyFact(policyCurrentText.client, signal));

  const policyMissing = fake({ current: null });
  await expectInvalid("a policy without a pending grant count", () =>
    loadPolicyFact(policyMissing.client, signal),
  );
});

test("C-4771fd19 each loader passes a client failure through after one call", async () => {
  assert.equal(typeof loadRecentRuns, "function");
  assert.equal(typeof loadFlowSet, "function");
  assert.equal(typeof loadPendingServers, "function");
  assert.equal(typeof loadUnassigned, "function");
  assert.equal(typeof loadPolicyFact, "function");
  const signal = new AbortController().signal;

  const cases: readonly { label: string; run: (client: Pick<ApiClient, "get">) => Promise<unknown> }[] = [
    { label: "loadRecentRuns", run: (client) => loadRecentRuns(client, signal) },
    { label: "loadFlowSet", run: (client) => loadFlowSet(client, signal) },
    { label: "loadPendingServers", run: (client) => loadPendingServers(client, signal) },
    { label: "loadUnassigned", run: (client) => loadUnassigned(client, signal) },
    { label: "loadPolicyFact", run: (client) => loadPolicyFact(client, signal) },
  ];

  for (const entry of cases) {
    const failure = new ApiRequestError(500, "INTERNAL", "x");
    const recording = fake(failure);
    await assert.rejects(
      entry.run(recording.client),
      (error: unknown) => error === failure,
      `${entry.label} rejects with the same error`,
    );
    assert.equal(recording.calls.length, 1, `${entry.label} made one call`);
  }
});

test("C-4771fd19 each loader lets an abort error pass through", async () => {
  assert.equal(typeof loadRecentRuns, "function");
  assert.equal(typeof loadFlowSet, "function");
  assert.equal(typeof loadPendingServers, "function");
  assert.equal(typeof loadUnassigned, "function");
  assert.equal(typeof loadPolicyFact, "function");
  const signal = new AbortController().signal;
  const abort = new DOMException("aborted", "AbortError");

  const cases: readonly { label: string; run: (client: Pick<ApiClient, "get">) => Promise<unknown> }[] = [
    { label: "loadRecentRuns", run: (client) => loadRecentRuns(client, signal) },
    { label: "loadFlowSet", run: (client) => loadFlowSet(client, signal) },
    { label: "loadPendingServers", run: (client) => loadPendingServers(client, signal) },
    { label: "loadUnassigned", run: (client) => loadUnassigned(client, signal) },
    { label: "loadPolicyFact", run: (client) => loadPolicyFact(client, signal) },
  ];

  for (const entry of cases) {
    const recording = fake(abort);
    await assert.rejects(
      entry.run(recording.client),
      (error: unknown) => error === abort,
      `${entry.label} rejects with the abort error`,
    );
    assert.equal(recording.calls.length, 1, `${entry.label} made one call`);
  }
});
