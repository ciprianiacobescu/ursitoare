/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { CursorPage, FetchPage } from "../kit/data/cursor-list.ts";
import type { ValidationView } from "./diagnostics.ts";
import {
  loadVersion,
  parseVersion,
  parseVersionDetail,
  saveVersion,
  validateVersion,
  versionListFetcher,
} from "./versions.ts";
import type { SaveResult, ValidateResult, VersionDetailRow, VersionRow } from "./versions.ts";

assert.equal(typeof saveVersion, "function");

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

const R: ValidationView = {
  ok: false,
  errors: [
    {
      layer: "L2",
      code: "L2_UNKNOWN_BLOCK",
      node: "fetch",
      path: "/nodes/fetch/uses",
      message: 'block "nope.missing@1" is not in the catalogue',
    },
  ],
  warnings: [
    {
      layer: "L3",
      code: "W_LETHAL_TRIFECTA",
      node: null,
      path: "/nodes",
      message: "flow reads untrusted content",
    },
    {
      layer: "L1",
      code: "W_X",
      node: null,
      path: "",
      message: "m",
    },
  ],
  layers_run: ["L1", "L2", "L3"],
};

const DETAIL: VersionDetailRow = {
  ...V,
  text: "flow: rf-1-core\n",
  canonical: { flow: "rf-1-core" },
  result: R,
};

