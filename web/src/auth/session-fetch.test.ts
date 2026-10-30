/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { isStateChanging, withCsrfHeader, withSessionEnd } from "./session-fetch.ts";

assert.equal(typeof withCsrfHeader, "function");
assert.equal(typeof withSessionEnd, "function");
assert.equal(typeof isStateChanging, "function");

const NOT_SET = Symbol("not set");

const CSRF_HEADER_NAME = "x-csrf-token";
const TOKEN = "t" + "A".repeat(42);

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

async function callAsync<T>(run: () => Promise<T>): Promise<T> {
  let value: T | typeof NOT_SET = NOT_SET;
  await assert.doesNotReject(async () => {
    value = await run();
  }, "the call must not reject");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

interface RecordedCall {
  readonly input: RequestInfo | URL;
  readonly url: string;
  readonly init: RequestInit | undefined;
}

interface RecordedFetch {
  readonly fetch: typeof globalThis.fetch;
  readonly calls: RecordedCall[];
}

function urlOf(input: RequestInfo | URL): string {
  return typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
}

function recordingFetch(
  handler: (call: RecordedCall, index: number) => Response | Promise<Response> = () =>
    jsonResponse({ ok: true }),
): RecordedFetch {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const call: RecordedCall = { input, url: urlOf(input), init };
    calls.push(call);
    return handler(call, calls.length - 1);
  }) as typeof globalThis.fetch;
  return { fetch: fetchImpl, calls };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function textResponse(value: string, status = 200): Response {
  return new Response(value, { status });
}

