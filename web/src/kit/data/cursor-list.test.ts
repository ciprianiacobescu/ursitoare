/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../../api/client.ts";
import { KitError } from "../errors.ts";
import type { CursorList, CursorPage, FetchPage, PageRequest } from "./cursor-list.ts";
import { createCursorList } from "./cursor-list.ts";

assert.equal(typeof createCursorList, "function");

const DEFAULT_LIMIT = 50;

interface Answer<T> {
  readonly ok: true;
  readonly page: CursorPage<T>;
}

interface Fault {
  readonly ok: false;
  readonly error: unknown;
}

type Verdict<T> = Answer<T> | Fault;

interface Slot<T> {
  readonly promise: Promise<CursorPage<T>>;
  readonly settle: (verdict: Verdict<T>) => void;
}

function slot<T>(): Slot<T> {
  let setOk: ((page: CursorPage<T>) => void) | undefined;
  let setFail: ((error: unknown) => void) | undefined;
  const promise = new Promise<CursorPage<T>>((resolve, reject) => {
    setOk = resolve;
    setFail = reject;
  });
  return {
    promise,
    settle(verdict: Verdict<T>): void {
      if (verdict.ok) {
        assert.ok(setOk !== undefined, "the request can be answered");
        setOk(verdict.page);
      } else {
        assert.ok(setFail !== undefined, "the request cannot be answered");
        setFail(verdict.error);
      }
    },
  };
}

interface Call {
  readonly request: PageRequest;
  readonly slot: Slot<string>;
}

interface FakePage {
  readonly fetchPage: FetchPage<string>;
  readonly calls: Call[];
}

function fakeFetchPage(): FakePage {
  const calls: Call[] = [];
  const fetchPage: FetchPage<string> = (request) => {
    const pending = slot<string>();
    calls.push({ request, slot: pending });
    return pending.promise;
  };
  return { fetchPage, calls };
}

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function loose(run: () => Promise<void>): Promise<void> {
  return new Promise<void>((resolve) => {
    resolve(run());
  });
}

async function run(): Promise<void> {
  for (let index = 0; index < 20; index += 1) {
    await Promise.resolve();
  }
}

interface Tracker {
  settled: boolean;
  rejected: boolean;
}

function track(promise: Promise<void>): Tracker {
  const tracker: Tracker = { settled: false, rejected: false };
  promise.then(
    () => {
      tracker.settled = true;
    },
    () => {
      tracker.settled = true;
      tracker.rejected = true;
    },
  );
  return tracker;
}

function callAt(calls: readonly Call[], index: number): Call {
  const recorded = calls.at(index);
  assert.ok(recorded !== undefined, `request ${index} was made`);
  return recorded;
}

function settledFrom(list: CursorList<string> | undefined, name: string): CursorList<string> {
  assert.ok(list !== undefined, `${name} was created`);
  return list;
}

test("C-4ad6d2b9 first page then load more", async () => {
  const { fetchPage, calls } = fakeFetchPage();
  let holder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    holder = createCursorList(fetchPage, { pageSize: 2 });
  }, "the list is created");
  const list = settledFrom(holder, "the list");

  const first = list.getState();
  assert.deepEqual(first, { status: "idle", items: [], nextCursor: null, error: null });

  const loadFirst = loose(() => list.load());
  await run();
  const firstCall = callAt(calls, 0);
  assert.deepEqual(
    { cursor: firstCall.request.cursor, limit: firstCall.request.limit },
    { cursor: null, limit: 2 },
  );
  assert.ok(firstCall.request.signal instanceof AbortSignal, "the first request carries a signal");

  assert.equal(calls.length, 1, "only the first page was requested");
  assert.deepEqual(list.getState(), {
    status: "loading",
    items: [],
    nextCursor: null,
    error: null,
  });

  firstCall.slot.settle({ ok: true, page: { items: ["a", "b"], next_cursor: "c1" } });
  await run();
  assert.deepEqual(list.getState(), {
    status: "loaded",
    items: ["a", "b"],
    nextCursor: "c1",
    error: null,
  });

  const loadMore = loose(() => list.loadMore());
  await run();
  assert.equal(calls.length, 2, "loadMore asked for the next page");
  const secondCall = callAt(calls, 1);
  assert.deepEqual(
    { cursor: secondCall.request.cursor, limit: secondCall.request.limit },
    { cursor: "c1", limit: 2 },
  );
  assert.ok(secondCall.request.signal instanceof AbortSignal, "the second request carries a signal");
  assert.ok(firstCall.request.signal !== secondCall.request.signal, "each request has its own signal");

  assert.deepEqual(list.getState(), {
    status: "loading",
    items: ["a", "b"],
    nextCursor: "c1",
    error: null,
  });

  secondCall.slot.settle({ ok: true, page: { items: ["c"], next_cursor: null } });
  await run();
  assert.deepEqual(list.getState(), {
    status: "loaded",
    items: ["a", "b", "c"],
    nextCursor: null,
    error: null,
  });

  await assert.doesNotReject(() => loadFirst, "load settles without rejecting");
  await assert.doesNotReject(() => loadMore, "loadMore settles without rejecting");
});

