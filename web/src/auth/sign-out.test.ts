/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { CapabilityLoader, CapabilityState } from "../kit/capabilities.ts";
import { isCsrfFailure, safeRedirect, signOut } from "./sign-out.ts";

assert.equal(typeof signOut, "function");
assert.equal(typeof isCsrfFailure, "function");
assert.equal(typeof safeRedirect, "function");

const NOT_SET = Symbol("not set");

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

function apiError(status: number, code: string): ApiRequestError {
  return new ApiRequestError(status, code, "the server said no");
}

interface RecordingClient {
  readonly client: Pick<ApiClient, "post">;
  readonly paths: string[];
}

function recordingClient(
  responses: readonly (() => Promise<unknown>)[],
): RecordingClient {
  const paths: string[] = [];
  const queue = [...responses];
  const client: Pick<ApiClient, "post"> = {
    async post<T>(path: string): Promise<T> {
      paths.push(path);
      const next = queue.shift();
      if (next === undefined) {
        throw new Error(`no queued post answer for ${path}`);
      }
      return (await next()) as T;
    },
  };
  return { client, paths };
}

interface RecordingLoader {
  readonly loader: Pick<CapabilityLoader, "load" | "reset">;
  readonly events: string[];
}

function recordingLoader(): RecordingLoader {
  const events: string[] = [];
  const loader: Pick<CapabilityLoader, "load" | "reset"> = {
    async load(): Promise<CapabilityState> {
      events.push("load");
      return { status: "signed_out" };
    },
    reset(): void {
      events.push("reset");
    },
  };
  return { loader, events };
}

function countOf(events: readonly string[], name: string): number {
  return events.filter((event) => event === name).length;
}

test("C-eb130cb7 sign out follows only a safe redirect", async () => {
  const refused = "/sign-in";
  const redirectCases: readonly { readonly input: unknown; readonly expected: string }[] = [
    { input: "http://127.0.0.1:9/end?x=1", expected: "http://127.0.0.1:9/end?x=1" },
    { input: "/sign-in", expected: "/sign-in" },
    { input: "javascript:alert(1)", expected: refused },
    { input: "//evil.invalid", expected: refused },
    { input: "https://user:pw@evil.invalid/x", expected: refused },
    { input: "", expected: refused },
    { input: 5, expected: refused },
    { input: "/" + "x".repeat(2048), expected: refused },
  ];

  for (const { input, expected } of redirectCases) {
    assert.equal(
      call(() => safeRedirect(input)),
      expected,
      `safeRedirect(${JSON.stringify(input)})`,
    );
  }

  const recorder = recordingClient([
    async () => ({ redirect: "javascript:alert(1)" }),
  ]);
  const { loader, events } = recordingLoader();

  const result = await callAsync(() => signOut({ client: recorder.client, loader }));
  assert.deepEqual(result, { kind: "redirect", to: "/sign-in" });
  assert.equal(countOf(events, "reset"), 1, "a successful sign-out resets exactly once");
  assert.deepEqual(recorder.paths, ["/auth/oidc/logout"]);
});

test("C-4b09fc8c sign out refreshes a stale token once", async () => {
  const first = recordingClient([
    async () => {
      throw apiError(403, "OIDC_CSRF_INVALID");
    },
    async () => ({ redirect: "http://127.0.0.1:9/end" }),
  ]);
  const firstLoader = recordingLoader();

  const firstResult = await callAsync(() =>
    signOut({ client: first.client, loader: firstLoader.loader }),
  );
  assert.deepEqual(firstResult, { kind: "redirect", to: "http://127.0.0.1:9/end" });
  assert.equal(first.paths.length, 2, "a stale token is retried exactly once");
  assert.equal(countOf(firstLoader.events, "reset"), 1, "the stale session is reset");
  assert.equal(countOf(firstLoader.events, "load"), 1, "a fresh token is loaded");
  const resetAt = firstLoader.events.indexOf("reset");
  const loadAt = firstLoader.events.indexOf("load");
  assert.ok(resetAt >= 0, "the loader was reset");
  assert.ok(loadAt >= 0, "the loader was loaded");
  assert.ok(resetAt < loadAt, "reset happens before load");

  const second = recordingClient([
    async () => {
      throw apiError(403, "CSRF_INVALID");
    },
    async () => {
      throw apiError(403, "CSRF_INVALID");
    },
  ]);
  const secondLoader = recordingLoader();

  const secondResult = await callAsync(() =>
    signOut({ client: second.client, loader: secondLoader.loader }),
  );
  assert.deepEqual(secondResult, { kind: "failed", code: "CSRF_INVALID" });
  assert.equal(second.paths.length, 2, "a second CSRF failure is not retried again");
});

test("C-77971a2d sign out reports what failed", async () => {
  const unauthenticated = recordingClient([
    async () => {
      throw apiError(401, "UNAUTHENTICATED");
    },
  ]);
  const unauthenticatedLoader = recordingLoader();
  const unauthenticatedResult = await callAsync(() =>
    signOut({ client: unauthenticated.client, loader: unauthenticatedLoader.loader }),
  );
  assert.deepEqual(unauthenticatedResult, { kind: "redirect", to: "/sign-in" });
  assert.equal(
    countOf(unauthenticatedLoader.events, "reset"),
    1,
    "a dead session is reset once",
  );

  const unavailable = recordingClient([
    async () => {
      throw apiError(503, "AUTHZ_UNAVAILABLE");
    },
  ]);
  const unavailableLoader = recordingLoader();
  const unavailableResult = await callAsync(() =>
    signOut({ client: unavailable.client, loader: unavailableLoader.loader }),
  );
  assert.deepEqual(unavailableResult, { kind: "failed", code: "AUTHZ_UNAVAILABLE" });
  assert.equal(
    countOf(unavailableLoader.events, "reset"),
    0,
    "a server error does not reset the session",
  );

  const network = recordingClient([
    async () => {
      throw new ApiRequestError(0, "NETWORK_ERROR", "x");
    },
  ]);
  const networkLoader = recordingLoader();
  const networkResult = await callAsync(() =>
    signOut({ client: network.client, loader: networkLoader.loader }),
  );
  assert.deepEqual(networkResult, { kind: "failed", code: "NETWORK_ERROR" });

  const unknown = recordingClient([
    async () => {
      throw new Error("secret detail");
    },
  ]);
  const unknownLoader = recordingLoader();
  const unknownResult = await callAsync(() =>
    signOut({ client: unknown.client, loader: unknownLoader.loader }),
  );
  assert.deepEqual(unknownResult, { kind: "failed", code: "UNKNOWN_ERROR" });
  assert.equal(
    JSON.stringify(unknownResult).includes("secret detail"),
    false,
    "the error message never reaches the result",
  );
});
