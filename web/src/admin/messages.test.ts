/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { FALLBACK_MESSAGE, messageFor } from "../kit/messages.ts";
import { ADMIN_MESSAGES, adminErrorMessage, registerAdminMessages } from "./messages.ts";

assert.equal(typeof adminErrorMessage, "function");

const EXPECTED_MESSAGES: Readonly<Record<string, string>> = {
  ALREADY_EXISTS: "That name is already taken. Choose another.",
  IN_USE: "This team is still the target of a group mapping. Remove that mapping first.",
  ELEVATION_REFUSED: "You cannot manage a role you do not hold, or your own access.",
  UNKNOWN_ISSUER:
    "That issuer is not set up for this tenant. Check the issuer URL your identity provider uses.",
  OPERATION_REFUSED: "The engine refused this operation.",
  ENGINE_KEY_REQUIRED: "Paging is unavailable because the engine key is not configured.",
};

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

test("C-195c3385 the admin messages register their catalogue texts", () => {
  assert.doesNotThrow(() => registerAdminMessages(), "the admin messages register");
  assert.doesNotThrow(() => registerAdminMessages(), "registering twice is idempotent");

  assert.deepEqual(
    Object.keys(ADMIN_MESSAGES).sort(),
    Object.keys(EXPECTED_MESSAGES).sort(),
    "the catalogue holds exactly the six admin codes",
  );

  for (const [code, text] of Object.entries(EXPECTED_MESSAGES)) {
    assert.equal(ADMIN_MESSAGES[code], text, `${code} has its catalogue text`);
    const resolved = call(() => messageFor(code));
    assert.equal(resolved, text, `${code} resolves to its catalogue text`);
    assert.notEqual(resolved, FALLBACK_MESSAGE, `${code} does not fall back`);
  }
});

test("C-0c949ead an action error shows catalogue text and the decision id", () => {
  assert.doesNotThrow(() => registerAdminMessages(), "the admin messages register");

  const inUse = call(() => adminErrorMessage(new ApiRequestError(409, "IN_USE", "raw SQL")));
  assert.equal(inUse, EXPECTED_MESSAGES["IN_USE"], "IN_USE shows its catalogue text");
  assert.ok(!inUse.includes("raw SQL"), "the server message is not shown");

  const selfDisable = call(() =>
    adminErrorMessage(
      new ApiRequestError(422, "OPERATION_REFUSED", "x", {
        details: { reason: "self_disable" },
      }),
    ),
  );
  assert.equal(selfDisable, "You cannot disable your own account.", "self_disable explains itself");

  const wrongKind = call(() =>
    adminErrorMessage(
      new ApiRequestError(422, "OPERATION_REFUSED", "x", {
        details: { reason: "wrong_kind" },
      }),
    ),
  );
  assert.equal(wrongKind, "That account is not a person's account.", "wrong_kind explains itself");

  const ownerInvalid = call(() =>
    adminErrorMessage(
      new ApiRequestError(422, "OPERATION_REFUSED", "x", {
        details: { reason: "owner_invalid" },
      }),
    ),
  );
  assert.equal(
    ownerInvalid,
    "The owner must be an active person.",
    "owner_invalid explains itself",
  );

  const otherReason = call(() =>
    adminErrorMessage(
      new ApiRequestError(422, "OPERATION_REFUSED", "x", {
        details: { reason: "other" },
      }),
    ),
  );
  assert.equal(
    otherReason,
    EXPECTED_MESSAGES["OPERATION_REFUSED"],
    "an unknown reason shows the OPERATION_REFUSED text",
  );

  const forbidden = call(() =>
    adminErrorMessage(
      new ApiRequestError(403, "FORBIDDEN", "x", {
        details: { decisionId: "d-1" },
      }),
    ),
  );
  assert.equal(
    forbidden,
    `${messageFor("FORBIDDEN")} Decision id: d-1`,
    "a refusal appends its decision id",
  );
});