test("C-efc9d8f0 nothing to do", async () => {
  const { fetchPage, calls } = fakeFetchPage();
  let holder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    holder = createCursorList(fetchPage);
  }, "the list is created");
  const list = settledFrom(holder, "the list");

  await assert.doesNotReject(() => list.loadMore(), "loadMore on an idle list is a no-op that settles");

  const loadFirst = loose(() => list.load());
  await run();
  assert.equal(calls.length, 1, "the first page was requested");

  await assert.doesNotReject(() => list.loadMore(), "loadMore while loading is a no-op");
  await assert.doesNotReject(() => list.load(), "a second load while loading is a no-op");

  const firstCall = callAt(calls, 0);
  firstCall.slot.settle({ ok: true, page: { items: ["a"], next_cursor: null } });
  await run();
  assert.deepEqual(list.getState(), {
    status: "loaded",
    items: ["a"],
    nextCursor: null,
    error: null,
  });

  await assert.doesNotReject(() => list.loadMore(), "loadMore without a cursor is a no-op");
  await assert.doesNotReject(() => list.load(), "load again while loaded is a no-op");
  await assert.doesNotReject(() => list.retry(), "retry without an error is a no-op");
  await run();

  assert.equal(calls.length, 1, "fetchPage was called once in total");
  assert.deepEqual(list.getState(), {
    status: "loaded",
    items: ["a"],
    nextCursor: null,
    error: null,
  });
  await assert.doesNotReject(() => loadFirst, "the load settled");
});

test("C-98c49746 page size and subscribers", async () => {
  const { fetchPage, calls } = fakeFetchPage();

  for (const bad of [0, 201, 1.5]) {
    assert.throws(
      () => createCursorList(fetchPage, { pageSize: bad }),
      isKitError("KIT_PROP_INVALID"),
      `pageSize ${String(bad)} is rejected`,
    );
  }
  let bigHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    bigHolder = createCursorList(fetchPage, { pageSize: 200 });
  }, "pageSize 200 is accepted");
  settledFrom(bigHolder, "the pageSize 200 list");

  let defaultHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    defaultHolder = createCursorList(fetchPage);
  }, "a list without pageSize is created");
  const defaults = settledFrom(defaultHolder, "the default list");

  const loadDefault = loose(() => defaults.load());
  await run();
  const firstCall = callAt(calls, 0);
  assert.equal(firstCall.request.limit, DEFAULT_LIMIT, "the first request uses the default page size");

  const thrownCalls: number[] = [];
  const marked: string[] = [];
  const first = defaults.subscribe(() => {
    thrownCalls.push(1);
    marked.push("one");
    throw new Error("listener failure");
  });
  const second = defaults.subscribe(() => {
    marked.push("two");
  });
  assert.equal(typeof first, "function", "subscribe returns an unsubscribe function");
  assert.equal(typeof second, "function", "subscribe returns an unsubscribe function");

  firstCall.slot.settle({ ok: true, page: { items: ["a"], next_cursor: null } });
  await run();
  assert.deepEqual(marked, ["one", "two", "one", "two"], "the second subscriber saw every change");
  assert.deepEqual(thrownCalls, [1, 1], "the throwing subscriber was called too");

  assert.deepEqual(defaults.getState(), {
    status: "loaded",
    items: ["a"],
    nextCursor: null,
    error: null,
  });
  await assert.doesNotReject(() => loadDefault, "the load settled");
});

