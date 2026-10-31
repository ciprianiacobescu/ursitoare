import assert from "node:assert/strict";
import { test } from "node:test";

import { ERROR_CODES } from "./error-codes.ts";
import { isRegisteredCode } from "./error-codes.ts";
import { unregisteredRouteErrors } from "./error-codes.ts";

assert.equal(typeof isRegisteredCode, "function");
assert.equal(typeof unregisteredRouteErrors, "function");

test("C-96e47324 The registry holds exactly the 16 codes of the API with status and message", () => {
  const EXPECTED_CODES: Readonly<Record<string, { readonly status: number; readonly message: string }>> = {
    NOT_FOUND: { status: 404, message: "Route not found" },
    VALIDATION_FAILED: { status: 400, message: "Request validation failed" },
    PAYLOAD_TOO_LARGE: { status: 413, message: "Payload too large" },
    UNSUPPORTED_MEDIA_TYPE: { status: 415, message: "Unsupported media type" },
    BAD_REQUEST: { status: 400, message: "Bad request" },
    INTERNAL: { status: 500, message: "Internal server error" },
    WEB_NOT_BUILT: { status: 503, message: "Web app is not built" },
    UNAUTHENTICATED: { status: 401, message: "Authentication required" },
    FORBIDDEN: { status: 403, message: "Action not permitted" },
    CSRF_INVALID: { status: 403, message: "CSRF token missing or invalid" },
    OIDC_CSRF_INVALID: { status: 403, message: "CSRF token missing or invalid" },
    OIDC_NOT_CONFIGURED: { status: 503, message: "Sign-in is not configured" },
    AUTHZ_UNAVAILABLE: { status: 503, message: "Authorization is unavailable" },
    CURSOR_INVALID: { status: 400, message: "Cursor is invalid" },
    IDEMPOTENCY_KEY_REUSED: {
      status: 422,
      message: "Idempotency key was used with a different request",
    },
    IDEMPOTENCY_IN_PROGRESS: {
      status: 409,
      message: "A request with this idempotency key is in progress",
    },
    ALREADY_EXISTS: { status: 409, message: "Resource already exists" },
    IN_USE: { status: 409, message: "Resource is in use" },
    ELEVATION_REFUSED: { status: 403, message: "Role cannot be granted by this principal" },
    UNKNOWN_ISSUER: { status: 422, message: "Issuer is not routed to this tenant" },
    OPERATION_REFUSED: { status: 422, message: "Operation is refused" },
    ENGINE_KEY_REQUIRED: {
      status: 503,
      message: "Paging needs the engine key (URSITOARE_ENGINE_KEY_FILE)",
    },
  };

  assert.deepEqual(Object.keys(ERROR_CODES).sort(), Object.keys(EXPECTED_CODES).sort());
  for (const [code, expected] of Object.entries(EXPECTED_CODES)) {
    assert.deepEqual(ERROR_CODES[code], expected, code);
  }

  const registered: Array<{ code: string; result: boolean }> = [];
  assert.doesNotThrow(() => {
    for (const code of Object.keys(EXPECTED_CODES)) {
      registered.push({ code, result: isRegisteredCode(code) });
    }
  }, "isRegisteredCode over the registered codes");
  for (const { code, result } of registered) {
    assert.equal(result, true, `isRegisteredCode(${code})`);
  }

  const refused: Array<{ code: string; result: boolean }> = [];
  assert.doesNotThrow(() => {
    for (const code of ["cursor_invalid", "", "NOT_A_CODE", "constructor"]) {
      refused.push({ code, result: isRegisteredCode(code) });
    }
  }, "isRegisteredCode over unregistered codes");
  for (const { code, result } of refused) {
    assert.equal(result, false, `isRegisteredCode(${code})`);
  }
});

test("C-541ef4f9 Route errors lists only routes whose declared codes are unregistered", () => {
  let reported: string[] | undefined;
  assert.doesNotThrow(() => {
    reported = unregisteredRouteErrors([
      { method: "GET", url: "/a", errors: ["NOT_FOUND", "NOPE"] },
      { method: "POST", url: "/b", errors: [] },
    ]);
  }, "unregisteredRouteErrors");
  assert.deepEqual(reported, ["GET /a: NOPE"]);

  let quiet: string[] | undefined;
  assert.doesNotThrow(() => {
    quiet = unregisteredRouteErrors([]);
  }, "unregisteredRouteErrors over no routes");
  assert.deepEqual(quiet, []);
});
