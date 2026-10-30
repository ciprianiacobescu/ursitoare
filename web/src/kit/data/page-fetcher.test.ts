/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { QueryValue, RequestOptions } from "../../api/client.ts";
import { ApiRequestError } from "../../api/client.ts";
import { KitError } from "../errors.ts";
import type { CursorPage, FetchPage } from "./cursor-list.ts";
import { cursorPageFetcher, parseCursorPage } from "./page-fetcher.ts";

assert.equal(typeof parseCursorPage, "function");
assert.equal(typeof cursorPageFetcher, "function");

const MAX_CURSOR_LENGTH = 1024;

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function known<T>(value: T | undefined, name: string): T {
  assert.ok(value !== undefined, `${name} was produced`);
  return value;
}

async function run(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

interface Verdict {
  readonly ok: boolean;
  readonly value: unknown;
}

interface Slot {
  readonly promise: Promise<unknown>;
  readonly settle: (verdict: Verdict) => void;
}

function slot(): Slot {
  let setOk: ((value: unknown) => void) | undefined;
  let setFail: ((error: unknown) => void) | undefined;
  const promise = new Promise<unknown>((resolve, reject) => {
    setOk = resolve;
    setFail = reject;
  });
  return {
    promise,
    settle(verdict: Verdict): void {
      assert.ok(setOk !== undefined, "the call can be answered");
      assert.ok(setFail !== undefined, "the call can be refused");
      if (verdict.ok) {
        setOk(verdict.value);
      } else {
        setFail(verdict.value);
      }
    },
  };
}

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
  readonly slot: Slot;
}

interface FakeClient {
  readonly client: { get: <T>(path: string, opts?: Omit<RequestOptions, "body">) => Promise<T> };
  readonly calls: GetCall[];
}

function fakeClient(): FakeClient {
  const calls: GetCall[] = [];
  const client = {
    get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      const pending = slot();
      calls.push({ path, opts, slot: pending });
      return pending.promise as Promise<T>;
    },
  };
  return { client, calls };
}

function parsesToNull(body: unknown, name: string): void {
  let parsed: CursorPage<unknown> | null | undefined;
  assert.doesNotThrow(() => {
    parsed = parseCursorPage(body);
  }, `${name} was answered without throwing`);
  assert.equal(parsed, null, `${name} parses to null`);
}

test("C-d83105ac parseCursorPage accepts a well shaped page and rejects the rest", () => {
  let wellShaped: CursorPage<unknown> | null | undefined;
  assert.doesNotThrow(() => {
    wellShaped = parseCursorPage({ items: [1], next_cursor: "x", extra: true });
  }, "a page of the right shape parses");
  assert.deepEqual(known(wellShaped, "the parsed page"), { items: [1], next_cursor: "x" });

  parsesToNull(null, "a null body");
  parsesToNull({ items: {}, next_cursor: null }, "an items that is not an array");
  parsesToNull({ items: [], next_cursor: "" }, "an empty next_cursor");
  parsesToNull(42, "a body that is not an object");
  parsesToNull({ items: [], next_cursor: 5 }, "a next_cursor that is not a string");
  parsesToNull({ items: [], next_cursor: "c".repeat(MAX_CURSOR_LENGTH + 1) }, "an over long next_cursor");

  let atBound: CursorPage<unknown> | null | undefined;
  assert.doesNotThrow(() => {
    atBound = parseCursorPage({ items: [], next_cursor: "c".repeat(MAX_CURSOR_LENGTH) });
  }, "a next_cursor of 1024 characters parses");
  assert.deepEqual(
    known(atBound, "the bounded page"),
    { items: [], next_cursor: "c".repeat(MAX_CURSOR_LENGTH) },
  );
});

function textItem(raw: unknown): string | null {
  return typeof raw === "string" ? raw : null;
}