test("C-3d1d3680 failed pages and retry", async () => {
  const authz = fakeFetchPage();
  let authzHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    authzHolder = createCursorList(authz.fetchPage);
  }, "the first list is created");
  const authzList = settledFrom(authzHolder, "the first list");
  const loadAuthz = loose(() => authzList.load());
  await run();
  const authzCall = callAt(authz.calls, 0);
  const authzError = new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x");
  authzCall.slot.settle({ ok: false, error: authzError });
  await run();
  assert.deepEqual(authzList.getState(), { status: "error", items: [], nextCursor: null, error: authzError });
  const retryAuthz = loose(() => authzList.retry());
  await run();
  assert.equal(authz.calls.length, 2, "the retry repeated the failed request");
  const authzRetry = callAt(authz.calls, 1);
  assert.equal(authzRetry.request.cursor, null, "the retry request has cursor null");
  authzRetry.slot.settle({ ok: true, page: { items: ["a"], next_cursor: null } });
  await run();
  assert.deepEqual(authzList.getState(), {
    status: "loaded",
    items: ["a"],
    nextCursor: null,
    error: null,
  });
  await assert.doesNotReject(() => loadAuthz, "the first load settled");
  await assert.doesNotReject(() => retryAuthz, "the first retry settled");

  const network = fakeFetchPage();
  let networkHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    networkHolder = createCursorList(network.fetchPage);
  }, "the second list is created");
  const networkList = settledFrom(networkHolder, "the second list");
  const loadNetwork = loose(() => networkList.load());
  await run();
  callAt(network.calls, 0).slot.settle({ ok: true, page: { items: ["a", "b"], next_cursor: "c1" } });
  await run();
  assert.deepEqual(networkList.getState(), {
    status: "loaded",
    items: ["a", "b"],
    nextCursor: "c1",
    error: null,
  });
  const loadMoreNetwork = loose(() => networkList.loadMore());
  await run();
  const networkError = new ApiRequestError(0, "NETWORK_ERROR", "x");
  callAt(network.calls, 1).slot.settle({ ok: false, error: networkError });
  await run();
  assert.deepEqual(networkList.getState(), {
    status: "error",
    items: ["a", "b"],
    nextCursor: "c1",
    error: networkError,
  });
  const retryNetwork = loose(() => networkList.retry());
  await run();
  assert.equal(network.calls.length, 3, "the retry repeated the failed request");
  const networkRetry = callAt(network.calls, 2);
  assert.equal(networkRetry.request.cursor, "c1", "the retry request has cursor c1");
  networkRetry.slot.settle({ ok: true, page: { items: ["c"], next_cursor: null } });
  await run();
  assert.deepEqual(networkList.getState(), {
    status: "loaded",
    items: ["a", "b", "c"],
    nextCursor: null,
    error: null,
  });
  await assert.doesNotReject(() => loadNetwork, "the second load settled");
  await assert.doesNotReject(() => loadMoreNetwork, "the loadMore settled");
  await assert.doesNotReject(() => retryNetwork, "the second retry settled");

  const cursor = fakeFetchPage();
  let cursorHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    cursorHolder = createCursorList(cursor.fetchPage);
  }, "the third list is created");
  const cursorList = settledFrom(cursorHolder, "the third list");
  const loadCursor = loose(() => cursorList.load());
  await run();
  callAt(cursor.calls, 0).slot.settle({ ok: true, page: { items: ["a", "b"], next_cursor: "c1" } });
  await run();
  const loadMoreCursor = loose(() => cursorList.loadMore());
  await run();
  const cursorError = new ApiRequestError(400, "CURSOR_INVALID", "x");
  callAt(cursor.calls, 1).slot.settle({ ok: false, error: cursorError });
  await run();
  assert.deepEqual(cursorList.getState(), {
    status: "error",
    items: ["a", "b"],
    nextCursor: "c1",
    error: cursorError,
  });
  const retryCursor = loose(() => cursorList.retry());
  await run();
  assert.equal(cursor.calls.length, 3, "the retry asked for a page");
  const cursorRetry = callAt(cursor.calls, 2);
  assert.equal(cursorRetry.request.cursor, null, "the retry request has cursor null");
  assert.deepEqual(cursorList.getState(), {
    status: "loading",
    items: [],
    nextCursor: null,
    error: null,
  });
  cursorRetry.slot.settle({ ok: true, page: { items: ["z"], next_cursor: null } });
  await run();
  assert.deepEqual(cursorList.getState(), {
    status: "loaded",
    items: ["z"],
    nextCursor: null,
    error: null,
  });
  await assert.doesNotReject(() => loadCursor, "the third load settled");
  await assert.doesNotReject(() => loadMoreCursor, "the loadMore settled");
  await assert.doesNotReject(() => retryCursor, "the third retry settled");
});

