/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { CursorPage, FetchPage } from "../kit/data/cursor-list.ts";
import {
  checkFlowName,
  checkOwnerTeam,
  flowCells,
  flowListFetcher,
  loadFlow,
  parseFlow,
  postFlow,
} from "./flows.ts";
import type { FlowCells, FlowRow } from "./flows.ts";
import type { VersionRow } from "./versions.ts";

assert.equal(typeof parseFlow, "function");

const FLOW_NAME_MESSAGE =
  "Use lower-case words joined by single hyphens, starting with a letter (up to 64 characters), for example rf-1-core.";
const TEAM_MESSAGE =
  "Use a lower-case letter first, then lower-case letters, digits, hyphens or underscores (up to 64 characters).";

const H = `sha256:${"a".repeat(64)}`;

const V: VersionRow = {
  flowId: "rf-1-core",
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

const FLOW: FlowRow = {
  flowId: "rf-1-core",
  ownerTeam: "finance",
  createdBy: "u1",
  createdAt: "2026-10-25T09:00:00.000000Z",
  versionCount: 2,
  latest: V,
};

function parsedFlow(raw: unknown, label: string): FlowRow | null {
  let result: FlowRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseFlow(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as FlowRow | null;
}

function cellsOf(row: FlowRow, label: string): FlowCells {
  let result: FlowCells | undefined;
  assert.doesNotThrow(() => {
    result = flowCells(row);
  }, `${label} gives its cells`);
  assert.ok(result !== undefined, `${label} returned its cells`);
  return result as FlowCells;
}

function checkedName(text: string): { ok: true; value: string } | { ok: false; message: string } {
  let result: { ok: true; value: string } | { ok: false; message: string } | undefined;
  assert.doesNotThrow(() => {
    result = checkFlowName(text);
  }, `the name ${JSON.stringify(text)} is checked`);
  assert.ok(result !== undefined, `the name ${JSON.stringify(text)} returned a check`);
  return result as { ok: true; value: string } | { ok: false; message: string };
}

function checkedTeam(text: string): { ok: true; value: string } | { ok: false; message: string } {
  let result: { ok: true; value: string } | { ok: false; message: string } | undefined;
  assert.doesNotThrow(() => {
    result = checkOwnerTeam(text);
  }, `the team ${JSON.stringify(text)} is checked`);
  assert.ok(result !== undefined, `the team ${JSON.stringify(text)} returned a check`);
  return result as { ok: true; value: string } | { ok: false; message: string };
}

interface PostCall {
  readonly path: string;
  readonly body: unknown;
  readonly opts: unknown;
}

interface RecordingPostClient {
  readonly client: Pick<ApiClient, "post">;
  readonly calls: PostCall[];
}

function recordingPostClient(response: unknown): RecordingPostClient {
  const calls: PostCall[] = [];
  const client: Pick<ApiClient, "post"> = {
    async post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, body, opts });
      return response as T;
    },
  };
  return { client, calls };
}

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface RecordingGetClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGetClient(response: unknown): RecordingGetClient {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      return response as T;
    },
  };
  return { client, calls };
}

async function posted(
  client: Pick<ApiClient, "post">,
  input: { name: string; ownerTeam: string },
  key: string,
): Promise<FlowRow> {
  let result: FlowRow | undefined;
  await assert.doesNotReject(async () => {
    result = await postFlow(client, input, key);
  }, "creating a flow resolves");
  assert.ok(result !== undefined, "creating a flow returned the flow");
  return result;
}

async function loaded(
  client: Pick<ApiClient, "get">,
  flowId: string,
  signal?: AbortSignal,
): Promise<FlowRow> {
  let result: FlowRow | undefined;
  await assert.doesNotReject(async () => {
    result = await loadFlow(client, flowId, signal);
  }, "loading a flow resolves");
  assert.ok(result !== undefined, "loading a flow returned the flow");
  return result;
}

