/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { decisionsView, decisionsWanted, loadDecisions } from "./decisions.ts";
import type { DecisionLoad, DecisionViewWeb } from "./decisions.ts";
import { registerRunMessages } from "./messages.ts";
import type { RunView } from "./types.ts";

const HASH = "sha256:" + "a".repeat(64);
const RUN: RunView = {
  id: "run_1",
  flowId: "demo-grants",
  flowHash: HASH,
  mode: "stub",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: null,
  outputRef: null,
  createdAt: "2026-11-06T10:00:00.000000Z",
  startedAt: "2026-11-06T10:00:01.000000Z",
  endedAt: "2026-11-06T10:00:02.000000Z",
};

function permit(path: string): NonNullable<DecisionViewWeb["permit"]> {
  return {
    method: "POST",
    host: "tools.fake.test",
    path,
    serviceId: "0b2f7e1c-5d0a-4c4e-9a51-3f2b8d6c1e01",
    ttlSeconds: 60,
  };
}

function view(id: string, node: string, path: string): DecisionViewWeb {
  return {
    decisionId: id,
    nodeId: node,
    resource: `Block::"tenant_a/demo-grants/${node}"`,
    decision: "allow",
    reasons: ["g-" + node],
    permit: permit(path),
  };
}

const R2 = view("dec_2", "lookup", "/blocks/erp.lookup_vendor@1");
const R3 = view("dec_3", "pay", "/blocks/erp.create_payment@1");

type Recorded = [string, unknown];

function fakeClient(answer: (query: Record<string, unknown>) => unknown): {
  client: { get: <T>(path: string, opts?: unknown) => Promise<T> };
  records: Recorded[];
} {
  const records: Recorded[] = [];
  const client = {
    get: <T>(path: string, opts?: unknown): Promise<T> => {
      records.push([path, opts]);
      const query = (opts as { query?: Record<string, unknown> } | undefined)?.query ?? {};
      return Promise.resolve(answer(query) as T);
    },
  };
  return { client: client as never, records };
}

test("C-0d1cacce loadDecisions follows the cursor across two pages", async () => {
  const { client, records } = fakeClient((query) =>
    query["cursor"] === "c1"
      ? { items: [R3], next_cursor: null }
      : { items: [R2], next_cursor: "c1" },
  );
  const result = await loadDecisions(client, "run_1");
  assert.deepEqual(records, [
    ["/runs/run_1/decisions", { query: { limit: 100 } }],
    ["/runs/run_1/decisions", { query: { limit: 100, cursor: "c1" } }],
  ]);
  assert.deepEqual(result, { decisions: [R2, R3], truncated: false });
});

test("C-0d1cacce loadDecisions stops after five pages and says truncated", async () => {
  const { client, records } = fakeClient(() => ({ items: [], next_cursor: "c" }));
  const result = await loadDecisions(client, "run_1");
  assert.equal(records.length, 5);
  assert.deepEqual(result, { decisions: [], truncated: true });
});

test("C-0d1cacce loadDecisions refuses an unreadable page and a bad run id", async () => {
  const bad = fakeClient(() => ({ items: [{ nope: 1 }], next_cursor: null }));
  await assert.rejects(loadDecisions(bad.client, "run_1"), (error: unknown) => {
    assert.ok(error instanceof ApiRequestError);
    assert.equal(error.status, 200);
    assert.equal(error.code, "INVALID_RESPONSE");
    assert.equal(error.message, "Invalid decisions");
    return true;
  });
  const none = fakeClient(() => ({ items: [], next_cursor: null }));
  await assert.rejects(loadDecisions(none.client, "bad id!"), {
    name: "RangeError",
    message: "runId must match ^[A-Za-z0-9_-]{1,128}$",
  });
  assert.equal(none.records.length, 0);
});

test("C-0d1cacce decisionsWanted is true for a finished run that is not a mock run", () => {
  const values = [
    RUN,
    { ...RUN, state: "failed" },
    { ...RUN, state: "cancelled" },
    { ...RUN, state: "running" },
    { ...RUN, state: "queued" },
    { ...RUN, mode: "mock" },
    null,
  ] as (RunView | null)[];
  assert.deepEqual(values.map((run) => decisionsWanted(run)), [true, true, true, false, false, false, false]);
});

test("C-0d1cacce decisionsView gives the section of each state", () => {
  registerRunMessages();
  const ready = (decisions: DecisionViewWeb[], truncated = false): DecisionLoad => ({
    phase: "ready",
    decisions,
    truncated,
  });
  const failed = (error: unknown): DecisionLoad => ({ phase: "error", error });
  const mock = { ...RUN, mode: "mock" } as RunView;
  const running = { ...RUN, state: "running" } as RunView;

  assert.deepEqual(decisionsView(null, [], undefined), { kind: "hidden" });
  assert.deepEqual(decisionsView(mock, [], ready([R2])), { kind: "hidden" });
  assert.deepEqual(decisionsView(running, [], undefined), { kind: "hidden" });
  assert.deepEqual(decisionsView(RUN, [], undefined), { kind: "loading" });
  assert.deepEqual(decisionsView(RUN, [], { phase: "loading" }), { kind: "loading" });

  const denied = decisionsView(
    RUN,
    [],
    failed(new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "dec_9" } })),
  );
  assert.deepEqual(denied, {
    kind: "error",
    message:
      "You are not allowed to do this. If you think you should be, give the decision id to an administrator. Decision id: dec_9",
  });
  const unreadable = { kind: "error", message: "Policy decisions could not be read." };
  assert.deepEqual(
    decisionsView(RUN, [], failed(new ApiRequestError(200, "INVALID_RESPONSE", "Invalid decisions"))),
    unreadable,
  );
  assert.deepEqual(decisionsView(RUN, [], failed(new Error("x"))), unreadable);
  assert.deepEqual(decisionsView(RUN, [], ready([])), {
    kind: "empty",
    text: "No policy decisions were recorded.",
  });

  const rows = decisionsView(RUN, [], ready([R2, R3], true));
  assert.equal(rows.kind, "rows");
  if (rows.kind === "rows") {
    assert.deepEqual(
      rows.rows.map((row) => row.text),
      [
        "lookup · allow · POST tools.fake.test/blocks/erp.lookup_vendor@1",
        "pay · allow · POST tools.fake.test/blocks/erp.create_payment@1",
      ],
    );
    assert.equal(rows.note, "Showing the first 500 decisions.");
  }
});