test("C-79a9fd48 stale answer after reset", async () => {
  const fresh = fakeFetchPage();
  let freshHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    freshHolder = createCursorList(fresh.fetchPage);
  }, "the first list is created");
  const freshList = settledFrom(freshHolder, "the first list");

  const loadFirst = loose(() => freshList.load());
  await run();
  assert.equal(fresh.calls.length, 1, "the first load asked for a page");
  const firstCall = callAt(fresh.calls, 0);

  assert.doesNotThrow(() => {
    freshList.reset();
  }, "reset clears the list");
  assert.ok(firstCall.request.signal.aborted, "the request of the overtook load was aborted");
  assert.deepEqual(freshList.getState(), { status: "idle", items: [], nextCursor: null, error: null });

  const loadSecond = loose(() => freshList.load());
  await run();
  assert.equal(fresh.calls.length, 2, "the second load asked for a page");
  const secondCall = callAt(fresh.calls, 1);
  assert.equal(secondCall.request.cursor, null, "the second load starts at the first page");
  secondCall.slot.settle({ ok: true, page: { items: ["new"], next_cursor: null } });
  await run();
  assert.deepEqual(freshList.getState(), {
    status: "loaded",
    items: ["new"],
    nextCursor: null,
    error: null,
  });

  firstCall.slot.settle({ ok: true, page: { items: ["old"], next_cursor: null } });
  await run();
  assert.deepEqual(freshList.getState(), {
    status: "loaded",
    items: ["new"],
    nextCursor: null,
    error: null,
  }, "the stale answer changed nothing");
  await assert.doesNotReject(() => loadFirst, "the overtook load settled");
  await assert.doesNotReject(() => loadSecond, "the second load settled");

  const abort = fakeFetchPage();
  let abortHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    abortHolder = createCursorList(abort.fetchPage);
  }, "the second list is created");
  const abortList = settledFrom(abortHolder, "the second list");
  const loadAbort = loose(() => abortList.load());
  await run();
  const abortCall = callAt(abort.calls, 0);
  assert.doesNotThrow(() => {
    abortList.reset();
  }, "reset clears the second list");
  abortCall.slot.settle({ ok: false, error: new ApiRequestError(500, "INTERNAL", "x") });
  await run();
  assert.deepEqual(abortList.getState(), { status: "idle", items: [], nextCursor: null, error: null });
  await assert.doesNotReject(() => loadAbort, "the overtook load of the second list settled");
});

test("C-629f74f4 malformed page", async () => {
  const wrong = fakeFetchPage();
  let wrongHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    wrongHolder = createCursorList(wrong.fetchPage);
  }, "the first list is created");
  const wrongList = settledFrom(wrongHolder, "the first list");
  const loadWrong = loose(() => wrongList.load());
  await run();
  callAt(wrong.calls, 0).slot.settle({
    ok: true,
    page: { items: "x" as unknown as readonly string[], next_cursor: null },
  });
  await run();
  const wrongState = wrongList.getState();
  assert.equal(wrongState.status, "error", "the malformed page put the list in error");
  assert.deepEqual([...wrongState.items], [], "nothing was appended");
  const wrongError = wrongState.error;
  assert.ok(wrongError instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(wrongError.code, "INVALID_RESPONSE");
  await assert.doesNotReject(() => loadWrong, "the load settled");

  const repeated = fakeFetchPage();
  let repeatedHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    repeatedHolder = createCursorList(repeated.fetchPage);
  }, "the second list is created");
  const repeatedList = settledFrom(repeatedHolder, "the second list");
  const loadRepeated = loose(() => repeatedList.load());
  await run();
  callAt(repeated.calls, 0).slot.settle({ ok: true, page: { items: ["a", "b"], next_cursor: "c1" } });
  await run();
  assert.deepEqual(repeatedList.getState(), {
    status: "loaded",
    items: ["a", "b"],
    nextCursor: "c1",
    error: null,
  });
  const loadMore = loose(() => repeatedList.loadMore());
  await run();
  const repeatedCall = callAt(repeated.calls, 1);
  assert.equal(repeatedCall.request.cursor, "c1", "loadMore asked for cursor c1");
  repeatedCall.slot.settle({ ok: true, page: { items: ["c"], next_cursor: "c1" } });
  await run();
  const repeatedState = repeatedList.getState();
  assert.equal(repeatedState.status, "error", "the repeated cursor put the list in error");
  const repeatedError = repeatedState.error;
  assert.ok(repeatedError instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(repeatedError.code, "INVALID_RESPONSE");
  assert.deepEqual([...repeatedState.items], ["a", "b"], "nothing was appended");
  await assert.doesNotReject(() => loadRepeated, "the load settled");
  await assert.doesNotReject(() => loadMore, "the loadMore settled");
});

