/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { ApiRequestError, createApiClient } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import { createNameCache, loadMyTeams, nameCache } from "./people.ts";
import type { NameCache } from "./people.ts";

assert.equal(typeof createNameCache, "function");
assert.equal(typeof loadMyTeams, "function");
assert.equal(typeof nameCache.resolve, "function");

interface GetCall {
  readonly path: string;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

type GetAnswer = (
  path: string,
  opts: Omit<RequestOptions, "body"> | undefined,
) => Promise<unknown>;

interface RecordingGet {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: GetCall[];
}

function recordingGet(answer: GetAnswer): RecordingGet {
  const calls: GetCall[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, opts });
      return (await answer(path, opts)) as T;
    },
  };
  return { client, calls };
}

function cacheOf(api: Pick<ApiClient, "get">, maxBatch?: number): NameCache {
  let cache: NameCache | undefined;
  assert.doesNotThrow(() => {
    cache = maxBatch === undefined ? createNameCache(api) : createNameCache(api, maxBatch);
  }, "createNameCache returns a cache");
  assert.ok(cache !== undefined, "createNameCache returned a cache");
  return cache as NameCache;
}

async function resolveOf(
  cache: NameCache,
  ids: readonly string[],
  signal?: AbortSignal,
): Promise<ReadonlyMap<string, string>> {
  let value: ReadonlyMap<string, string> | undefined;
  await assert.doesNotReject(async () => {
    value = signal === undefined ? await cache.resolve(ids) : await cache.resolve(ids, signal);
  }, "resolve settles");
  assert.ok(value !== undefined, "resolve returned a map");
  return value as ReadonlyMap<string, string>;
}

interface Item {
  userId: string;
  displayName: string;
  kind: "human" | "service";
}

function namesFor(ids: readonly string[]): { items: Item[] } {
  return {
    items: ids.map((id) => ({ userId: id, displayName: `Name ${id}`, kind: "human" as const })),
  };
}

