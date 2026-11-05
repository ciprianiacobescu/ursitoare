/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import type { ApiClient, RequestOptions } from "../api/client.ts";
import type { CapabilityState, Me } from "../kit/capabilities.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import type { VersionRow, VersionState } from "../flows/versions.ts";
import { registerRunMessages } from "./messages.ts";
import {
  parseTestInputs,
  startTestRun,
  testPanelView,
  testRunFormErrors,
} from "./test-run.ts";
import type { TestInputs, TestPanelView } from "./test-run.ts";
import type { RunView } from "./types.ts";

assert.equal(typeof testPanelView, "function");
assert.equal(typeof parseTestInputs, "function");
assert.equal(typeof startTestRun, "function");
assert.equal(typeof testRunFormErrors, "function");

const D = (c: string): string => c.repeat(64);

const CSRF_TOKEN = "csrf_" + "a".repeat(38);

const UNAVAILABLE_TEXT = "Your permissions could not be loaded. Reload the page.";
const DENIED_TEXT = "Only authors can start a test run.";
const NO_VERSION_TEXT = "Save and validate a version to test-run it.";

const MISSING =
  "A block node has no mock. Add a list of mocks for every block node.";
const INVALID =
  "A mock does not fit its node. Check the mocks against the block's output.";
const RUNS_UNAVAILABLE = "Runs are unavailable right now. Try again in a moment.";
const FALLBACK =
  "Something went wrong. Try again, and tell an administrator if it keeps happening.";
const FORBIDDEN_TEXT =
  "You are not allowed to do this. If you think you should be, give the decision id to an administrator.";

const INPUT: Record<string, unknown> = { vendor_name: "ACME", amount: 12.5 };
const MOCKS: Record<string, unknown> = {
  lookup: [{ output: { vendor_id: "V-1", status: "active" } }],
  pay: [{ output: { payment_id: "P-1", status: "created" } }],
};
const INPUT_TEXT = JSON.stringify(INPUT);
const MOCKS_TEXT = JSON.stringify(MOCKS);

const RUN: RunView = {
  id: "run_1",
  flowId: "demo-pay",
  flowHash: `sha256:${D("a")}`,
  mode: "mock",
  trigger: "test",
  state: "completed",
  ownerTeam: "finance",
  principal: { userId: "u_alice", kind: "human" },
  terminalNode: "done",
  error: null,
  inputRef: D("b"),
  outputRef: D("c"),
  createdAt: "2026-11-02T10:00:00.000000Z",
  startedAt: "2026-11-02T10:00:01.000000Z",
  endedAt: "2026-11-02T10:00:02.000000Z",
};

const RUN_QUEUED: RunView = {
  ...RUN,
  state: "queued",
  terminalNode: null,
  outputRef: null,
  startedAt: null,
  endedAt: null,
};

const V: VersionRow = {
  flowId: "demo-pay",
  number: 2,
  hash: `sha256:${D("a")}`,
  state: "validated",
  surface: "yaml",
  author: "u_alice",
  requestedBy: null,
  createdAt: "2026-11-02T10:00:00.000000Z",
  validatedAt: "2026-11-02T10:00:00.000000Z",
  validationOk: true,
};

const VERSION_STATES: VersionState[] = [
  "draft",
  "validated",
  "tested",
  "reviewed",
  "published",
  "deprecated",
];

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function meWith(capabilities: readonly string[]): Me {
  return {
    user: { id: "u_alice", displayName: "Alice", email: null },
    tenant: { id: "tenant_1", name: "Tenant", reviewProfile: "team" },
    capabilities: new Set(capabilities),
    csrfToken: CSRF_TOKEN,
  };
}

function ready(capabilities: readonly string[]): CapabilityState {
  return { status: "ready", me: meWith(capabilities) };
}

function panel(session: CapabilityState | null, version: VersionRow | null): TestPanelView {
  return call(() => testPanelView(session, version));
}

function inputs(inputText: string, mocksText: string): TestInputs {
  return call(() => parseTestInputs(inputText, mocksText));
}

function formErrors(error: unknown): FormErrors {
  return call(() => testRunFormErrors(error));
}

interface PostCall {
  readonly path: string;
  readonly body: unknown;
  readonly opts: Omit<RequestOptions, "body"> | undefined;
}

interface RecordingPostClient {
  readonly client: Pick<ApiClient, "post">;
  readonly calls: PostCall[];
}

function recordingPostClient(...answers: unknown[]): RecordingPostClient {
  const calls: PostCall[] = [];
  let index = 0;
  const client: Pick<ApiClient, "post"> = {
    async post<T>(path: string, body?: unknown, opts?: Omit<RequestOptions, "body">): Promise<T> {
      calls.push({ path, body, opts });
      const answer = answers[Math.min(index, answers.length - 1)] as unknown;
      index += 1;
      if (answer instanceof Error) {
        throw answer;
      }
      return answer as T;
    },
  };
  return { client, calls };
}

