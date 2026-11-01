import assert from "node:assert/strict";
import { test } from "node:test";

import { FlowError } from "../registry/index.ts";
import type { FlowErrorCode } from "../registry/index.ts";
import { ApiError } from "./errors.ts";
import { ERROR_CODES, isRegisteredCode } from "./error-codes.ts";
import { flowApiError } from "./flow-errors.ts";

const SECRET = "secret-input";

function map(code: FlowErrorCode, details?: { reason: "parse"; code: "FORMAT_YAML_SYNTAX" }): unknown {
  let out: unknown = undefined;
  assert.doesNotThrow(() => {
    out = flowApiError(new FlowError(code, SECRET, details));
  });
  return out;
}

function expectApi(out: unknown, status: number, code: string): ApiError {
  assert.ok(out instanceof ApiError, `ApiError for ${code}`);
  assert.equal(out.status, status);
  assert.equal(out.code, code);
  assert.ok(!out.message.includes(SECRET), "message carries no input");
  return out;
}

test("C-96e47324 C-226d18fa: FLOW_TEXT_INVALID is registered with status 422", () => {
  assert.deepEqual(ERROR_CODES["FLOW_TEXT_INVALID"], {
    status: 422,
    message: "Flow text is not a readable flow document",
  });
  assert.equal(isRegisteredCode("FLOW_TEXT_INVALID"), true);
});

test("C-226d18fa: FLOW_INVALID, FLOW_NOT_FOUND and FLOW_EXISTS map to registered codes", () => {
  expectApi(map("FLOW_INVALID"), 400, "VALIDATION_FAILED");
  expectApi(map("FLOW_NOT_FOUND"), 404, "NOT_FOUND");
  expectApi(map("FLOW_EXISTS"), 409, "ALREADY_EXISTS");
});

test("C-226d18fa: FLOW_UNKNOWN_TEAM maps to OPERATION_REFUSED with the reason", () => {
  const api = expectApi(map("FLOW_UNKNOWN_TEAM"), 422, "OPERATION_REFUSED");
  assert.deepEqual(api.details, { reason: "unknown_team" });
});

test("C-226d18fa: FLOW_TEXT_INVALID maps with its details", () => {
  const details = { reason: "parse", code: "FORMAT_YAML_SYNTAX" } as const;
  const api = expectApi(map("FLOW_TEXT_INVALID", details), 422, "FLOW_TEXT_INVALID");
  assert.equal(api.message, "Flow text is not a readable flow document");
  assert.deepEqual(api.details, details);
});

test("C-226d18fa: other errors pass through unchanged", () => {
  const tenant = new FlowError("FLOW_TENANT_MISMATCH", SECRET);
  const boom = new Error("boom");
  const results: unknown[] = [];
  assert.doesNotThrow(() => {
    results.push(flowApiError(tenant), flowApiError(boom), flowApiError("x"));
  });
  assert.equal(results[0], tenant);
  assert.equal(results[1], boom);
  assert.equal(results[2], "x");
});