test("C-b6b033e0 parseFlow keeps a valid flow and refuses rule-breaking ones", () => {
  assert.deepEqual(parsedFlow(FLOW, "the flow"), FLOW, "the valid flow is kept");

  const unsaved: FlowRow = { ...FLOW, latest: null, versionCount: 0 };
  assert.deepEqual(parsedFlow(unsaved, "the unsaved flow"), unsaved, "an unsaved flow is kept");

  const extra = { ...FLOW, x: true };
  assert.deepEqual(parsedFlow(extra, "the flow with an extra property"), FLOW, "an unknown property is ignored");

  assert.equal(parsedFlow(null, "a null body"), null, "a null body is refused");
  assert.equal(parsedFlow({ ...FLOW, flowId: "Bad_Name" }, "a bad flow id"), null);
  assert.equal(parsedFlow({ ...FLOW, ownerTeam: "Bad Team" }, "a bad owner team"), null);
  assert.equal(parsedFlow({ ...FLOW, versionCount: -1 }, "a negative version count"), null);
  assert.equal(parsedFlow({ ...FLOW, latest: { ...V, state: "weird" } }, "an unknown state"), null);
  assert.equal(parsedFlow({ ...FLOW, latest: { ...V, hash: "sha256:zz" } }, "a bad hash"), null);
});

test("C-b6b033e0 flowCells names the flow the team the versions and the latest version", () => {
  assert.deepEqual(
    cellsOf(FLOW, "the flow"),
    {
      flow: "rf-1-core",
      ownerTeam: "finance",
      versions: "2",
      latest: "Version 2, validated",
    },
    "a saved flow shows its validated latest version",
  );

  assert.deepEqual(
    cellsOf({ ...FLOW, latest: null, versionCount: 0 }, "the unsaved flow"),
    {
      flow: "rf-1-core",
      ownerTeam: "finance",
      versions: "0",
      latest: "Not saved yet",
    },
    "a flow without versions says so",
  );

  assert.deepEqual(
    cellsOf(
      { ...FLOW, latest: { ...V, state: "draft", validationOk: false } },
      "the flow with a failing draft",
    ),
    {
      flow: "rf-1-core",
      ownerTeam: "finance",
      versions: "2",
      latest: "Version 2, draft, validation found errors",
    },
    "a draft that failed validation says so",
  );
});

test("C-b6b033e0 flowListFetcher pages the flows path and refuses a bad item", async () => {
  const recording = recordingGetClient({ items: [FLOW], next_cursor: null });
  let holder: FetchPage<FlowRow> | undefined;
  assert.doesNotThrow(() => {
    holder = flowListFetcher(recording.client);
  }, "the flow fetcher is created");
  assert.ok(holder !== undefined, "the flow fetcher was produced");
  const fetch = holder;

  const signal = new AbortController().signal;
  let page: CursorPage<FlowRow> | undefined;
  await assert.doesNotReject(async () => {
    page = await fetch({ cursor: null, limit: 50, signal });
  }, "the first page resolves");
  assert.ok(page !== undefined, "the first page was produced");
  assert.deepEqual(page, { items: [FLOW], next_cursor: null }, "the page carries the parsed flow");
  assert.equal(recording.calls.length, 1, "the client got one call");
  assert.deepEqual(
    recording.calls[0],
    {
      path: "/flows",
      opts: { query: { limit: 50 }, signal },
    },
    "the first page asks for the limit without a cursor",
  );

  await assert.doesNotReject(async () => {
    await fetch({ cursor: "c1", limit: 50, signal });
  }, "the second page resolves");
  assert.deepEqual(
    recording.calls[1],
    {
      path: "/flows",
      opts: { query: { limit: 50, cursor: "c1" }, signal },
    },
    "the next page carries the cursor",
  );

  const unreadable = recordingGetClient({ items: [{ flowId: 1 }], next_cursor: null });
  let badFetcher: FetchPage<FlowRow> | undefined;
  assert.doesNotThrow(() => {
    badFetcher = flowListFetcher(unreadable.client);
  }, "the fetcher over the bad answer is created");
  assert.ok(badFetcher !== undefined, "the fetcher over the bad answer was produced");
  await assert.rejects(
    badFetcher({ cursor: null, limit: 50, signal }),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "a bad item rejects with INVALID_RESPONSE",
  );
});