function headerOf(call: RecordedCall, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

function firstCall(calls: readonly RecordedCall[]): RecordedCall {
  const [call] = calls;
  assert.ok(call !== undefined, "a fetch call was recorded");
  return call;
}

test("C-023c2efe the CSRF header is added only to same-origin state-changing requests", async () => {
  assert.equal(TOKEN.length, 43, "the generated token is 43 characters");

  let postAsked = 0;
  const postRecorder = recordingFetch();
  const wrappedPost = call(() =>
    withCsrfHeader(postRecorder.fetch, async () => {
      postAsked += 1;
      return TOKEN;
    }),
  );
  await callAsync(() => wrappedPost("/api/v1/x", { method: "POST" }));
  assert.equal(
    headerOf(firstCall(postRecorder.calls), CSRF_HEADER_NAME),
    TOKEN,
    "a same-origin POST carries the token",
  );
  assert.equal(postAsked, 1, "the token source was asked for the POST");

  let getAsked = 0;
  const getRecorder = recordingFetch();
  const wrappedGet = call(() =>
    withCsrfHeader(getRecorder.fetch, async () => {
      getAsked += 1;
      return TOKEN;
    }),
  );
  await callAsync(() => wrappedGet("/api/v1/x", { method: "GET" }));
  assert.equal(
    headerOf(firstCall(getRecorder.calls), CSRF_HEADER_NAME),
    null,
    "a GET carries no token",
  );
  assert.equal(getAsked, 0, "the token source was not asked for the GET");

  const deleteRecorder = recordingFetch();
  const wrappedDelete = call(() => withCsrfHeader(deleteRecorder.fetch, async () => TOKEN));
  await callAsync(() =>
    wrappedDelete("/api/v1/x", {
      method: "DELETE",
      headers: { [CSRF_HEADER_NAME]: "mine" },
    }),
  );
  assert.equal(
    headerOf(firstCall(deleteRecorder.calls), CSRF_HEADER_NAME),
    "mine",
    "the caller header is kept",
  );

  let foreignAsked = 0;
  const foreignRecorder = recordingFetch();
  const wrappedForeign = call(() =>
    withCsrfHeader(foreignRecorder.fetch, async () => {
      foreignAsked += 1;
      return TOKEN;
    }),
  );
  await callAsync(() => wrappedForeign("//evil.invalid/x", { method: "POST" }));
  await callAsync(() => wrappedForeign(new URL("http://evil.invalid/x"), { method: "POST" }));
  assert.equal(foreignRecorder.calls.length, 2, "both foreign inputs reached the inner fetch");
  for (const recorded of foreignRecorder.calls) {
    assert.equal(
      headerOf(recorded, CSRF_HEADER_NAME),
      null,
      `a foreign input carries no token (${recorded.url})`,
    );
  }
  assert.equal(foreignAsked, 0, "the token source was not asked for a foreign input");

  const nullRecorder = recordingFetch();
  const wrappedNull = call(() => withCsrfHeader(nullRecorder.fetch, async () => null));
  await callAsync(() => wrappedNull("/x", { method: "POST" }));
  assert.equal(
    headerOf(firstCall(nullRecorder.calls), CSRF_HEADER_NAME),
    null,
    "no token means no header",
  );

  const controlRecorder = recordingFetch();
  const wrappedControl = call(() => withCsrfHeader(controlRecorder.fetch, async () => "a\nb"));
  await callAsync(() => wrappedControl("/x", { method: "POST" }));
  assert.equal(
    headerOf(firstCall(controlRecorder.calls), CSRF_HEADER_NAME),
    null,
    "a token with a control character is not sent",
  );

  const throwingRecorder = recordingFetch();
  const wrappedThrowing = call(() =>
    withCsrfHeader(throwingRecorder.fetch, async () => {
      throw new Error("token source failed");
    }),
  );
  await callAsync(() => wrappedThrowing("/x", { method: "POST" }));
  assert.equal(
    headerOf(firstCall(throwingRecorder.calls), CSRF_HEADER_NAME),
    null,
    "a throwing token source sends no header",
  );

  const methodCases: readonly (readonly [string | undefined, boolean])[] = [
    [undefined, false],
    ["get", false],
    ["Post", true],
    ["HEAD", false],
    ["options", false],
    ["DELETE", true],
  ];
  for (const [method, expected] of methodCases) {
    assert.equal(
      call(() => isStateChanging(method)),
      expected,
      `isStateChanging(${String(method)})`,
    );
  }
});

test("C-3809dcd7 a 401 envelope ends the session once", async () => {
  const unauthenticated = (): Response =>
    jsonResponse({ error: { code: "UNAUTHENTICATED", message: "no session" } }, 401);

  let endedCount = 0;
  const firstInner = (async () => unauthenticated()) as typeof globalThis.fetch;
  const wrappedFirst = call(() =>
    withSessionEnd(firstInner, () => {
      endedCount += 1;
    }),
  );

  const firstResponse = await callAsync(() => wrappedFirst("/api/v1/x"));
  const firstBody = (await firstResponse.json()) as { error: { code: string } };
  assert.equal(firstBody.error.code, "UNAUTHENTICATED", "the first response is still readable");
  assert.equal(endedCount, 1, "the first dead session fires once");

  const secondResponse = await callAsync(() => wrappedFirst("/api/v1/x"));
  const secondBody = (await secondResponse.json()) as { error: { code: string } };
  assert.equal(secondBody.error.code, "UNAUTHENTICATED", "the second response is still readable");
  assert.equal(endedCount, 1, "the wrapper fires onEnded only once");

  const queued: Response[] = [
    jsonResponse({ error: { code: "FORBIDDEN", message: "no" } }, 401),
    textResponse("oops", 401),
    textResponse("forbidden", 403),
    jsonResponse({ ok: true }, 200),
  ];
  const secondInner = (async () => {
    const response = queued.shift();
    if (response === undefined) throw new Error("no queued response");
    return response;
  }) as typeof globalThis.fetch;
  let secondEnded = 0;
  const wrappedSecond = call(() =>
    withSessionEnd(secondInner, () => {
      secondEnded += 1;
    }),
  );
  for (let index = 0; index < 4; index += 1) {
    await callAsync(() => wrappedSecond("/api/v1/x"));
  }
  assert.equal(secondEnded, 0, "only an UNAUTHENTICATED envelope ends the session");

  const thirdInner = (async () => unauthenticated()) as typeof globalThis.fetch;
  const wrappedThird = call(() =>
    withSessionEnd(thirdInner, () => {
      throw new Error("onEnded failed");
    }),
  );
  const thirdResponse = await callAsync(() => wrappedThird("/api/v1/x"));
  const thirdBody = (await thirdResponse.json()) as { error: { code: string } };
  assert.equal(
    thirdBody.error.code,
    "UNAUTHENTICATED",
    "a throwing onEnded still returns the response",
  );
});
