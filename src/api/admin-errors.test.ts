import assert from "node:assert/strict";
import { test } from "node:test";

import { AdminError } from "../identity/admin/errors.ts";
import { IdentityError } from "../identity/errors.ts";
import { RbacError } from "../identity/rbac/errors.ts";
import { adminApiError } from "./admin-errors.ts";
import { ApiError } from "./errors.ts";

assert.equal(typeof adminApiError, "function");

const SECRET = "secret-input";

interface MappingCase {
  name: string;
  error: unknown;
  status: number;
  code: string;
  reason?: string;
}

function mapped(error: unknown): ApiError {
  let result: unknown;
  assert.doesNotThrow(() => {
    result = adminApiError(error);
  }, "adminApiError returns an answer");
  assert.ok(result instanceof ApiError, "the answer is an ApiError");
  return result;
}

test("C-cc3ddc89 admin errors map to registered API codes", () => {
  const cases: MappingCase[] = [
    {
      name: "RBAC_INVALID",
      error: new RbacError("RBAC_INVALID", SECRET),
      status: 400,
      code: "VALIDATION_FAILED",
    },
    {
      name: "IDENTITY_INVALID",
      error: new IdentityError("IDENTITY_INVALID", SECRET),
      status: 400,
      code: "VALIDATION_FAILED",
    },
    {
      name: "ADMIN_INVALID",
      error: new AdminError("ADMIN_INVALID", SECRET),
      status: 400,
      code: "VALIDATION_FAILED",
    },
    {
      name: "RBAC_NOT_FOUND",
      error: new RbacError("RBAC_NOT_FOUND", SECRET),
      status: 404,
      code: "NOT_FOUND",
    },
    {
      name: "ADMIN_NOT_FOUND",
      error: new AdminError("ADMIN_NOT_FOUND", SECRET),
      status: 404,
      code: "NOT_FOUND",
    },
    {
      name: "RBAC_EXISTS",
      error: new RbacError("RBAC_EXISTS", SECRET),
      status: 409,
      code: "ALREADY_EXISTS",
    },
    {
      name: "ADMIN_EXISTS",
      error: new AdminError("ADMIN_EXISTS", SECRET),
      status: 409,
      code: "ALREADY_EXISTS",
    },
    {
      name: "RBAC_IN_USE",
      error: new RbacError("RBAC_IN_USE", SECRET),
      status: 409,
      code: "IN_USE",
    },
    {
      name: "RBAC_ELEVATION",
      error: new RbacError("RBAC_ELEVATION", SECRET),
      status: 403,
      code: "ELEVATION_REFUSED",
    },
    {
      name: "RBAC_UNKNOWN_ISSUER",
      error: new RbacError("RBAC_UNKNOWN_ISSUER", SECRET),
      status: 422,
      code: "UNKNOWN_ISSUER",
    },
    {
      name: "ADMIN_UNKNOWN_ISSUER",
      error: new AdminError("ADMIN_UNKNOWN_ISSUER", SECRET),
      status: 422,
      code: "UNKNOWN_ISSUER",
    },
    {
      name: "ADMIN_SELF_DISABLE",
      error: new AdminError("ADMIN_SELF_DISABLE", SECRET),
      status: 422,
      code: "OPERATION_REFUSED",
      reason: "self_disable",
    },
    {
      name: "ADMIN_WRONG_KIND",
      error: new AdminError("ADMIN_WRONG_KIND", SECRET),
      status: 422,
      code: "OPERATION_REFUSED",
      reason: "wrong_kind",
    },
    {
      name: "IDENTITY_OWNER_INVALID",
      error: new IdentityError("IDENTITY_OWNER_INVALID", SECRET),
      status: 422,
      code: "OPERATION_REFUSED",
      reason: "owner_invalid",
    },
  ];

  for (const item of cases) {
    const answer = mapped(item.error);
    assert.equal(answer.status, item.status, `${item.name} status`);
    assert.equal(answer.code, item.code, `${item.name} code`);
    assert.ok(
      !answer.message.includes(SECRET),
      `${item.name} does not echo the input message`,
    );
    if (item.reason !== undefined) {
      assert.deepEqual(answer.details, { reason: item.reason }, `${item.name} details`);
    }
  }
});

test("C-e8ea1428 other errors pass through unchanged", () => {
  const inputs: unknown[] = [
    new RbacError("RBAC_TENANT_MISMATCH", SECRET),
    new RbacError("RBAC_DIRECT_GRANT_REFUSED", SECRET),
    new AdminError("ADMIN_TENANT_MISMATCH", SECRET),
    new Error("boom"),
    "x",
  ];

  for (const input of inputs) {
    let result: unknown;
    assert.doesNotThrow(() => {
      result = adminApiError(input);
    }, "adminApiError passes an unmapped error through");
    assert.strictEqual(result, input, "the result is the same value");
  }
});
