/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { CapabilityLoader, CapabilityState, Me } from "../kit/capabilities.ts";
import type { LocationLike } from "./return-to.ts";
import { createBrowserSession, csrfTokenFrom } from "./session-client.ts";

assert.equal(typeof createBrowserSession, "function");
assert.equal(typeof csrfTokenFrom, "function");

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
  readonly method: string;
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
  handler: (call: RecordedCall, index: number) => Response | Promise<Response>,
): RecordedFetch {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const call: RecordedCall = {
      input,
      url: urlOf(input),
      method: init?.method ?? "GET",
      init,
    };
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

function headerOf(call: RecordedCall, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

function findCall(
  calls: readonly RecordedCall[],
  url: string,
  method: string,
): RecordedCall {
  const found = calls.find((entry) => entry.url === url && entry.method === method);
  assert.ok(found !== undefined, `a ${method} ${url} call was recorded`);
  return found;
}

interface RecordingLocation {
  readonly location: LocationLike;
  readonly assigned: string[];
}

function recordingLocation(pathname: string, search: string): RecordingLocation {
  const assigned: string[] = [];
  const location: LocationLike = {
    pathname,
    search,
    assign(url: string): void {
      assigned.push(url);
    },
  };
  return { location, assigned };
}

function meWithToken(token: string): Me {
  return {
    user: { id: "user-1", displayName: "Alice Example", email: null },
    tenant: { id: "tenant-1", name: "E2E tenant", reviewProfile: "solo" },
    capabilities: new Set(["read_self"]),
    csrfToken: token,
  };
}

interface RecordingLoader {
  readonly loader: Pick<CapabilityLoader, "load" | "reset">;
  readonly events: string[];
}

function readyLoader(token: string): RecordingLoader {
  const events: string[] = [];
  const loader: Pick<CapabilityLoader, "load" | "reset"> = {
    async load(): Promise<CapabilityState> {
      events.push("load");
      return { status: "ready", me: meWithToken(token) };
    },
    reset(): void {
      events.push("reset");
    },
  };
  return { loader, events };
}

test("C-5368eb23 the session client sends the token and leaves on a dead session", async () => {
  assert.equal(TOKEN.length, 43, "the generated token is 43 characters");

  const ready = readyLoader(TOKEN);
  const { location, assigned } = recordingLocation("/flows", "");
  const recorder = recordingFetch((call) => {
    if (call.url === "/api/v1/flows" && call.method === "POST") {
      return jsonResponse({ ok: true });
    }
    if (call.url === "/api/v1/me" && call.method === "GET") {
      return jsonResponse({ ok: true });
    }
    if (call.url === "/api/v1/flows" && call.method === "GET") {
      return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "no session" } }, 401);
    }
    if (call.url === "/auth/oidc/logout" && call.method === "POST") {
      return jsonResponse({ error: { code: "UNAUTHENTICATED", message: "no session" } }, 401);
    }
    return jsonResponse({ ok: true });
  });

  const session = call(() =>
    createBrowserSession({ fetch: recorder.fetch, loader: ready.loader, location }),
  );

  await callAsync(() => session.api.post("/flows", { a: 1 }));
  const postCall = findCall(recorder.calls, "/api/v1/flows", "POST");
  assert.equal(
    headerOf(postCall, CSRF_HEADER_NAME),
    TOKEN,
    "a same-origin POST carries the session token",
  );
  assert.equal(postCall.init?.body, JSON.stringify({ a: 1 }), "the body is sent unchanged");

  await callAsync(() => session.api.get("/me"));
  const meCall = findCall(recorder.calls, "/api/v1/me", "GET");
  assert.equal(
    headerOf(meCall, CSRF_HEADER_NAME),
    null,
    "a GET carries no CSRF header",
  );

  await assert.rejects(
    session.api.get("/flows"),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "UNAUTHENTICATED",
    "the caller still gets the ApiRequestError",
  );
  assert.deepEqual(
    assigned,
    ["/sign-in?error=SESSION_ENDED&return_to=%2Fflows"],
    "a dead session sends the user to sign in once",
  );

  await assert.rejects(
    session.logout.post("/auth/oidc/logout"),
    (error: unknown) =>
      error instanceof ApiRequestError && error.code === "UNAUTHENTICATED",
    "the logout client surfaces the 401",
  );
  const logoutCall = findCall(recorder.calls, "/auth/oidc/logout", "POST");
  assert.equal(
    headerOf(logoutCall, CSRF_HEADER_NAME),
    TOKEN,
    "the logout POST carries the session token",
  );
  assert.equal(
    assigned.length,
    1,
    "the 401 on logout does not send the user to sign in again",
  );

  const readyState = readyLoader(TOKEN);
  assert.equal(
    await callAsync(() => csrfTokenFrom(readyState.loader)()),
    TOKEN,
    "a ready state gives its token",
  );

  const signedOutLoader: Pick<CapabilityLoader, "load"> = {
    async load(): Promise<CapabilityState> {
      return { status: "signed_out" };
    },
  };
  assert.equal(
    await callAsync(() => csrfTokenFrom(signedOutLoader)()),
    null,
    "a signed-out state gives no token",
  );

  const failedLoader: Pick<CapabilityLoader, "load"> = {
    async load(): Promise<CapabilityState> {
      return { status: "failed", code: "AUTHZ_UNAVAILABLE" };
    },
  };
  assert.equal(
    await callAsync(() => csrfTokenFrom(failedLoader)()),
    null,
    "a failed state gives no token",
  );
});
