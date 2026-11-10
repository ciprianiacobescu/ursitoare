import assert from "node:assert/strict";
import { test } from "node:test";

import { ERROR_CODES } from "./error-codes.ts";
import { isRegisteredCode } from "./error-codes.ts";

assert.equal(typeof isRegisteredCode, "function");

test("C-96e47324 registers EGRESS_UNAVAILABLE with its status and message", () => {
  assert.deepEqual(ERROR_CODES.EGRESS_UNAVAILABLE, {
    status: 503,
    message: "The egress broker or vault is unavailable",
  });
  assert.equal(isRegisteredCode("EGRESS_UNAVAILABLE"), true, "isRegisteredCode(EGRESS_UNAVAILABLE)");
});