async function started(
  client: Pick<ApiClient, "post">,
  request: {
    flowId: string;
    hash: string;
    input: Record<string, unknown>;
    mocks: Record<string, unknown>;
  },
  key: string,
  label: string,
): Promise<RunView> {
  let result: RunView | undefined;
  await assert.doesNotReject(async () => {
    result = await startTestRun(client, request, key);
  }, `${label} resolves`);
  assert.ok(result !== undefined, `${label} returned a run`);
  return result;
}

test("C-a8d83d86: testPanelView shows loading until a session and permissions are known", () => {
  assert.deepEqual(panel(null, null), { kind: "loading" }, "no session yet is loading");

  const signedOut = panel({ status: "signed_out" }, null);
  assert.deepEqual(
    signedOut,
    { kind: "message", reason: "unavailable", text: UNAVAILABLE_TEXT },
    "a signed out session cannot load permissions",
  );

  const failed = panel({ status: "failed", code: "INTERNAL" }, null);
  assert.deepEqual(
    failed,
    { kind: "message", reason: "unavailable", text: UNAVAILABLE_TEXT },
    "a failed session cannot load permissions",
  );
});

test("C-a8d83d86: testPanelView denies a reader and asks for a saved validated version", () => {
  const denied = panel(ready(["read_run"]), V);
  assert.deepEqual(
    denied,
    { kind: "message", reason: "denied", text: DENIED_TEXT },
    "a reader without test_flow cannot start a run",
  );

  const absent = panel(ready(["read_run", "test_flow"]), null);
  assert.deepEqual(
    absent,
    { kind: "message", reason: "no_version", text: NO_VERSION_TEXT },
    "a flow without a version cannot be test-run",
  );

  const draft = panel(ready(["read_run", "test_flow"]), { ...V, state: "draft" });
  assert.deepEqual(
    draft,
    { kind: "message", reason: "no_version", text: NO_VERSION_TEXT },
    "a draft version cannot be test-run",
  );
});

test("C-a8d83d86: testPanelView shows the form for every runnable version state", () => {
  for (const state of VERSION_STATES) {
    if (state === "draft") continue;
    const version: VersionRow = { ...V, state };
    assert.deepEqual(
      panel(ready(["read_run", "test_flow"]), version),
      { kind: "form", number: 2, hash: V.hash },
      `${state} shows the form with its version number and hash`,
    );
  }
});

test("C-a8d83d86: parseTestInputs parses both texts as JSON objects", () => {
  assert.deepEqual(
    inputs("{}", "{}"),
    { ok: true, input: {}, mocks: {} },
    "two empty objects are accepted",
  );

  assert.deepEqual(
    inputs(INPUT_TEXT, MOCKS_TEXT),
    { ok: true, input: INPUT, mocks: MOCKS },
    "the input and mocks texts become their objects",
  );

  const proto = inputs('{"__proto__":{"x":1}}', "{}");
  assert.equal(proto.ok, true, "an object with a proto key is accepted");
  if (proto.ok) {
    assert.equal(
      Object.hasOwn(proto.input, "__proto__"),
      true,
      "the proto key is an own property of the parsed input",
    );
    assert.deepEqual(
      Object.getOwnPropertyDescriptor(proto.input, "__proto__")?.value,
      { x: 1 },
      "the proto key keeps its parsed value",
    );
  }
});

test("C-a8d83d86: parseTestInputs explains empty array invalid and null texts", () => {
  assert.deepEqual(
    inputs("", "{}"),
    { ok: false, errors: { input: "Enter a JSON object." } },
    "an empty input text asks for a JSON object",
  );

  assert.deepEqual(
    inputs("[1]", "{}"),
    { ok: false, errors: { input: "Enter a JSON object, for example {}." } },
    "an array is not a JSON object",
  );

  assert.deepEqual(
    inputs("{", "null"),
    {
      ok: false,
      errors: {
        input: "This is not valid JSON.",
        mocks: "Enter a JSON object, for example {}.",
      },
    },
    "broken JSON and a null mocks text are both explained",
  );
});

test("C-c7363684: startTestRun posts the test route and returns the run", async () => {
  const recording = recordingPostClient({ run: RUN_QUEUED });
  const run = await started(
    recording.client,
    { flowId: "demo-pay", hash: `sha256:${D("a")}`, input: INPUT, mocks: MOCKS },
    "key-1",
    "starting a test run",
  );

  assert.deepEqual(run, RUN_QUEUED, "the answer's run is parsed and returned");
  assert.equal(recording.calls.length, 1, "starting the run made one post");
  assert.deepEqual(
    recording.calls[0],
    {
      path: `/flows/demo-pay/versions/sha256%3A${D("a")}/test`,
      body: { input: INPUT, mocks: MOCKS },
      opts: { headers: { "Idempotency-Key": "key-1" } },
    },
    "the post asks the encoded test route with its body and idempotency key",
  );
});