test("C-247ad9d2 load loadMore and retry settle with their request", async () => {
  const { fetchPage, calls } = fakeFetchPage();
  let holder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    holder = createCursorList(fetchPage);
  }, "the list is created");
  const list = settledFrom(holder, "the list");

  const loading = track(list.load());
  await run();
  assert.equal(calls.length, 1, "load started a request");
  assert.equal(loading.settled, false, "load waits while its page is unanswered");
  callAt(calls, 0).slot.settle({ ok: true, page: { items: ["a"], next_cursor: "c1" } });
  await run();
  assert.equal(loading.settled, true, "load settles once its page is committed");
  assert.equal(loading.rejected, false, "load never rejects");

  const more = track(list.loadMore());
  await run();
  assert.equal(calls.length, 2, "loadMore started a request");
  assert.equal(more.settled, false, "loadMore waits while its page is unanswered");
  callAt(calls, 1).slot.settle({ ok: true, page: { items: ["b"], next_cursor: null } });
  await run();
  assert.equal(more.settled, true, "loadMore settles once its page is committed");
  assert.equal(more.rejected, false, "loadMore never rejects");

  const failing = fakeFetchPage();
  let failingHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    failingHolder = createCursorList(failing.fetchPage);
  }, "the failing list is created");
  const failingList = settledFrom(failingHolder, "the failing list");
  const firstPage = track(failingList.load());
  await run();
  assert.equal(firstPage.settled, false, "load waits while its page is unanswered");
  callAt(failing.calls, 0).slot.settle({
    ok: false,
    error: new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x"),
  });
  await run();
  assert.equal(firstPage.settled, true, "load settles once its error is committed");
  assert.equal(firstPage.rejected, false, "load never rejects on a failed page");
  assert.equal(failingList.getState().status, "error", "the failure was committed");

  const retrying = track(failingList.retry());
  await run();
  assert.equal(failing.calls.length, 2, "retry started a request");
  assert.equal(retrying.settled, false, "retry waits while its page is unanswered");
  callAt(failing.calls, 1).slot.settle({ ok: true, page: { items: ["a"], next_cursor: null } });
  await run();
  assert.equal(retrying.settled, true, "retry settles once its page is committed");
  assert.equal(retrying.rejected, false, "retry never rejects");

  const droppedFake = fakeFetchPage();
  let droppedHolder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    droppedHolder = createCursorList(droppedFake.fetchPage);
  }, "the dropped list is created");
  const droppedList = settledFrom(droppedHolder, "the dropped list");
  const dropped = track(droppedList.load());
  await run();
  assert.equal(dropped.settled, false, "the load waits while its page is unanswered");
  assert.doesNotThrow(() => {
    droppedList.reset();
  }, "reset drops the request");
  await run();
  assert.equal(dropped.settled, true, "reset settles the promise it dropped");
  assert.equal(dropped.rejected, false, "reset never rejects the dropped load");
  assert.deepEqual(droppedList.getState(), { status: "idle", items: [], nextCursor: null, error: null });
});

test("C-efc9d8f0 C-247ad9d2 no-op calls settle at once while a request is in flight", async () => {
  const { fetchPage, calls } = fakeFetchPage();
  let holder: CursorList<string> | undefined;
  assert.doesNotThrow(() => {
    holder = createCursorList(fetchPage);
  }, "the list is created");
  const list = settledFrom(holder, "the list");

  const idleMore = track(list.loadMore());
  await run();
  assert.equal(idleMore.settled, true, "loadMore on an idle list settles at once");
  assert.equal(idleMore.rejected, false, "the idle no-op never rejects");

  const loading = track(list.load());
  await run();
  assert.equal(calls.length, 1, "load started the first request");
  assert.equal(loading.settled, false, "the load with a request in flight waits");

  const whileLoadingMore = track(list.loadMore());
  const whileLoadingLoad = track(list.load());
  await run();
  assert.equal(whileLoadingMore.settled, true, "loadMore while loading is a no-op that settles at once");
  assert.equal(whileLoadingLoad.settled, true, "a second load while loading is a no-op that settles at once");
  assert.equal(whileLoadingMore.rejected, false, "the loadMore no-op never rejects");
  assert.equal(whileLoadingLoad.rejected, false, "the second load no-op never rejects");
  assert.equal(calls.length, 1, "no-op calls start no request");

  callAt(calls, 0).slot.settle({ ok: true, page: { items: ["a"], next_cursor: null } });
  await run();
  assert.equal(loading.settled, true, "the started load settles once its page is committed");

  await assert.doesNotReject(() => list.loadMore(), "loadMore without a cursor is a no-op");
  await assert.doesNotReject(() => list.load(), "load again while loaded is a no-op");
  await assert.doesNotReject(() => list.retry(), "retry without an error is a no-op");
  await run();

  assert.equal(calls.length, 1, "fetchPage was called once in total");
  assert.deepEqual(list.getState(), {
    status: "loaded",
    items: ["a"],
    nextCursor: null,
    error: null,
  });
});
