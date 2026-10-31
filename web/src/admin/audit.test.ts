/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { CursorPage, FetchPage, PageRequest } from "../kit/data/cursor-list.ts";
import { ADMIN_PAGES, featureLiterals } from "./pages.ts";
import type { FeatureLiterals } from "./pages.ts";
import { auditCells, auditFetcher, parseAuditEvent, parseEventTypeFilter } from "./audit.ts";
import type { AuditCells, AuditEvent } from "./audit.ts";

assert.equal(typeof parseAuditEvent, "function");

const EVENT_BODY: Readonly<Record<string, unknown>> = {
  seq: "17",
  at: "2026-10-25T09:00:00.123456Z",
  eventType: "identity.group_mapped",
  actor: { kind: "user", id: "u_carol" },
  target: null,
  payload: { group: "ursitoare-auditors" },
  origin: "ursitoare",
};

const EVENT = {
  seq: "17",
  at: "2026-10-25T09:00:00.123456Z",
  eventType: "identity.group_mapped",
  actor: { kind: "user", id: "u_carol" },
  target: null,
  payload: { group: "ursitoare-auditors" },
} as const satisfies AuditEvent;

const FILTER_MESSAGE =
  "Event types are lower-case words separated by dots, for example identity.group_mapped.";

const FEATURE_URL = new URL("../features/63-admin-audit.tsx", import.meta.url);

function parsed(raw: unknown, label: string): AuditEvent {
  let result: AuditEvent | null | undefined;
  assert.doesNotThrow(() => {
    result = parseAuditEvent(raw);
  }, `${label} parses without throwing`);
  assert.ok(result !== null && result !== undefined, `${label} parses to an event`);
  return result as AuditEvent;
}

function refused(raw: unknown, label: string): void {
  let result: AuditEvent | null | undefined;
  assert.doesNotThrow(() => {
    result = parseAuditEvent(raw);
  }, `${label} parses without throwing`);
  assert.equal(result, null, `${label} is refused`);
}

function cells(event: AuditEvent, label: string): AuditCells {
  let result: AuditCells | undefined;
  assert.doesNotThrow(() => {
    result = auditCells(event);
  }, `${label} builds cells without throwing`);
  assert.ok(result !== undefined, `${label} produced cells`);
  return result;
}

type FilterResult = ReturnType<typeof parseEventTypeFilter>;

function filter(text: string, label: string): FilterResult {
  let result: FilterResult | undefined;
  assert.doesNotThrow(() => {
    result = parseEventTypeFilter(text);
  }, `${label} is checked without throwing`);
  assert.ok(result !== undefined, `${label} produced a check result`);
  return result as FilterResult;
}

type Fetcher = ReturnType<typeof auditFetcher>;

function fetcher(client: Pick<ApiClient, "get">, eventType: string | null, label: string): Fetcher {
  let result: Fetcher | undefined;
  assert.doesNotThrow(() => {
    result = auditFetcher(client, eventType);
  }, `${label} is built without throwing`);
  assert.ok(result !== undefined, `${label} produced a fetcher`);
  return result as Fetcher;
}