function parsedVersion(raw: unknown, label: string): VersionRow | null {
  let result: VersionRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseVersion(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as VersionRow | null;
}

function parsedDetail(raw: unknown, label: string): VersionDetailRow | null {
  let result: VersionDetailRow | null | undefined;
  assert.doesNotThrow(() => {
    result = parseVersionDetail(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== undefined, `${label} returned an answer`);
  return result as VersionDetailRow | null;
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

async function saved(
  client: Pick<ApiClient, "post">,
  input: { flowId: string; text: string },
  key: string,
): Promise<SaveResult> {
  let result: SaveResult | undefined;
  await assert.doesNotReject(async () => {
    result = await saveVersion(client, input, key);
  }, "saving a version resolves");
  assert.ok(result !== undefined, "saving a version returned a result");
  return result;
}

async function loaded(
  client: Pick<ApiClient, "get">,
  flowId: string,
  hash: string,
  signal?: AbortSignal,
): Promise<VersionDetailRow> {
  let result: VersionDetailRow | undefined;
  await assert.doesNotReject(async () => {
    result = await loadVersion(client, flowId, hash, signal);
  }, "loading a version resolves");
  assert.ok(result !== undefined, "loading a version returned its detail");
  return result;
}

async function validated(
  client: Pick<ApiClient, "post">,
  flowId: string,
  hash: string,
): Promise<ValidateResult> {
  let result: ValidateResult | undefined;
  await assert.doesNotReject(async () => {
    result = await validateVersion(client, flowId, hash);
  }, "validating a version resolves");
  assert.ok(result !== undefined, "validating a version returned a result");
  return result;
}

test("C-94bf935b parseVersion keeps a valid version and refuses rule-breaking ones", () => {
  assert.deepEqual(parsedVersion(V, "the version"), V, "the valid version is kept");
  assert.deepEqual(
    parsedVersion({ ...V, extra: true }, "the version with an extra property"),
    V,
    "an unknown property is ignored",
  );

  assert.equal(parsedVersion(null, "a null body"), null, "a null body is refused");
  assert.equal(parsedVersion({ ...V, flowId: "Bad_Name" }, "a bad flow id"), null);
  assert.equal(parsedVersion({ ...V, number: 0 }, "a zero number"), null);
  assert.equal(parsedVersion({ ...V, number: 1.5 }, "a fractional number"), null);
  assert.equal(parsedVersion({ ...V, hash: "sha256:zz" }, "a bad hash"), null);
  assert.equal(parsedVersion({ ...V, state: "weird" }, "an unknown state"), null);
  assert.equal(parsedVersion({ ...V, surface: "xml" }, "an unknown surface"), null);
  assert.equal(parsedVersion({ ...V, author: "" }, "an empty author"), null);
  assert.equal(parsedVersion({ ...V, author: "x".repeat(201) }, "a 201 character author"), null);
  assert.equal(parsedVersion({ ...V, createdAt: "2026-10-25" }, "a bad created time"), null);
  assert.equal(parsedVersion({ ...V, validatedAt: "yesterday" }, "a bad validated time"), null);
  assert.equal(parsedVersion({ ...V, requestedBy: 5 }, "a numeric requester"), null);
  assert.equal(parsedVersion({ ...V, validationOk: "yes" }, "a text validation flag"), null);
});

test("C-94bf935b parseVersionDetail keeps a valid detail and refuses rule-breaking ones", () => {
  assert.deepEqual(parsedDetail(DETAIL, "the version detail"), DETAIL, "the valid detail is kept");
  assert.deepEqual(
    parsedDetail({ ...DETAIL, result: null }, "the unvalidated detail"),
    { ...DETAIL, result: null },
    "a null result is kept",
  );
  assert.deepEqual(
    parsedDetail({ ...DETAIL, extra: true }, "the detail with an extra property"),
    DETAIL,
    "an unknown property is ignored",
  );

  assert.equal(parsedDetail(null, "a null body"), null, "a null body is refused");
  assert.equal(parsedDetail({ ...DETAIL, text: 5 }, "a numeric text"), null);
  assert.equal(parsedDetail({ ...DETAIL, result: { ok: "yes" } }, "a bad result"), null);
  assert.equal(parsedDetail({ ...DETAIL, hash: "sha256:zz" }, "a bad hash"), null);
});

test("C-94bf935b saveVersion sends the detected format with an idempotency key", async () => {
  const yaml = recordingPostClient({ version: V, created: true });
  const first = await saved(
    yaml.client,
    { flowId: "rf-1-core", text: "flow: rf-1-core\n" },
    "k1",
  );
  assert.deepEqual(first, { version: V, created: true }, "the saved version is read");
  assert.equal(yaml.calls.length, 1, "the client got one call");
  assert.deepEqual(
    yaml.calls[0],
    {
      path: "/flows/rf-1-core/versions",
      body: { format: "yaml", text: "flow: rf-1-core\n" },
      opts: { headers: { "Idempotency-Key": "k1" } },
    },
    "the YAML text is sent with its key",
  );

  const json = recordingPostClient({ version: V, created: false });
  const second = await saved(
    json.client,
    { flowId: "rf-1-core", text: '{"flow":"rf-1-core"}' },
    "k1",
  );
  assert.deepEqual(second, { version: V, created: false }, "the existing version is read");
  assert.deepEqual(
    json.calls[0],
    {
      path: "/flows/rf-1-core/versions",
      body: { format: "json", text: '{"flow":"rf-1-core"}' },
      opts: { headers: { "Idempotency-Key": "k1" } },
    },
    "the JSON text is sent with its key",
  );
});

test("C-94bf935b saveVersion refuses a bad flow id empty text and an oversized text", async () => {
  const badId = recordingPostClient({ version: V, created: true });
  await assert.rejects(
    saveVersion(badId.client, { flowId: "../x", text: "flow: rf-1-core\n" }, "k1"),
    RangeError,
    "a path-like flow id is refused",
  );
  assert.equal(badId.calls.length, 0, "nothing was sent for the bad flow id");

  const empty = recordingPostClient({ version: V, created: true });
  await assert.rejects(
    saveVersion(empty.client, { flowId: "rf-1-core", text: "" }, "k1"),
    RangeError,
    "an empty text is refused",
  );
  assert.equal(empty.calls.length, 0, "nothing was sent for the empty text");

  const oversized = recordingPostClient({ version: V, created: true });
  await assert.rejects(
    saveVersion(oversized.client, { flowId: "rf-1-core", text: "x".repeat(1_048_577) }, "k1"),
    RangeError,
    "an oversized text is refused",
  );
  assert.equal(oversized.calls.length, 0, "nothing was sent for the oversized text");
});

test("C-94bf935b saveVersion rejects an answer whose created is not a boolean", async () => {
  const unreadable = recordingPostClient({ version: V, created: "yes" });
  await assert.rejects(
    saveVersion(unreadable.client, { flowId: "rf-1-core", text: "flow: rf-1-core\n" }, "k1"),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable save answer rejects with INVALID_RESPONSE",
  );
});

test("C-94bf935b loadVersion reads the encoded hash path and passes its signal", async () => {
  const signal = new AbortController().signal;
  const withSignal = recordingGetClient(DETAIL);
  const detail = await loaded(withSignal.client, "rf-1-core", H, signal);
  assert.deepEqual(detail, DETAIL, "the loaded detail is read");
  assert.equal(withSignal.calls.length, 1, "the client got one call");
  assert.deepEqual(
    withSignal.calls[0],
    {
      path: `/flows/rf-1-core/versions/${encodeURIComponent(H)}`,
      opts: { signal },
    },
    "the encoded hash is in the path and the signal is passed",
  );

  const noSignal = recordingGetClient(DETAIL);
  await loaded(noSignal.client, "rf-1-core", H);
  assert.deepEqual(
    noSignal.calls[0],
    {
      path: `/flows/rf-1-core/versions/${encodeURIComponent(H)}`,
      opts: undefined,
    },
    "a call without a signal carries no options",
  );

  const badHash = recordingGetClient(DETAIL);
  await assert.rejects(
    loadVersion(badHash.client, "rf-1-core", "sha256:zz"),
    RangeError,
    "a bad hash is refused",
  );
  assert.equal(badHash.calls.length, 0, "nothing was sent for the bad hash");

  const unreadable = recordingGetClient({ flowId: 1 });
  await assert.rejects(
    loadVersion(unreadable.client, "rf-1-core", H),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable detail rejects with INVALID_RESPONSE",
  );
});

test("C-94bf935b versionListFetcher pages the versions path and refuses a bad item", async () => {
  const recording = recordingGetClient({ items: [V], next_cursor: null });
  let holder: FetchPage<VersionRow> | undefined;
  assert.doesNotThrow(() => {
    holder = versionListFetcher(recording.client, "rf-1-core");
  }, "the version fetcher is created");
  assert.ok(holder !== undefined, "the version fetcher was produced");
  const fetch = holder;

  const signal = new AbortController().signal;
  let page: CursorPage<VersionRow> | undefined;
  await assert.doesNotReject(async () => {
    page = await fetch({ cursor: null, limit: 50, signal });
  }, "the first page resolves");
  assert.ok(page !== undefined, "the first page was produced");
  assert.deepEqual(page, { items: [V], next_cursor: null }, "the page carries the parsed version");
  assert.equal(recording.calls.length, 1, "the client got one call");
  assert.deepEqual(
    recording.calls[0],
    {
      path: "/flows/rf-1-core/versions",
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
      path: "/flows/rf-1-core/versions",
      opts: { query: { limit: 50, cursor: "c1" }, signal },
    },
    "the next page carries the cursor",
  );

  const unreadable = recordingGetClient({ items: [{ flowId: 1 }], next_cursor: null });
  let badFetcher: FetchPage<VersionRow> | undefined;
  assert.doesNotThrow(() => {
    badFetcher = versionListFetcher(unreadable.client, "rf-1-core");
  }, "the fetcher over the bad answer is created");
  assert.ok(badFetcher !== undefined, "the fetcher over the bad answer was produced");
  await assert.rejects(
    badFetcher({ cursor: null, limit: 50, signal }),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "a bad item rejects with INVALID_RESPONSE",
  );
});

test("C-36b16be8 validateVersion posts to the validate path without a body", async () => {
  const recording = recordingPostClient({ version: V, result: R });
  const result = await validated(recording.client, "rf-1-core", H);
  assert.deepEqual(result, { version: V, result: R }, "the validation answer is read");
  assert.equal(recording.calls.length, 1, "the client got one call");
  assert.deepEqual(
    recording.calls[0],
    {
      path: `/flows/rf-1-core/versions/${encodeURIComponent(H)}/validate`,
      body: undefined,
      opts: undefined,
    },
    "the validate call carries no body and no options",
  );
});

test("C-36b16be8 validateVersion rejects an answer with an unknown layer", async () => {
  const unreadable = recordingPostClient({
    version: V,
    result: { ...R, layers_run: ["L9"] },
  });
  await assert.rejects(
    validateVersion(unreadable.client, "rf-1-core", H),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unknown layer rejects with INVALID_RESPONSE",
  );
});
