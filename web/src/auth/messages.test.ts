/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { FALLBACK_MESSAGE, messageFor } from "../kit/messages.ts";
import { SIGN_IN_ERROR_CODES, SIGN_IN_MESSAGES, registerSignInMessages } from "./messages.ts";

assert.equal(typeof registerSignInMessages, "function");

const EXPECTED_CODES: readonly string[] = [
  "SESSION_ENDED",
  "OIDC_LOGIN_EXPIRED",
  "OIDC_STATE_MISMATCH",
  "OIDC_BAD_REQUEST",
  "OIDC_EXCHANGE_FAILED",
  "OIDC_PROVIDER_UNAVAILABLE",
  "OIDC_TOKEN_INVALID",
  "OIDC_UNKNOWN_TENANT",
  "OIDC_USER_DISABLED",
  "OIDC_INTERNAL",
];

const EXPECTED_MESSAGES: Readonly<Record<string, string>> = {
  SESSION_ENDED: "Your session has ended, or you are not signed in. Sign in to continue.",
  OIDC_LOGIN_EXPIRED: "The sign-in took too long or began in another tab. Try again.",
  OIDC_STATE_MISMATCH: "The sign-in did not match this browser. Try again.",
  OIDC_BAD_REQUEST: "The sign-in answer was incomplete. Try again.",
  OIDC_EXCHANGE_FAILED: "The identity provider refused the sign-in. Try again.",
  OIDC_PROVIDER_UNAVAILABLE:
    "The identity provider cannot be reached right now. Try again in a moment.",
  OIDC_TOKEN_INVALID:
    "The identity provider sent an answer that could not be trusted. Try again or ask an administrator.",
  OIDC_UNKNOWN_TENANT: "Your organization is not set up on this engine. Ask an administrator.",
  OIDC_USER_DISABLED: "Your account is disabled. Ask an administrator.",
  OIDC_INTERNAL: "Sign-in hit an unexpected problem. Try again or ask an administrator.",
  OIDC_CSRF_INVALID: "This page is out of date. Reload it and try again.",
  OIDC_NOT_CONFIGURED: "Sign-in is not configured on this engine. Ask an administrator.",
};

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

function textOf(code: string): string {
  const text = SIGN_IN_MESSAGES[code];
  assert.equal(typeof text, "string", `${code} has a catalogue entry`);
  return text as string;
}

test("C-01e427f8 every code has a text", () => {
  assert.doesNotThrow(() => registerSignInMessages(), "the first registration succeeds");
  assert.doesNotThrow(() => registerSignInMessages(), "registration is idempotent");

  assert.deepEqual(SIGN_IN_ERROR_CODES, EXPECTED_CODES, "the codes are the closed ordered list");

  for (const code of SIGN_IN_ERROR_CODES) {
    const expected = textOf(code);
    const answer = call(() => messageFor(code));
    assert.equal(answer, expected, `${code} resolves to its catalogue text`);
    assert.notEqual(answer, FALLBACK_MESSAGE, `${code} does not fall back`);
  }

  for (const code of ["OIDC_CSRF_INVALID", "OIDC_NOT_CONFIGURED"]) {
    const expected = textOf(code);
    const answer = call(() => messageFor(code));
    assert.equal(answer, expected, `${code} resolves to its catalogue text`);
    assert.notEqual(answer, FALLBACK_MESSAGE, `${code} does not fall back`);
  }

  const texts = SIGN_IN_ERROR_CODES.map((code) => textOf(code));
  for (const text of texts) {
    assert.ok(text.length >= 1 && text.length <= 200, "every text is 1 to 200 characters");
  }
  assert.equal(new Set(texts).size, EXPECTED_CODES.length, "the ten texts are pairwise different");

  assert.equal(
    call(() => messageFor("UNKNOWN_ERROR")),
    FALLBACK_MESSAGE,
    "an unknown code gives the fallback",
  );
});

test("C-e78811f4 the texts", () => {
  assert.deepEqual(SIGN_IN_MESSAGES, EXPECTED_MESSAGES, "the catalogue holds exactly twelve entries");
});