test("C-d83105ac the fetcher asks for limit and cursor and returns the parsed page", async () => {
  const fake = fakeClient();
  let holder: FetchPage<string> | undefined;
  assert.doesNotThrow(() => {
    holder = cursorPageFetcher(fake.client, "/flows", {
      parseItem: textItem,
      query: { status: "open" } as Readonly<Record<string, QueryValue>>,
    });
  }, "the fetcher is created over a fake client");
  const fetch = known(holder, "the fetcher");

  const signals: AbortSignal[] = [];
  const first = ((): Promise<CursorPage<string>> => {
    const controller = new AbortController();
    signals.push(controller.signal);
    return fetch({ cursor: null, limit: 25, signal: controller.signal });
  })();
  await run();
  assert.equal(fake.calls.length, 1, "the first run made one call");
  const firstGet = known(fake.calls.at(0), "the first client.get call");
  assert.equal(firstGet.path, "/flows", "client.get got the path");
  const firstOpts = known(firstGet.opts, "the options of the first call");
  assert.deepEqual(firstOpts.query, { status: "open", limit: 25 }, "the query carries limit, not a null cursor");
  assert.ok(firstOpts.signal instanceof AbortSignal, "the call carries the signal");
  firstGet.slot.settle({ ok: true, value: { items: ["a"], next_cursor: null } });
  await run();
  let firstPage: CursorPage<string> | undefined;
  await assert.doesNotReject(async () => {
    firstPage = await first;
  }, "the first run settles");
  assert.deepEqual(known(firstPage, "the first result"), { items: ["a"], next_cursor: null });

  const second = ((): Promise<CursorPage<string>> => {
    const controller = new AbortController();
    signals.push(controller.signal);
    return fetch({ cursor: "c1", limit: 25, signal: controller.signal });
  })();
  await run();
  assert.equal(fake.calls.length, 2, "the second run made one call");
  const secondGet = known(fake.calls.at(1), "the second client.get call");
  const secondOpts = known(secondGet.opts, "the options of the second call");
  assert.deepEqual(
    secondOpts.query,
    { status: "open", limit: 25, cursor: "c1" },
    "the query carries the cursor when it is not null",
  );
  assert.ok(secondOpts.signal instanceof AbortSignal, "the second call carries the signal");
  secondGet.slot.settle({ ok: true, value: { items: ["b"], next_cursor: null } });
  await run();
  await assert.doesNotReject(() => second, "the second run settles");

  assert.notEqual(signals.at(0), signals.at(1), "each run passed its own signal");
  assert.notDeepStrictEqual(firstPage, undefined as unknown as CursorPage<string>);
});

test("C-bea5ecec bad body item query and client error", async () => {
  assert.throws(
    () =>
      cursorPageFetcher(fakeClient().client, "/flows", {
        parseItem: textItem,
        query: { limit: 5 },
      }),
    isKitError("KIT_PROP_INVALID"),
    "a query with the limit key is rejected at creation",
  );
  assert.throws(
    () =>
      cursorPageFetcher(fakeClient().client, "/flows", {
        parseItem: textItem,
        query: { cursor: "c1" },
      }),
    isKitError("KIT_PROP_INVALID"),
    "a query with the cursor key is rejected at creation",
  );

  const fake = fakeClient();
  let holder: FetchPage<string> | undefined;
  assert.doesNotThrow(() => {
    holder = cursorPageFetcher(fake.client, "/flows", { parseItem: textItem });
  }, "the fetcher is created");
  const fetch = known(holder, "the fetcher");

  const first = fetch({ cursor: null, limit: 25, signal: new AbortController().signal });
  await run();
  const emptyCall = known(fake.calls.at(0), "the first client.get call");
  emptyCall.slot.settle({ ok: true, value: {} });
  await run();
  await assert.rejects(
    () => first,
    (error: unknown): boolean => {
      assert.ok(error instanceof ApiRequestError, "a bad body rejects with an ApiRequestError");
      assert.equal((error as ApiRequestError).status, 200, "the page error is a 200 status");
      assert.equal(
        (error as ApiRequestError).code,
        "INVALID_RESPONSE",
        "a bad body rejects with INVALID_RESPONSE",
      );
      return true;
    },
    "an empty object answer is a bad page",
  );

  const second = fetch({ cursor: null, limit: 25, signal: new AbortController().signal });
  await run();
  const itemCall = known(fake.calls.at(1), "the second client.get call");
  itemCall.slot.settle({ ok: true, value: { items: [5], next_cursor: null } });
  await run();
  await assert.rejects(
    () => second,
    (error: unknown): boolean => {
      assert.ok(error instanceof ApiRequestError, "a bad item rejects with an ApiRequestError");
      assert.equal(
        (error as ApiRequestError).code,
        "INVALID_RESPONSE",
        "a null parseItem rejects with INVALID_RESPONSE",
      );
      return true;
    },
    "an item that parses to null is a bad page",
  );

  const internal = new ApiRequestError(500, "INTERNAL", "x");
  const third = fetch({ cursor: null, limit: 25, signal: new AbortController().signal });
  await run();
  const errorCall = known(fake.calls.at(2), "the third client.get call");
  errorCall.slot.settle({ ok: false, value: internal });
  await run();
  await assert.rejects(
    () => third,
    (error: unknown): boolean => {
      assert.equal(error, internal, "the client's error passed through unchanged");
      return true;
    },
    "a client error is not rewritten",
  );
});
