import assert from "node:assert/strict";
import { test } from "node:test";

import { ERROR_CODES, isRegisteredCode } from "./error-codes.ts";

test("C-96e47324 registers TEST_MOCK_MISSING with its status and message", () => {
  assert.deepEqual(ERROR_CODES.TEST_MOCK_MISSING, {
    status: 422,
    message: "A block node has no mock",
  });
  assert.equal(isRegisteredCode("TEST_MOCK_MISSING"), true, "isRegisteredCode(TEST_MOCK_MISSING)");
});

test("C-96e47324 registers TEST_MOCK_INVALID with its status and message", () => {
  assert.deepEqual(ERROR_CODES.TEST_MOCK_INVALID, {
    status: 422,
    message: "A mock does not fit its node",
  });
  assert.equal(isRegisteredCode("TEST_MOCK_INVALID"), true, "isRegisteredCode(TEST_MOCK_INVALID)");
});
