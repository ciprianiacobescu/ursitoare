import { ApiRequestError } from "../api/client.ts";
import type { ApiClient } from "../api/client.ts";
import type { VersionRow } from "../flows/versions.ts";
import type { CapabilityState } from "../kit/capabilities.ts";
import type { FormErrors } from "../kit/data/form-errors.ts";
import { messageFor } from "../kit/messages.ts";
import { runErrorMessage } from "./messages.ts";
import { parseRunView } from "./types.ts";
import type { RunView } from "./types.ts";

export type TestInputs =
  | { ok: true; input: Record<string, unknown>; mocks: Record<string, unknown> }
  | { ok: false; errors: FormErrors };

export type TestPanelView =
  | { kind: "loading" }
  | { kind: "message"; reason: "unavailable" | "denied" | "no_version"; text: string }
  | { kind: "form"; number: number; hash: string };

const FLOW_ID_PATTERN = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
const FLOW_ID_MAX_LENGTH = 64;
const HASH_PATTERN = /^sha256:[0-9a-f]{64}$/;

const UNAVAILABLE_TEXT = "Your permissions could not be loaded. Reload the page.";
const DENIED_TEXT = "Only authors can start a test run.";
const NO_VERSION_TEXT = "Save and validate a version to test-run it.";

const EMPTY_OBJECT_TEXT = "Enter a JSON object.";
const NOT_JSON_TEXT = "This is not valid JSON.";
const NOT_OBJECT_TEXT = "Enter a JSON object, for example {}.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFlowId(value: string): boolean {
  return value.length <= FLOW_ID_MAX_LENGTH && FLOW_ID_PATTERN.test(value);
}

function isHash(value: string): boolean {
  return HASH_PATTERN.test(value);
}

export function testPanelView(
  session: CapabilityState | null,
  version: VersionRow | null,
): TestPanelView {
  if (session === null) {
    return { kind: "loading" };
  }
  if (session.status !== "ready") {
    return { kind: "message", reason: "unavailable", text: UNAVAILABLE_TEXT };
  }
  if (!session.me.capabilities.has("test_flow")) {
    return { kind: "message", reason: "denied", text: DENIED_TEXT };
  }
  if (version === null || version.state === "draft") {
    return { kind: "message", reason: "no_version", text: NO_VERSION_TEXT };
  }
  return { kind: "form", number: version.number, hash: version.hash };
}

type ParsedObject =
  | { readonly ok: true; readonly value: Record<string, unknown> }
  | { readonly ok: false; readonly message: string };

function parseObjectText(text: string): ParsedObject {
  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return { ok: false, message: EMPTY_OBJECT_TEXT };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed) as unknown;
  } catch {
    return { ok: false, message: NOT_JSON_TEXT };
  }
  if (!isRecord(parsed)) {
    return { ok: false, message: NOT_OBJECT_TEXT };
  }
  return { ok: true, value: parsed };
}

export function parseTestInputs(inputText: string, mocksText: string): TestInputs {
  const input = parseObjectText(inputText);
  const mocks = parseObjectText(mocksText);
  if (!input.ok || !mocks.ok) {
    const errors: Record<string, string> = {};
    if (!input.ok) errors["input"] = input.message;
    if (!mocks.ok) errors["mocks"] = mocks.message;
    return { ok: false, errors };
  }
  return { ok: true, input: input.value, mocks: mocks.value };
}

export async function startTestRun(
  client: Pick<ApiClient, "post">,
  request: {
    flowId: string;
    hash: string;
    input: Record<string, unknown>;
    mocks: Record<string, unknown>;
  },
  key: string,
): Promise<RunView> {
  if (!isFlowId(request.flowId)) {
    throw new RangeError("flowId must match ^[a-z][a-z0-9]*(-[a-z0-9]+)*$");
  }
  if (!isHash(request.hash)) {
    throw new RangeError("hash must match ^sha256:[0-9a-f]{64}$");
  }
  const path = `/flows/${request.flowId}/versions/${encodeURIComponent(request.hash)}/test`;
  const answer: unknown = await client.post<unknown>(
    path,
    { input: request.input, mocks: request.mocks },
    { headers: { "Idempotency-Key": key } },
  );
  if (!isRecord(answer)) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid test run answer");
  }
  const run = parseRunView(answer["run"]);
  if (run === null) {
    throw new ApiRequestError(200, "INVALID_RESPONSE", "Invalid test run answer");
  }
  return run;
}

function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string");
}

function missingMocks(details: unknown): FormErrors {
  const nodes = isRecord(details) ? stringArray(details["nodes"]) : [];
  const text = messageFor("TEST_MOCK_MISSING");
  return {
    mocks: nodes.length === 0 ? text : `${text} Missing: ${nodes.join(", ")}.`,
  };
}

function invalidMocks(details: unknown): FormErrors {
  const text = messageFor("TEST_MOCK_INVALID");
  if (!isRecord(details)) return { mocks: text };
  const problems = details["problems"];
  if (!Array.isArray(problems) || problems.length === 0) return { mocks: text };
  const first: unknown = problems[0];
  if (!isRecord(first)) return { mocks: text };
  const nodeId = typeof first["nodeId"] === "string" ? first["nodeId"] : "";
  const reason = typeof first["reason"] === "string" ? first["reason"] : "";
  const detail = typeof first["detail"] === "string" ? first["detail"] : "";
  const node = nodeId.length === 0 ? "mocks" : nodeId;
  return { mocks: `${text} First problem: ${node} (${reason} ${detail}).` };
}

function refusedTest(details: Record<string, unknown>): FormErrors | null {
  const reason = details["reason"];
  if (reason === "kind_unsupported") {
    return { $form: "The flow uses a node kind that test runs do not support yet." };
  }
  if (reason === "version_not_runnable" && details["cause"] === "block_missing") {
    const blocks = stringArray(details["blocks"]);
    return {
      $form: `The flow uses blocks the registry does not have: ${blocks.join(", ")}.`,
    };
  }
  return null;
}

export function testRunFormErrors(error: unknown): FormErrors {
  if (error instanceof ApiRequestError) {
    if (error.code === "TEST_MOCK_MISSING") {
      return missingMocks(error.details);
    }
    if (error.code === "TEST_MOCK_INVALID") {
      return invalidMocks(error.details);
    }
    if (error.status === 422 && error.code === "OPERATION_REFUSED" && isRecord(error.details)) {
      const refused = refusedTest(error.details);
      if (refused !== null) return refused;
    }
  }
  return { $form: runErrorMessage(error) };
}