async function pageOf(
  fetchPage: FetchPage<AuditEvent>,
  request: PageRequest,
  label: string,
): Promise<CursorPage<AuditEvent>> {
  let result: CursorPage<AuditEvent> | undefined;
  await assert.doesNotReject(async () => {
    result = await fetchPage(request);
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned a page`);
  return result as CursorPage<AuditEvent>;
}

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface RecordingGetClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGetClient(responses: readonly unknown[]): RecordingGetClient {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      const response = responses[calls.length - 1];
      assert.ok(response !== undefined, "the fetcher asked for a response that is not there");
      return response as T;
    },
  };
  return { client, calls };
}

test("C-71033976 parseAuditEvent keeps a valid event and refuses malformed bodies", () => {
  const event = parsed(EVENT_BODY, "the event");
  assert.deepEqual(event, EVENT, "the event is kept without the origin field");

  refused({ ...EVENT_BODY, seq: "017" }, "a zero padded event number");
  refused({ ...EVENT_BODY, payload: [] }, "an array payload");
  refused({ ...EVENT_BODY, eventType: "Bad" }, "an upper case event type");
});

test("C-71033976 auditCells shows seq time type actor target and details", () => {
  assert.deepEqual(cells(parsed(EVENT_BODY, "the event"), "the event"), {
    seq: "17",
    time: "2026-10-25 09:00:00 UTC",
    type: "identity.group_mapped",
    actor: "user: u_carol",
    target: "—",
    details: '{"group":"ursitoare-auditors"}',
  });

  const answered = parsed(
    { ...EVENT_BODY, payload: {}, target: { kind: "action", id: "manage_users_roles" } },
    "the event without a payload",
  );
  const answeredCells = cells(answered, "the event without a payload");
  assert.equal(answeredCells.details, "—", "an empty payload shows a dash");
  assert.equal(
    answeredCells.target,
    "action: manage_users_roles",
    "an action target is shown as kind: id",
  );

  const oddTime: AuditEvent = { ...EVENT, at: "not a time" };
  assert.equal(
    cells(oddTime, "the event with an unreadable time").time,
    "not a time",
    "an unreadable time is kept as it came",
  );
});

test("C-71033976 a 300 character payload leaves 240 details characters ending in an ellipsis", () => {
  const longPayload = { k: "x".repeat(292) };
  assert.equal(
    JSON.stringify(longPayload).length,
    300,
    "the test payload serialises to three hundred characters",
  );
  const longEvent = parsed(
    { ...EVENT_BODY, payload: longPayload },
    "the event with the long payload",
  );
  const serialised = JSON.stringify(longEvent.payload);
  const details = cells(longEvent, "the event with the long payload").details;
  assert.equal(details.length, 240, "the details cell is two hundred and forty characters long");
  assert.ok(details.endsWith("…"), "the cut details cell ends with an ellipsis");
  assert.equal(
    details,
    `${serialised.slice(0, 239)}…`,
    "the details cell keeps the first two hundred and thirty nine characters",
  );
});

test("C-1e5047ed parseEventTypeFilter trims the text and refuses an unknown shape", () => {
  assert.deepEqual(filter("  ", "a blank filter"), { ok: true, value: null });
  assert.deepEqual(filter(" authz.denied ", "a padded filter"), {
    ok: true,
    value: "authz.denied",
  });
  assert.deepEqual(filter("Authz", "an upper case filter"), { ok: false, message: FILTER_MESSAGE });
});

test("C-1e5047ed auditFetcher asks the audit path with the event type and the page limit", async () => {
  const recording = recordingGetClient([
    { items: [EVENT_BODY], next_cursor: null },
    { items: [], next_cursor: "c1" },
  ]);
  const filtered = fetcher(recording.client, "authz.denied", "the filtered fetcher");

  const signal = new AbortController().signal;
  const first = await pageOf(
    filtered,
    { cursor: null, limit: 25, signal },
    "the first filtered page",
  );
  assert.deepEqual(first.items, [EVENT], "the page carries the parsed event");
  assert.equal(first.next_cursor, null, "the page carries the cursor of the engine");

  const second = await pageOf(
    filtered,
    { cursor: "c1", limit: 25, signal },
    "the second filtered page",
  );
  assert.deepEqual(second.items, [], "the empty page is returned");

  assert.equal(recording.calls.length, 2, "the client got two calls");
  const firstCall = recording.calls[0];
  assert.ok(firstCall !== undefined, "the first call was recorded");
  assert.equal(firstCall.path, "/audit", "the events are read on the audit path");
  assert.deepEqual(firstCall.opts, { query: { event_type: "authz.denied", limit: 25 }, signal });
  const secondCall = recording.calls[1];
  assert.ok(secondCall !== undefined, "the second call was recorded");
  assert.deepEqual(secondCall.opts, {
    query: { event_type: "authz.denied", limit: 25, cursor: "c1" },
    signal,
  });
});

test("C-1e5047ed auditFetcher without a type asks only the page limit and refuses an unreadable event", async () => {
  const recording = recordingGetClient([{ items: [{ seq: "x" }], next_cursor: null }]);
  const unfiltered = fetcher(recording.client, null, "the unfiltered fetcher");

  const signal = new AbortController().signal;
  await assert.rejects(
    unfiltered({ cursor: null, limit: 25, signal }),
    (error: unknown) => error instanceof ApiRequestError && error.code === "INVALID_RESPONSE",
    "an unreadable event answers an invalid response",
  );

  assert.equal(recording.calls.length, 1, "the client got one call");
  const call = recording.calls[0];
  assert.ok(call !== undefined, "the call was recorded");
  assert.equal(call.path, "/audit", "the events are read on the audit path");
  assert.deepEqual(call.opts, { query: { limit: 25 }, signal });
});

test("C-bf07943b the admin audit feature file declares its literal page entry", () => {
  assert.ok(existsSync(FEATURE_URL), `${FEATURE_URL.pathname} must exist`);
  const source = readFileSync(FEATURE_URL, "utf8");
  const entry = ADMIN_PAGES.find((page) => page.id === "admin-audit");
  assert.ok(entry !== undefined, "the admin-audit page is listed");
  const expected: FeatureLiterals = {
    id: entry.id,
    path: entry.path,
    navLabel: entry.navLabel,
    capability: entry.capability,
  };

  let literal: FeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    literal = featureLiterals(source);
  }, "the feature file literals are read");
  assert.deepEqual(literal, expected, "the feature file declares its page entry without the file");
});
