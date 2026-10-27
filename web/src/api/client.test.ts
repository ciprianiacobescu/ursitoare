/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError, createApiClient } from "./client.ts";

assert.equal(typeof createApiClient, "function");

interface RecordedCall {
  readonly url: string;
  readonly init: RequestInit | undefined;
}

interface RecordedFetch {
  readonly fetch: typeof globalThis.fetch;
  readonly calls: RecordedCall[];
}

type Outcome<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly error: unknown };

function recordingFetch(
  handler: (call: RecordedCall, index: number) => Response | Promise<Response>,
): RecordedFetch {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const call: RecordedCall = { url, init };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof globalThis.fetch;
  return { fetch: fetchImpl, calls };
}

async function captured<T>(run: () => Promise<T>): Promise<Outcome<T>> {
  try {
    return { ok: true, value: await run() };
  } catch (error) {
    return { ok: false, error };
  }
}

function jsonResponse(value: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function snapshot(call: RecordedCall): Record<string, unknown> {
  const headers = new Headers(call.init?.headers);
  return {
    url: call.url,
    method: call.init?.method ?? "GET",
    accept: headers.get("accept"),
    contentType: headers.get("content-type"),
    body: typeof call.init?.body === "string" ? call.init.body : null,
    credentials: call.init?.credentials ?? null,
  };
}

function firstCall(calls: readonly RecordedCall[]): RecordedCall {
  const [call] = calls;
  assert.ok(call !== undefined, "a fetch call was recorded");
  return call;
}

function rejection(outcome: Outcome<unknown>): unknown {
  assert.equal(outcome.ok, false, "the request must reject");
  if (outcome.ok) {
    return undefined;
  }
  return outcome.error;
}

test("C-12290cf5 an ApiClient sends JSON requests to the same origin", async () => {
  const recorded = recordingFetch((call) =>
    call.init?.method === "POST" ? new Response(null, { status: 204 }) : jsonResponse({ ok: true }),
  );

  const outcome = await captured(async () => {
    const client = createApiClient({ fetch: recorded.fetch });
    const list = await client.get("/flows", { query: { limit: 2, q: undefined } });
    const created = await client.post("/flows", { name: "a" });
    return { list, created };
  });

  assert.deepEqual(outcome, { ok: true, value: { list: { ok: true }, created: undefined } });
  assert.deepEqual(recorded.calls.map(snapshot), [
    {
      url: "/api/v1/flows?limit=2",
      method: "GET",
      accept: "application/json",
      contentType: null,
      body: null,
      credentials: "same-origin",
    },
    {
      url: "/api/v1/flows",
      method: "POST",
      accept: "application/json",
      contentType: "application/json",
      body: JSON.stringify({ name: "a" }),
      credentials: "same-origin",
    },
  ]);
});

test("C-12290cf5 caller headers win and the abort signal is passed through", async () => {
  const recorded = recordingFetch(() => jsonResponse({ ok: true }));
  const controller = new AbortController();

  const outcome = await captured(async () => {
    const client = createApiClient({ baseUrl: "/api/v1/", fetch: recorded.fetch });
    return client.get("/flows", {
      query: { q: undefined, limit: 2 },
      headers: { accept: "text/plain", "x-trace": "abc" },
      signal: controller.signal,
    });
  });

  assert.deepEqual(outcome, { ok: true, value: { ok: true } });
  assert.deepEqual(recorded.calls.map(snapshot), [
    {
      url: "/api/v1/flows?limit=2",
      method: "GET",
      accept: "text/plain",
      contentType: null,
      body: null,
      credentials: "same-origin",
    },
  ]);
  assert.equal(firstCall(recorded.calls).init?.signal, controller.signal);
});

test("C-12290cf5 put, patch and delete send their methods and JSON bodies", async () => {
  const recorded = recordingFetch((_call, index) =>
    index === 2 ? new Response(null, { status: 204 }) : jsonResponse({ ok: true }),
  );

  const outcome = await captured(async () => {
    const client = createApiClient({ fetch: recorded.fetch });
    const put = await client.put("/flows/f1", { name: "b" });
    const patch = await client.patch("/flows/f1", { name: "c" });
    const deleted = await client.delete("/flows/f1");
    return { put, patch, deleted };
  });

  assert.deepEqual(outcome, {
    ok: true,
    value: { put: { ok: true }, patch: { ok: true }, deleted: undefined },
  });
  assert.deepEqual(recorded.calls.map(snapshot), [
    {
      url: "/api/v1/flows/f1",
      method: "PUT",
      accept: "application/json",
      contentType: "application/json",
      body: JSON.stringify({ name: "b" }),
      credentials: "same-origin",
    },
    {
      url: "/api/v1/flows/f1",
      method: "PATCH",
      accept: "application/json",
      contentType: "application/json",
      body: JSON.stringify({ name: "c" }),
      credentials: "same-origin",
    },
    {
      url: "/api/v1/flows/f1",
      method: "DELETE",
      accept: "application/json",
      contentType: null,
      body: null,
      credentials: "same-origin",
    },
  ]);
});

test("C-76b2dd3e an error envelope becomes an ApiRequestError with its details and request id", async () => {
  const recorded = recordingFetch(
    () =>
      new Response(
        JSON.stringify({
          error: { code: "FLOW_NOT_FOUND", message: "No flow", details: { id: "f1" } },
        }),
        {
          status: 404,
          headers: { "content-type": "application/json", "x-request-id": "r1" },
        },
      ),
  );

  const outcome = await captured(() => createApiClient({ fetch: recorded.fetch }).get("/flows/f1"));
  const error = rejection(outcome);

  assert.ok(error instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(error.status, 404);
  assert.equal(error.code, "FLOW_NOT_FOUND");
  assert.equal(error.message, "No flow");
  assert.deepEqual(error.details, { id: "f1" });
  assert.equal(error.requestId, "r1");
});

test("C-76b2dd3e a non-envelope failure becomes HTTP_ERROR with the status", async () => {
  const recorded = recordingFetch(() => jsonResponse({ status: "fail" }, 503));

  const outcome = await captured(() => createApiClient({ fetch: recorded.fetch }).get("/flows"));
  const error = rejection(outcome);

  assert.ok(error instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(error.status, 503);
  assert.equal(error.code, "HTTP_ERROR");
  assert.equal(error.message, "HTTP 503");
  assert.equal(error.requestId, null);
});

test("C-76b2dd3e a 2xx with a non-JSON body becomes INVALID_RESPONSE", async () => {
  const recorded = recordingFetch(
    () => new Response("not json", { status: 200, headers: { "content-type": "text/plain" } }),
  );

  const outcome = await captured(() => createApiClient({ fetch: recorded.fetch }).get("/flows"));
  const error = rejection(outcome);

  assert.ok(error instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(error.status, 200);
  assert.equal(error.code, "INVALID_RESPONSE");
  assert.equal(error.message, "Invalid response");
});

test("C-76b2dd3e a rejecting fetch becomes NETWORK_ERROR", async () => {
  const failure = new TypeError("boom");
  const recorded = recordingFetch(() => Promise.reject(failure));

  const outcome = await captured(() => createApiClient({ fetch: recorded.fetch }).get("/flows"));
  const error = rejection(outcome);

  assert.ok(error instanceof ApiRequestError, "the failure is an ApiRequestError");
  assert.equal(error.status, 0);
  assert.equal(error.code, "NETWORK_ERROR");
  assert.equal(error.message, "Network request failed");
  assert.equal(error.cause, failure);
});

test("C-76b2dd3e an AbortError is rethrown unchanged", async () => {
  const aborted = new DOMException("The operation was aborted", "AbortError");
  const recorded = recordingFetch(() => Promise.reject(aborted));

  const outcome = await captured(() => createApiClient({ fetch: recorded.fetch }).get("/flows"));
  const error = rejection(outcome);

  assert.equal(error, aborted);
});

test("C-76b2dd3e invalid requests throw RangeError before any fetch", async () => {
  const recorded = recordingFetch(() => jsonResponse({ ok: true }));
  const attempts: { readonly label: string; readonly run: () => Promise<unknown> }[] = [
    {
      label: "baseUrl",
      run: async () => createApiClient({ baseUrl: "https://x", fetch: recorded.fetch }).get("/x"),
    },
    {
      label: "double slash path",
      run: async () => createApiClient({ fetch: recorded.fetch }).get("//evil.test/x"),
    },
    {
      label: "query in path",
      run: async () => createApiClient({ fetch: recorded.fetch }).get("/a?b=1"),
    },
    {
      label: "method",
      run: async () => createApiClient({ fetch: recorded.fetch }).request("TRACE", "/x"),
    },
  ];

  for (const attempt of attempts) {
    const outcome = await captured(attempt.run);
    const error = rejection(outcome);
    assert.ok(error instanceof RangeError, `${attempt.label} throws RangeError`);
  }
  assert.equal(recorded.calls.length, 0, "no fetch call happens");
});
