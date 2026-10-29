/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { ApiClient, RequestOptions } from "../api/client.ts";
import { ApiRequestError } from "../api/client.ts";
import { createFeatureRegistry } from "../app/features.ts";
import type { NavItem } from "../app/features.ts";
import {
  capabilityNotice,
  createCapabilityLoader,
  parseMe,
  visibleNav,
} from "./capabilities.ts";
import type { CapabilityState, Me } from "./capabilities.ts";

assert.equal(typeof parseMe, "function");
assert.equal(typeof createCapabilityLoader, "function");
assert.equal(typeof visibleNav, "function");
assert.equal(typeof capabilityNotice, "function");

const NOT_SET = Symbol("not set");

const CSRF_TOKEN = "csrf_" + "a".repeat(38);

const HIDDEN_NOTICE =
  "Some menu entries are hidden because your permissions could not be loaded. " +
  "Authorization is unavailable right now. Try again in a moment.";

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

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function validBody(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    user: { id: "user-1", displayName: "Alice", email: null },
    tenant: { id: "tenant-1", name: "Tenant", reviewProfile: "solo" },
    capabilities: ["read_flow"],
    csrfToken: CSRF_TOKEN,
    ...overrides,
  };
}

function meWith(capabilities: readonly string[], csrfToken = CSRF_TOKEN): Me {
  return {
    user: { id: "user-1", displayName: "Alice", email: null },
    tenant: { id: "tenant-1", name: "Tenant", reviewProfile: "solo" },
    capabilities: new Set(capabilities),
    csrfToken,
  };
}

type Handler = () => Promise<unknown>;

interface FakeClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: { readonly path: string; readonly signal: AbortSignal | undefined }[];
}

function makeClient(handler: Handler): FakeClient {
  const calls: { path: string; signal: AbortSignal | undefined }[] = [];
  const client: Pick<ApiClient, "get"> = {
    async get<T>(path: string, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, signal: opts?.signal });
      return (await handler()) as T;
    },
  };
  return { client, calls };
}

test("C-1688efa8 parsing the answer", () => {
  const parsed = call(() =>
    parseMe(validBody({ capabilities: ["read_flow", "Bad Cap", 5, "read_flow"] })),
  );
  assert.ok(parsed !== null, "a valid body parses");
  assert.deepEqual(parsed.capabilities, new Set(["read_flow"]));
  assert.equal(parsed.user.id, "user-1");
  assert.equal(parsed.tenant.reviewProfile, "solo");

  const withoutCsrf = validBody();
  delete withoutCsrf.csrfToken;

  const invalidBodies: unknown[] = [
    validBody({ capabilities: "read_flow" }),
    withoutCsrf,
    validBody({
      tenant: { id: "tenant-1", name: "Tenant", reviewProfile: "x" },
    }),
    null,
  ];
  for (const body of invalidBodies) {
    assert.equal(call(() => parseMe(body)), null);
  }
});

test("C-30ed04fb the loader outcomes", async () => {
  const answered = makeClient(async () => validBody());
  const loader = call(() => createCapabilityLoader(answered.client));

  const first = await callAsync(() => loader.load());
  const second = await callAsync(() => loader.load());
  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
  assert.equal(answered.calls.length, 1, "a ready answer is cached");
  assert.equal(answered.calls[0]?.path, "/me");

  call(() => loader.reset());
  const third = await callAsync(() => loader.load());
  assert.equal(third.status, "ready");
  assert.equal(answered.calls.length, 2, "reset makes the next load ask again");
  assert.equal(answered.calls[1]?.path, "/me");

  const cases: {
    readonly label: string;
    readonly handler: Handler;
    readonly check: (state: CapabilityState) => void;
  }[] = [
    {
      label: "401",
      handler: async () => {
        throw new ApiRequestError(401, "UNAUTHENTICATED", "x");
      },
      check: (state) => assert.deepEqual(state, { status: "signed_out" }),
    },
    {
      label: "503",
      handler: async () => {
        throw new ApiRequestError(503, "AUTHZ_UNAVAILABLE", "x");
      },
      check: (state) =>
        assert.deepEqual(state, { status: "failed", code: "AUTHZ_UNAVAILABLE" }),
    },
    {
      label: "network error",
      handler: async () => {
        throw new ApiRequestError(0, "NETWORK_ERROR", "x");
      },
      check: (state) =>
        assert.deepEqual(state, { status: "failed", code: "NETWORK_ERROR" }),
    },
    {
      label: "invalid body",
      handler: async () => ({}),
      check: (state) =>
        assert.deepEqual(state, { status: "failed", code: "INVALID_RESPONSE" }),
    },
    {
      label: "unexpected throw",
      handler: async () => {
        throw new TypeError("boom");
      },
      check: (state) =>
        assert.deepEqual(state, { status: "failed", code: "UNKNOWN_ERROR" }),
    },
  ];

  for (const { label, handler, check } of cases) {
    const fresh = makeClient(handler);
    const freshLoader = call(() => createCapabilityLoader(fresh.client));
    const state = await callAsync(() => freshLoader.load());
    check(state);
    assert.equal(fresh.calls.length, 1, `${label} asks the client once`);
    assert.equal(fresh.calls[0]?.path, "/me", `${label} asks for /me`);

    await callAsync(() => freshLoader.load());
    assert.equal(fresh.calls.length, 2, `${label} asks again on the next load`);
  }
});