test("C-c7363684: startTestRun refuses an answer whose run is not valid", async () => {
  const recording = recordingPostClient({ run: { ...RUN_QUEUED, state: "paused" } });

  await assert.rejects(
    startTestRun(
      recording.client,
      { flowId: "demo-pay", hash: `sha256:${D("a")}`, input: INPUT, mocks: MOCKS },
      "key-1",
    ),
    (error: unknown) =>
      error instanceof ApiRequestError && error.status === 200 && error.code === "INVALID_RESPONSE",
    "a run state outside the union rejects with INVALID_RESPONSE of status 200",
  );
  assert.equal(recording.calls.length, 1, "the invalid answer followed one post");
});

test("C-c7363684: startTestRun refuses a bad flow id and hash without a post", async () => {
  const badFlow = recordingPostClient();
  await assert.rejects(
    startTestRun(
      badFlow.client,
      { flowId: "Bad_Id", hash: `sha256:${D("a")}`, input: INPUT, mocks: MOCKS },
      "key-1",
    ),
    RangeError,
    "a flow id outside the grammar is refused",
  );
  assert.equal(badFlow.calls.length, 0, "nothing was posted for the bad flow id");

  const badHash = recordingPostClient();
  await assert.rejects(
    startTestRun(
      badHash.client,
      { flowId: "demo-pay", hash: "sha256:xyz", input: INPUT, mocks: MOCKS },
      "key-1",
    ),
    RangeError,
    "a hash outside the grammar is refused",
  );
  assert.equal(badHash.calls.length, 0, "nothing was posted for the bad hash");
});

test("C-c7363684: testRunFormErrors explains missing and invalid mocks", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");
  assert.doesNotThrow(() => registerRunMessages(), "registering the run messages twice is idempotent");

  const missing = formErrors(
    new ApiRequestError(422, "TEST_MOCK_MISSING", "m", {
      details: { nodes: ["lookup", "pay"] },
    }),
  );
  assert.deepEqual(
    missing,
    { mocks: `${MISSING} Missing: lookup, pay.` },
    "a missing mock names every block node",
  );

  const invalid = formErrors(
    new ApiRequestError(422, "TEST_MOCK_INVALID", "m", {
      details: {
        problems: [{ nodeId: "pay", index: 0, reason: "schema", detail: "/status enum" }],
      },
    }),
  );
  assert.deepEqual(
    invalid,
    { mocks: `${INVALID} First problem: pay (schema /status enum).` },
    "an invalid mock names its first problem",
  );
});

test("C-c7363684: testRunFormErrors explains unavailable forbidden and unknown errors", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");

  assert.deepEqual(
    formErrors(new ApiRequestError(503, "RUNS_UNAVAILABLE", "m")),
    { $form: RUNS_UNAVAILABLE },
    "unavailable runs show their catalogue text",
  );

  assert.deepEqual(
    formErrors(
      new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } }),
    ),
    { $form: `${FORBIDDEN_TEXT} Decision id: d-1` },
    "a forbidden start appends its decision id",
  );

  assert.deepEqual(
    formErrors(new Error("boom")),
    { $form: FALLBACK },
    "an unknown failure shows the fallback text",
  );
});

test("C-c7363684: testRunFormErrors explains refusals of the engine", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");

  const emptyNode = formErrors(
    new ApiRequestError(422, "TEST_MOCK_INVALID", "m", {
      details: {
        problems: [{ nodeId: "", index: 0, reason: "schema", detail: "/status enum" }],
      },
    }),
  );
  assert.deepEqual(
    emptyNode,
    { mocks: `${INVALID} First problem: mocks (schema /status enum).` },
    "a problem without a node names the mocks",
  );

  const kindUnsupported = formErrors(
    new ApiRequestError(422, "OPERATION_REFUSED", "m", {
      details: { reason: "kind_unsupported" },
    }),
  );
  assert.deepEqual(
    kindUnsupported,
    { $form: "The flow uses a node kind that test runs do not support yet." },
    "an unsupported node kind explains itself",
  );

  const blocksMissing = formErrors(
    new ApiRequestError(422, "OPERATION_REFUSED", "m", {
      details: {
        reason: "version_not_runnable",
        cause: "block_missing",
        blocks: ["erp.lookup_vendor@1", "erp.create_payment@1"],
      },
    }),
  );
  assert.deepEqual(
    blocksMissing,
    {
      $form:
        "The flow uses blocks the registry does not have: " +
        "erp.lookup_vendor@1, erp.create_payment@1.",
    },
    "missing blocks are listed in the message",
  );

  const other = formErrors(new ApiRequestError(500, "INTERNAL", "m"));
  assert.deepEqual(
    other,
    {
      $form:
        "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
    },
    "another engine error shows its kit text",
  );
});