function idsOf(opts: Omit<RequestOptions, "body"> | undefined): string[] {
  const ids = opts?.query?.["ids"];
  assert.equal(typeof ids, "string", "the call asks by ids");
  return String(ids).split(",");
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("C-674bb9f6 the cache asks 60 ids in two batches and remembers them", async () => {
  const fake = recordingGet(async (_path, opts) => namesFor(idsOf(opts)));
  const cache = cacheOf(fake.client);
  const ids = Array.from({ length: 60 }, (_, index) => `u${index}`);

  const names = await resolveOf(cache, ids);

  assert.deepEqual(
    fake.calls,
    [
      { path: "/people", opts: { query: { ids: ids.slice(0, 50).join(",") } } },
      { path: "/people", opts: { query: { ids: ids.slice(50).join(",") } } },
    ],
    "two requests hold the first 50 and the last 10 ids",
  );
  assert.deepEqual([...names.keys()], ids, "the map holds 60 entries in request order");
  assert.equal(names.get("u7"), "Name u7", "the seventh name is present");
  assert.equal(cache.peek("u7"), "Name u7", "a remembered id is peeked");
  assert.equal(cache.peek("zz"), undefined, "an unknown id is not remembered");

  const again = await resolveOf(cache, ids);
  assert.equal(fake.calls.length, 2, "a repeated resolve sends no request");
  assert.deepEqual([...again.keys()], ids, "the repeated resolve answers from memory");
});

test("C-674bb9f6 maxBatch splits the ids and passes the signal along", async () => {
  const fake = recordingGet(async (_path, opts) => namesFor(idsOf(opts)));
  const cache = cacheOf(fake.client, 2);
  const controller = new AbortController();

  const names = await resolveOf(cache, ["a", "b", "c"], controller.signal);

  assert.deepEqual(
    fake.calls,
    [
      { path: "/people", opts: { query: { ids: "a,b" }, signal: controller.signal } },
      { path: "/people", opts: { query: { ids: "c" }, signal: controller.signal } },
    ],
    "batches of two and one carry the same signal",
  );
  assert.deepEqual(
    [...names],
    [
      ["a", "Name a"],
      ["b", "Name b"],
      ["c", "Name c"],
    ],
    "the map holds the three names in request order",
  );
});

test("C-674bb9f6 the cache drops invalid ids, dedupes and ignores unasked items", async () => {
  const fake = recordingGet(async (_path, opts) => {
    const asked = idsOf(opts);
    const items: Item[] = asked
      .filter((id) => id !== "ghost")
      .map((id) => ({ userId: id, displayName: `Name ${id}`, kind: "human" }));
    items.push({ userId: "u_x", displayName: "X", kind: "human" });
    return { items };
  });
  const cache = cacheOf(fake.client);

  const names = await resolveOf(cache, [
    "b",
    "a b",
    "",
    "x".repeat(65),
    "a,b",
    "é",
    "ok",
    "b",
    "ghost",
  ]);

  assert.deepEqual(
    fake.calls,
    [{ path: "/people", opts: { query: { ids: "b,ok,ghost" } } }],
    "one request holds the valid unseen ids once",
  );
  assert.deepEqual(
    [...names],
    [
      ["b", "Name b"],
      ["ok", "Name ok"],
    ],
    "only the asked and answered ids are kept",
  );
  assert.equal(cache.peek("u_x"), undefined, "an item whose id was not asked is ignored");

  await resolveOf(cache, ["ghost"]);
  assert.equal(fake.calls.length, 1, "an id a successful answer left out is remembered as a miss");

  await resolveOf(cache, ["u_x"]);
  assert.equal(fake.calls.length, 2, "an unasked id is asked by a later resolve");
  assert.deepEqual(idsOf(fake.calls[1]?.opts), ["u_x"], "the later request asks only that id");

  const invalid = await resolveOf(cache, ["a b", ""]);
  assert.equal(invalid.size, 0, "invalid ids give an empty map");
  assert.equal(fake.calls.length, 2, "invalid ids send no request");
});

test("C-674bb9f6 concurrent resolves share a request and wait for it", async () => {
  const shared = recordingGet(async (_path, opts) => namesFor(idsOf(opts)));
  const cache = cacheOf(shared.client);

  const [first, second] = await Promise.all([
    resolveOf(cache, ["a", "b"]),
    resolveOf(cache, ["b", "a"]),
  ]);
  assert.equal(shared.calls.length, 1, "the same ids make one request");
  assert.deepEqual([...first.keys()], ["a", "b"], "the first map keeps its order");
  assert.deepEqual([...second.keys()], ["a", "b"], "the waiting resolve keeps request order");

  const split = recordingGet(async (_path, opts) => namesFor(idsOf(opts)));
  const other = cacheOf(split.client);
  const [left, right] = await Promise.all([
    resolveOf(other, ["a", "b"]),
    resolveOf(other, ["b", "c"]),
  ]);
  assert.deepEqual(
    split.calls.map((call) => idsOf(call.opts)),
    [["a", "b"], ["c"]],
    "the overlapping id is not asked twice",
  );
  assert.deepEqual([...left.keys()], ["a", "b"], "the first resolve holds its ids");
  assert.deepEqual([...right.keys()], ["b", "c"], "the waiting resolve holds its own ids");
});

test("C-929a4c25 a failed batch is forgotten and asked again", async () => {
  const failures: readonly { readonly label: string; readonly failure: unknown }[] = [
    { label: "a 500", failure: new ApiRequestError(500, "INTERNAL", "x") },
    { label: "a 401", failure: new ApiRequestError(401, "UNAUTHENTICATED", "x") },
    { label: "a TypeError", failure: new TypeError("x") },
    { label: "a malformed body", failure: { items: [{ userId: "a" }] } },
  ];

  for (const row of failures) {
    let calls = 0;
    const fake = recordingGet(async (_path, opts) => {
      calls += 1;
      if (calls === 1) {
        if (row.failure instanceof Error) {
          throw row.failure;
        }
        return row.failure;
      }
      return namesFor(idsOf(opts));
    });
    const cache = cacheOf(fake.client);

    const first = await resolveOf(cache, ["a"]);
    assert.equal(first.size, 0, `${row.label} gives an empty map`);
    assert.equal(cache.peek("a"), undefined, `${row.label} remembers no name`);

    const second = await resolveOf(cache, ["a"]);
    assert.deepEqual(
      [...second],
      [["a", "Name a"]],
      `the next resolve asks again after ${row.label}`,
    );
    assert.equal(fake.calls.length, 2, `${row.label} makes exactly two requests`);
  }
});

test("C-929a4c25 only a failed batch is asked again", async () => {
  let calls = 0;
  const fake = recordingGet(async (_path, opts) => {
    calls += 1;
    if (calls === 2) {
      throw new ApiRequestError(500, "INTERNAL", "x");
    }
    return namesFor(idsOf(opts));
  });
  const cache = cacheOf(fake.client);
  const ids = Array.from({ length: 60 }, (_, index) => `u${index}`);

  const first = await resolveOf(cache, ids);
  assert.equal(first.size, 50, "the successful batch is kept");
  assert.equal(first.get("u0"), "Name u0", "the first name is present");
  assert.equal(first.has("u50"), false, "the failed batch is forgotten");
  assert.deepEqual(
    fake.calls.map((call) => idsOf(call.opts)),
    [ids.slice(0, 50), ids.slice(50)],
    "both batches are asked",
  );

  const second = await resolveOf(cache, ids);
  assert.equal(second.size, 60, "the retry fills the map");
  assert.equal(fake.calls.length, 3, "the retry makes one more request");
  assert.deepEqual(idsOf(fake.calls[2]?.opts), ids.slice(50), "only the failed batch is asked again");
});

test("C-929a4c25 aborts reject with AbortError and remember nothing", async () => {
  const preAborted = recordingGet(async (_path, opts) => namesFor(idsOf(opts)));
  const preCache = cacheOf(preAborted.client);
  const preController = new AbortController();
  preController.abort();

  await assert.rejects(
    async () => preCache.resolve(["a"], preController.signal),
    (error: unknown) => {
      assert.equal(
        (error as { name?: unknown }).name,
        "AbortError",
        "the pre-aborted call keeps AbortError",
      );
      return true;
    },
  );
  assert.equal(preAborted.calls.length, 0, "a pre-aborted call sends no request");
  assert.equal(preCache.peek("a"), undefined, "a pre-aborted call remembers nothing");

  const duringAbort = recordingGet((_path, opts) => {
    const signal = opts?.signal;
    return new Promise<unknown>((_resolve, reject) => {
      const fail = (): void => {
        reject(new DOMException("aborted", "AbortError"));
      };
      if (signal?.aborted === true) {
        fail();
        return;
      }
      signal?.addEventListener("abort", fail);
    });
  });
  const duringCache = cacheOf(duringAbort.client);
  const controller = new AbortController();

  const pending = duringCache.resolve(["a"], controller.signal);
  controller.abort();
  await assert.rejects(pending, (error: unknown) => {
    assert.equal(
      (error as { name?: unknown }).name,
      "AbortError",
      "an aborted request keeps AbortError",
    );
    return true;
  });
  assert.equal(duringCache.peek("a"), undefined, "an aborted request remembers no name");
});

test("C-929a4c25 the plain client never ends the session and the sources use it", async () => {
  const assignments: string[] = [];
  const records: string[] = [];
  const fakeWindow = {
    location: {
      pathname: "/flows",
      search: "?x=1",
      assign(url: string): void {
        assignments.push(url);
      },
    },
  } as unknown as Window & typeof globalThis;

  const fetchStub = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    records.push(`${init?.method ?? "GET"} ${url}`);
    if (url.includes("ids=u_carol")) {
      return jsonResponse({
        items: [{ userId: "u_carol", displayName: "Carol Example", kind: "human" }],
      });
    }
    return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "x" } }, 401);
  }) as typeof globalThis.fetch;

  const scoped = globalThis as unknown as { window: unknown; fetch: typeof globalThis.fetch };
  const originalWindow = scoped.window;
  const originalFetch = scoped.fetch;
  try {
    scoped.window = fakeWindow;
    scoped.fetch = fetchStub;

    const carol = await resolveOf(nameCache, ["u_carol"]);
    assert.deepEqual([...carol], [["u_carol", "Carol Example"]], "the name is resolved");
    assert.deepEqual(
      records,
      ["GET /api/v1/people?ids=u_carol"],
      "one plain GET asks for the name",
    );

    const firstBob = await resolveOf(nameCache, ["u_bob"]);
    const secondBob = await resolveOf(nameCache, ["u_bob"]);
    assert.equal(firstBob.size, 0, "a 401 gives an empty map");
    assert.equal(secondBob.size, 0, "the failed 401 is not remembered");

    const teams = await loadMyTeams(createApiClient());
    assert.deepEqual(teams, [], "the teams lookup also answers empty");

    assert.deepEqual(
      records,
      [
        "GET /api/v1/people?ids=u_carol",
        "GET /api/v1/people?ids=u_bob",
        "GET /api/v1/people?ids=u_bob",
        "GET /api/v1/me/teams",
      ],
      "each 401 is asked again and no session handler runs",
    );
    assert.equal(assignments.length, 0, "nothing redirects to sign in");
  } finally {
    scoped.window = originalWindow;
    scoped.fetch = originalFetch;
  }

  const peopleSource = readFileSync(new URL("people.ts", import.meta.url), "utf8");
  const hooksSource = readFileSync(new URL("use-names.ts", import.meta.url), "utf8");
  const sources: readonly (readonly [string, string])[] = [
    ["people.ts", peopleSource],
    ["use-names.ts", hooksSource],
  ];
  for (const [name, source] of sources) {
    assert.doesNotMatch(
      source,
      /browser-session|browserSession/,
      `${name} does not use the session client`,
    );
    assert.match(source, /createApiClient\(/, `${name} uses the plain client`);
  }
});