test("C-0dae9ed5 concurrent callers and abort", async () => {
  let release: ((body: unknown) => void) | undefined;
  const pending = makeClient(
    () =>
      new Promise<unknown>((resolve) => {
        release = resolve;
      }),
  );
  const loader = call(() => createCapabilityLoader(pending.client));

  const firstPromise = call(() => loader.load());
  const secondPromise = call(() => loader.load());
  assert.equal(pending.calls.length, 1, "the two callers share one request");
  assert.ok(release !== undefined, "the shared request is in flight");

  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    async () => {
      await call(() => loader.load(controller.signal));
    },
    isAbortError,
    "an already aborted caller rejects with AbortError",
  );
  assert.equal(pending.calls.length, 1, "the aborted caller makes no request");

  release(validBody());
  const [first, second] = await Promise.all([firstPromise, secondPromise]);
  assert.equal(first.status, "ready");
  assert.equal(second.status, "ready");
});

test("C-63a759ac filtering and the notice", () => {
  const registry = call(() => createFeatureRegistry());
  call(() =>
    registry.register({ id: "a", path: "/a", navLabel: "A", element: null }),
  );
  call(() =>
    registry.register({
      id: "b",
      path: "/b",
      navLabel: "B",
      capability: "read_flow",
      element: null,
    }),
  );
  call(() =>
    registry.register({
      id: "c",
      path: "/c",
      navLabel: "C",
      capability: "manage_flows",
      element: null,
    }),
  );

  const ids = (items: NavItem[]): string => items.map((item) => item.id).join(" ");

  const ready: CapabilityState = { status: "ready", me: meWith(["read_flow"]) };
  const signedOut: CapabilityState = { status: "signed_out" };
  const failed: CapabilityState = { status: "failed", code: "AUTHZ_UNAVAILABLE" };

  assert.equal(ids(call(() => visibleNav(ready, registry.nav))), "a b");
  assert.equal(ids(call(() => visibleNav(null, registry.nav))), "a");
  assert.equal(ids(call(() => visibleNav(signedOut, registry.nav))), "a");
  assert.equal(ids(call(() => visibleNav(failed, registry.nav))), "a");

  assert.equal(call(() => capabilityNotice(ready)), null);
  assert.equal(call(() => capabilityNotice(null)), null);
  assert.equal(call(() => capabilityNotice(signedOut)), null);
  assert.equal(call(() => capabilityNotice(failed)), HIDDEN_NOTICE);

  const readyWithToken: CapabilityState = {
    status: "ready",
    me: meWith(["read_flow"], "tok-123-abc"),
  };
  const notice = call(() => capabilityNotice(readyWithToken));
  const visibleIds = ids(call(() => visibleNav(readyWithToken, registry.nav)));
  assert.equal(notice, null);
  assert.ok(!visibleIds.includes("tok-123-abc"), "the nav ids never hold the CSRF token");
  assert.ok(
    !(notice ?? "").includes("tok-123-abc"),
    "the notice never holds the CSRF token",
  );
});
