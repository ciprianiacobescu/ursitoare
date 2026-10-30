/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { KitError } from "./errors.ts";
import { BASE_MESSAGES, messageFor, registerMessages } from "./messages.ts";

assert.equal(typeof messageFor, "function");

const FALLBACK =
  "Something went wrong. Try again, and tell an administrator if it keeps happening.";

const EXPECTED_MESSAGES: Readonly<Record<string, string>> = {
  UNAUTHENTICATED: "You are not signed in, or your session has ended. Sign in and try again.",
  FORBIDDEN:
    "You are not allowed to do this. If you think you should be, give the decision id to an administrator.",
  CSRF_INVALID: "This page is out of date. Reload it and try again.",
  AUTHZ_UNAVAILABLE: "Authorization is unavailable right now. Try again in a moment.",
  NOT_FOUND: "That item does not exist, or you cannot see it.",
  VALIDATION_FAILED: "Some of the information is not valid. Check it and try again.",
  INTERNAL:
    "The engine hit an unexpected problem. Try again, and tell an administrator if it keeps happening.",
  NETWORK_ERROR: "Cannot reach the engine. Check your connection and try again.",
  HTTP_ERROR: "The engine answered with an error this page does not know.",
  INVALID_RESPONSE: "The engine sent an answer this page cannot read.",
};

function isKitError(code: KitError["code"]): (error: unknown) => boolean {
  return (error: unknown) => error instanceof KitError && error.code === code;
}

function call<T>(run: () => T): T {
  let value: T | undefined;
  let called = false;
  assert.doesNotThrow(() => {
    value = run();
    called = true;
  }, "the call must not throw");
  assert.ok(called, "the call returned a value");
  return value as T;
}

test("C-e2ce7344 known codes", () => {
  assert.deepEqual(
    Object.keys(BASE_MESSAGES).sort(),
    Object.keys(EXPECTED_MESSAGES).sort(),
    "the catalogue holds the ten codes of task 2.1",
  );

  for (const [code, expected] of Object.entries(EXPECTED_MESSAGES)) {
    assert.equal(BASE_MESSAGES[code], expected, `${code} has its catalogue text`);
    assert.equal(call(() => messageFor(code)), expected, `${code} resolves to its text`);
    assert.ok(expected.endsWith("."), `${code} text ends with a full stop`);
    assert.ok(expected.length >= 1 && expected.length <= 200, `${code} text is 1 to 200 characters`);
    assert.ok(!expected.includes(code), `${code} text does not contain its own code`);
  }
});

test("C-2f2f685e unknown codes use the fallback", () => {
  for (const code of ["NO_SUCH_CODE", "", "forbidden", "constructor", "__proto__"]) {
    assert.equal(call(() => messageFor(code)), FALLBACK, `${JSON.stringify(code)} falls back`);
  }
});

test("C-c175f655 later units register codes", () => {
  assert.doesNotThrow(() => registerMessages({ TEST_ONLY_FLOW_LOCKED: "This flow is locked." }));
  assert.doesNotThrow(() => registerMessages({ TEST_ONLY_FLOW_LOCKED: "This flow is locked." }));
  assert.equal(call(() => messageFor("TEST_ONLY_FLOW_LOCKED")), "This flow is locked.");

  assert.throws(
    () => registerMessages({ FORBIDDEN: "x" }),
    isKitError("KIT_MESSAGE_DUPLICATE"),
    "a duplicate code with other text is rejected",
  );
  assert.throws(
    () => registerMessages({ TEST_ONLY_FLOW_LOCKED: "other." }),
    isKitError("KIT_MESSAGE_DUPLICATE"),
    "a registered code cannot change its text",
  );
  assert.throws(
    () => registerMessages({ "bad code": "x" }),
    isKitError("KIT_MESSAGE_INVALID"),
    "a malformed code is rejected",
  );
  assert.throws(
    () => registerMessages({ TEST_ONLY_BLANK: "  " }),
    isKitError("KIT_MESSAGE_INVALID"),
    "a blank text is rejected",
  );
  assert.throws(
    () => registerMessages({ TEST_ONLY_NEW: "New.", FORBIDDEN: "x" }),
    isKitError("KIT_MESSAGE_DUPLICATE"),
    "every entry is validated before any is registered",
  );
  assert.equal(call(() => messageFor("TEST_ONLY_NEW")), FALLBACK);
});
