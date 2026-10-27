/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError, type ApiClient } from "../api/client.ts";
import { engineHealthText, healthView, loadEngineHealth, type EngineHealth } from "./health.ts";

assert.equal(typeof loadEngineHealth, "function");
assert.equal(typeof engineHealthText, "function");
assert.equal(typeof healthView, "function");

type ClientGet = ApiClient["get"];

interface RecordedGet {
  readonly path: string;
  readonly signal: AbortSignal | undefined;
}

interface FakeClient {
  readonly client: Pick<ApiClient, "get">;
  readonly calls: RecordedGet[];
}

function fakeClient(respond: () => unknown | Promise<unknown>): FakeClient {
  const calls: RecordedGet[] = [];
  const get = (async (path: string, opts?: { signal?: AbortSignal }): Promise<unknown> => {
    calls.push({ path, signal: opts?.signal });
    return respond();
  }) as ClientGet;
  return { client: { get }, calls };
}

async function healthFrom(client: Pick<ApiClient, "get">, signal?: AbortSignal): Promise<EngineHealth> {
  let result: EngineHealth | undefined;
  await assert.doesNotReject(async () => {
    result = await loadEngineHealth(client, signal);
  }, "loadEngineHealth must resolve");
  assert.ok(result !== undefined, "loadEngineHealth resolved a health state");
  return result;
}

function healthText(state: EngineHealth | "loading"): string {
  let text: string | undefined;
  assert.doesNotThrow(() => {
    text = engineHealthText(state);
  }, `engineHealthText(${state}) must return a text`);
  assert.ok(text !== undefined, "engineHealthText returned a text");
  return text;
}

interface RenderedHealthView {
  readonly text: string;
  readonly button: "hidden" | "enabled" | "busy";
  readonly focusStatus: boolean;
}

function view(state: EngineHealth | "loading", rechecking: boolean): RenderedHealthView {
  let rendered: RenderedHealthView | undefined;
  assert.doesNotThrow(() => {
    rendered = healthView(state, rechecking);
  }, `healthView(${state}, ${rechecking}) must return a view`);
  assert.ok(rendered !== undefined, "healthView returned a view");
  return rendered;
}

test("C-87996887 loadEngineHealth classifies /health and engineHealthText names each state", async () => {
  const healthy = fakeClient(() => ({ status: "ok", checks: {} }));
  assert.equal(await healthFrom(healthy.client), "healthy");
  assert.deepEqual(healthy.calls, [{ path: "/health", signal: undefined }]);

  const failed = fakeClient(() => ({ status: "fail" }));
  assert.equal(await healthFrom(failed.client), "unavailable");

  const httpError = fakeClient(() => {
    throw new ApiRequestError(503, "HTTP_ERROR", "HTTP 503");
  });
  assert.equal(await healthFrom(httpError.client), "unavailable");

  const networkError = fakeClient(() => {
    throw new ApiRequestError(0, "NETWORK_ERROR", "x");
  });
  assert.equal(await healthFrom(networkError.client), "unavailable");

  assert.equal(healthText("loading"), "Checking engine health");
  assert.equal(healthText("healthy"), "Engine healthy");
  assert.equal(healthText("unavailable"), "Engine unavailable");
});

test("C-87996887 loadEngineHealth rethrows an AbortError unchanged and hands the signal to client.get", async () => {
  const abortError = new DOMException("The operation was aborted.", "AbortError");
  const aborted = fakeClient(() => {
    throw abortError;
  });

  let caught: unknown;
  await assert.rejects(
    async () => {
      await loadEngineHealth(aborted.client);
    },
    (error: unknown) => {
      caught = error;
      return true;
    },
    "the abort rejection must reach the caller",
  );
  assert.equal(caught, abortError, "the AbortError is rethrown unchanged");

  const controller = new AbortController();
  const healthy = fakeClient(() => ({ status: "ok", checks: {} }));
  assert.equal(await healthFrom(healthy.client, controller.signal), "healthy");
  assert.equal(healthy.calls.length, 1, "client.get is called once");
  const [call] = healthy.calls;
  assert.ok(call !== undefined, "client.get was called");
  assert.equal(call.path, "/health");
  assert.equal(call.signal, controller.signal, "client.get receives the caller's signal");
});

test("C-abaa85a3 healthView holds the text, button and focus rule for each state", () => {
  assert.deepEqual(view("loading", false), {
    text: "Checking engine health",
    button: "hidden",
    focusStatus: false,
  });
  assert.deepEqual(view("loading", true), {
    text: "Checking engine health",
    button: "busy",
    focusStatus: false,
  });
  assert.deepEqual(view("healthy", false), {
    text: "Engine healthy",
    button: "hidden",
    focusStatus: false,
  });
  assert.deepEqual(view("healthy", true), {
    text: "Engine healthy",
    button: "hidden",
    focusStatus: true,
  });
  assert.deepEqual(view("unavailable", false), {
    text: "Engine unavailable",
    button: "enabled",
    focusStatus: false,
  });
  assert.deepEqual(view("unavailable", true), {
    text: "Engine unavailable",
    button: "enabled",
    focusStatus: false,
  });
});
