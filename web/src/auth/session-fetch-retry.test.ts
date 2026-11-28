/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError, createApiClient } from "../api/client.ts";
import { createCapabilityLoader } from "../kit/capabilities.ts";
import type { CapabilityLoader } from "../kit/capabilities.ts";
import { messageFor } from "../kit/messages.ts";
import { registerSignInMessages } from "./messages.ts";
import type { LocationLike } from "./return-to.ts";
import { createBrowserSession } from "./session-client.ts";

assert.equal(typeof createBrowserSession, "function");

const CSRF_HEADER_NAME = "x-csrf-token";
const OLD_TOKEN = "o" + "A".repeat(42);
const NEW_TOKEN = "n" + "B".repeat(42);
const OUT_OF_DATE = "This page is out of date. Reload it and try again.";

interface RecordedCall {
  readonly url: string;
  readonly method: string;
  readonly init: RequestInit | undefined;
}

interface RecordingFetch {
  readonly fetch: typeof globalThis.fetch;
  readonly calls: RecordedCall[];
}

function recordingFetch(
  handler: (call: RecordedCall) => Response | Promise<Response>,
): RecordingFetch {
  const calls: RecordedCall[] = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const call: RecordedCall = { url, method: init?.method ?? "GET", init };
    calls.push(call);
    return handler(call);
  }) as typeof globalThis.fetch;
  return { fetch: fetchImpl, calls };
}