test("C-b6b033e0 loadFlow reads the flow path and refuses a bad flow id", async () => {
  const signal = new AbortController().signal;
  const withSignal = recordingGetClient(FLOW);
  const flow = await loaded(withSignal.client, "rf-1-core", signal);
  assert.deepEqual(flow, FLOW, "the loaded flow is read");
  assert.equal(withSignal.calls.length, 1, "the client got one call");
  assert.deepEqual(
    withSignal.calls[0],
    { path: "/flows/rf-1-core", opts: { signal } },
    "the flow path carries the signal",
  );

  const noSignal = recordingGetClient(FLOW);
  await loaded(noSignal.client, "rf-1-core");
  assert.deepEqual(
    noSignal.calls[0],
    { path: "/flows/rf-1-core", opts: undefined },
    "a call without a signal carries no options",
  );

  const badId = recordingGetClient(FLOW);
  await assert.rejects(
    loadFlow(badId.client, "Bad_Name"),
    RangeError,
    "a bad flow id is refused",
  );
  assert.equal(badId.calls.length, 0, "nothing was sent for the bad flow id");

  const unreadable = recordingGetClient({ flowId: 1 });
  await assert.rejects(
    loadFlow(unreadable.client, "rf-1-core"),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable flow rejects with INVALID_RESPONSE",
  );
});

test("C-e71f3bcb checkFlowName checks a lower-case hyphenated name", () => {
  assert.deepEqual(
    checkedName(""),
    { ok: false, message: "Enter a flow name." },
    "an empty name asks for one",
  );

  for (const bad of ["Bad_Name", "a--b", "rf-1-", "a".repeat(65)]) {
    assert.deepEqual(
      checkedName(bad),
      { ok: false, message: FLOW_NAME_MESSAGE },
      `the name ${JSON.stringify(bad)} is refused`,
    );
  }

  assert.deepEqual(
    checkedName(" rf-1-core "),
    { ok: true, value: "rf-1-core" },
    "a padded valid name is trimmed and accepted",
  );
});

test("C-e71f3bcb checkOwnerTeam checks a lower-case team name", () => {
  assert.deepEqual(
    checkedTeam(""),
    { ok: false, message: "Enter the owner team." },
    "an empty team asks for one",
  );
  assert.deepEqual(
    checkedTeam("Fin ance"),
    { ok: false, message: TEAM_MESSAGE },
    "a team with a space and capitals is refused",
  );
  assert.deepEqual(
    checkedTeam("finance"),
    { ok: true, value: "finance" },
    "a valid team is accepted",
  );
});

test("C-e71f3bcb postFlow sends one idempotent request and refuses bad input", async () => {
  const recording = recordingPostClient(FLOW);
  const created = await posted(
    recording.client,
    { name: "rf-1-core", ownerTeam: "finance" },
    "k1",
  );
  assert.deepEqual(created, FLOW, "the created flow is read");
  assert.equal(recording.calls.length, 1, "the client got one call");
  assert.deepEqual(
    recording.calls[0],
    {
      path: "/flows",
      body: { name: "rf-1-core", ownerTeam: "finance" },
      opts: { headers: { "Idempotency-Key": "k1" } },
    },
    "the form is sent with its idempotency key",
  );

  const emptyKey = recordingPostClient(FLOW);
  await assert.rejects(
    postFlow(emptyKey.client, { name: "rf-1-core", ownerTeam: "finance" }, ""),
    RangeError,
    "an empty idempotency key is refused",
  );
  assert.equal(emptyKey.calls.length, 0, "nothing was sent for the empty key");

  const badName = recordingPostClient(FLOW);
  await assert.rejects(
    postFlow(badName.client, { name: "../x", ownerTeam: "finance" }, "k1"),
    RangeError,
    "a path-like flow name is refused",
  );
  assert.equal(badName.calls.length, 0, "nothing was sent for the bad name");

  const unreadable = recordingPostClient({ flowId: 1 });
  await assert.rejects(
    postFlow(unreadable.client, { name: "rf-1-core", ownerTeam: "finance" }, "k1"),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable create answer rejects with INVALID_RESPONSE",
  );
});