function jsonResponse(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function meAnswer(token: string): unknown {
  return {
    user: { id: "user-1", displayName: "Alice Example", email: null },
    tenant: { id: "tenant-1", name: "E2E tenant", reviewProfile: "solo" },
    capabilities: ["read_self"],
    csrfToken: token,
  };
}

function headerOf(call: RecordedCall, name: string): string | null {
  return new Headers(call.init?.headers).get(name);
}

function callsTo(calls: readonly RecordedCall[], url: string, method: string): RecordedCall[] {
  return calls.filter((call) => call.url === url && call.method === method);
}

function location(): LocationLike {
  return {
    pathname: "/admin/roles-and-teams",
    search: "",
    assign(_url: string): void {},
  };
}

interface SessionHarness {
  readonly session: ReturnType<typeof createBrowserSession>;
  readonly calls: RecordedCall[];
  readonly token: { value: string };
}

function startSession(
  handler: (call: RecordedCall, token: { value: string }) => Response | Promise<Response>,
): Promise<SessionHarness> {
  const token = { value: OLD_TOKEN };
  const recorder = recordingFetch((call) => {
    if (call.url === "/api/v1/me" && call.method === "GET") {
      return jsonResponse(meAnswer(token.value));
    }
    return handler(call, token);
  });
  const inner = createCapabilityLoader(createApiClient({ fetch: recorder.fetch }));
  const loader: Pick<CapabilityLoader, "load" | "reset"> = {
    load: inner.load,
    reset: inner.reset,
  };
  return (async (): Promise<SessionHarness> => {
    const first = await loader.load();
    assert.equal(first.status, "ready", "the session starts with a loaded token");
    const session = createBrowserSession({
      fetch: recorder.fetch,
      loader,
      location: location(),
    });
    return { session, calls: recorder.calls, token };
  })();
}

test("C-bfbec1c2 a CSRF refusal reloads the session and repeats the write once", async () => {
  let postMode: "token" | "forbidden" = "token";
  let getRefused = false;
  const harness = await startSession((call, token) => {
    if (call.url === "/api/v1/teams" && call.method === "POST") {
      if (postMode === "forbidden") {
        return jsonResponse({ error: { code: "FORBIDDEN", message: "no" } }, 403);
      }
      if (headerOf(call, CSRF_HEADER_NAME) === token.value) {
        return jsonResponse({ ok: true });
      }
      return jsonResponse(
        { error: { code: "CSRF_INVALID", message: "CSRF token missing or invalid" } },
        403,
      );
    }
    if (call.url === "/api/v1/flows" && call.method === "GET") {
      if (getRefused) {
        return jsonResponse(
          { error: { code: "CSRF_INVALID", message: "CSRF token missing or invalid" } },
          403,
        );
      }
      return jsonResponse({ items: [] });
    }
    return jsonResponse({ ok: true });
  });
  const { session, calls, token } = harness;

  token.value = NEW_TOKEN;

  let answer: unknown;
  await assert.doesNotReject(async () => {
    answer = await session.api.post("/teams", { name: "Team A" });
  }, "the write succeeds after the refresh");
  assert.deepEqual(answer, { ok: true }, "the write succeeds after the refresh");

  const posts = callsTo(calls, "/api/v1/teams", "POST");
  assert.equal(posts.length, 2, "the write is repeated exactly once");
  assert.deepEqual(
    posts.map((call) => headerOf(call, CSRF_HEADER_NAME)),
    [OLD_TOKEN, NEW_TOKEN],
    "the repeat uses the reloaded token",
  );
  const [firstPost, secondPost] = posts;
  assert.ok(firstPost !== undefined && secondPost !== undefined, "both writes were recorded");
  assert.equal(firstPost.init?.body, JSON.stringify({ name: "Team A" }));
  assert.equal(
    secondPost.init?.body,
    firstPost.init?.body,
    "the repeat carries the same body",
  );

  const meCalls = callsTo(calls, "/api/v1/me", "GET");
  assert.equal(meCalls.length, 2, "the session is reloaded exactly once");
  assert.deepEqual(
    calls.map((call) => `${call.method} ${call.url}`),
    [
      "GET /api/v1/me",
      "POST /api/v1/teams",
      "GET /api/v1/me",
      "POST /api/v1/teams",
    ],
    "the reload happens between the two writes",
  );

  postMode = "forbidden";
  const beforeForbidden = calls.length;
  await assert.rejects(
    session.api.post("/teams", { name: "Team B" }),
    (error: unknown) => error instanceof ApiRequestError && error.code === "FORBIDDEN",
    "a refusal for another reason reaches the caller",
  );
  assert.equal(
    callsTo(calls.slice(beforeForbidden), "/api/v1/teams", "POST").length,
    1,
    "a refusal for another reason is never repeated",
  );
  assert.equal(
    callsTo(calls.slice(beforeForbidden), "/api/v1/me", "GET").length,
    0,
    "a refusal for another reason does not reload the session",
  );

  getRefused = true;
  const beforeGet = calls.length;
  await assert.rejects(
    session.api.get("/flows"),
    (error: unknown) => error instanceof ApiRequestError && error.code === "CSRF_INVALID",
    "a GET refusal reaches the caller",
  );
  assert.equal(
    callsTo(calls.slice(beforeGet), "/api/v1/flows", "GET").length,
    1,
    "a GET is never repeated",
  );
  assert.equal(
    callsTo(calls.slice(beforeGet), "/api/v1/me", "GET").length,
    0,
    "a GET refusal does not reload the session",
  );
});

test("C-bfbec1c2 only a second CSRF refusal shows the out-of-date message", async () => {
  registerSignInMessages();
  const harness = await startSession((call) => {
    if (call.url === "/api/v1/teams" && call.method === "POST") {
      return jsonResponse(
        { error: { code: "OIDC_CSRF_INVALID", message: "CSRF token missing or invalid" } },
        403,
      );
    }
    return jsonResponse({ ok: true });
  });
  const { session, calls, token } = harness;

  token.value = NEW_TOKEN;

  await assert.rejects(
    session.api.post("/teams", { name: "Team A" }),
    (error: unknown) => {
      assert.ok(error instanceof ApiRequestError, "the second refusal is an API error");
      assert.equal(error.status, 403);
      assert.equal(error.code, "OIDC_CSRF_INVALID");
      assert.equal(
        messageFor(error.code),
        OUT_OF_DATE,
        "the second refusal shows the out-of-date text",
      );
      return true;
    },
  );

  const posts = callsTo(calls, "/api/v1/teams", "POST");
  assert.equal(posts.length, 2, "the write is repeated exactly once");
  assert.deepEqual(
    posts.map((call) => headerOf(call, CSRF_HEADER_NAME)),
    [OLD_TOKEN, NEW_TOKEN],
    "the repeat uses the reloaded token",
  );
  assert.equal(
    callsTo(calls, "/api/v1/me", "GET").length,
    2,
    "the session is reloaded exactly once",
  );
});

test("C-bfbec1c2 a CSRF refusal on sign out repeats the logout once", async () => {
  const harness = await startSession((call, token) => {
    if (call.url === "/auth/oidc/logout" && call.method === "POST") {
      if (headerOf(call, CSRF_HEADER_NAME) === token.value) {
        return jsonResponse({ redirect: "/sign-in" });
      }
      return jsonResponse(
        { error: { code: "OIDC_CSRF_INVALID", message: "CSRF token missing or invalid" } },
        403,
      );
    }
    return jsonResponse({ ok: true });
  });
  const { session, calls, token } = harness;

  token.value = NEW_TOKEN;

  let answer: unknown;
  await assert.doesNotReject(async () => {
    answer = await session.logout.post("/auth/oidc/logout");
  }, "the sign out succeeds after the refresh");
  assert.deepEqual(answer, { redirect: "/sign-in" }, "the sign out succeeds after the refresh");

  const logouts = callsTo(calls, "/auth/oidc/logout", "POST");
  assert.equal(logouts.length, 2, "the sign out is repeated exactly once");
  assert.deepEqual(
    logouts.map((call) => headerOf(call, CSRF_HEADER_NAME)),
    [OLD_TOKEN, NEW_TOKEN],
    "the repeat uses the reloaded token",
  );
  assert.equal(
    callsTo(calls, "/api/v1/me", "GET").length,
    2,
    "the session is reloaded exactly once",
  );
});
