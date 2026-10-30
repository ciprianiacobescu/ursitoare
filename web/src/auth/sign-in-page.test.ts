/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { CapabilityState, Me } from "../kit/capabilities.ts";
import { signInView } from "./sign-in-page.ts";

assert.equal(typeof signInView, "function");

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function ready(displayName: string): CapabilityState {
  const me: Me = {
    user: { id: "user-1", displayName, email: null },
    tenant: { id: "tenant-1", name: "E2E tenant", reviewProfile: "solo" },
    capabilities: new Set(["read_self"]),
    csrfToken: "t" + "A".repeat(42),
  };
  return { status: "ready", me };
}

test("C-22c98964 the sign-in page decides its state", () => {
  assert.deepEqual(
    call(() => signInView("", null)),
    { phase: "checking" },
    "an unknown session shows the checking state",
  );

  const signedOut: CapabilityState = { status: "signed_out" };
  assert.deepEqual(
    call(() => signInView("?error=SESSION_ENDED&return_to=%2Fflows", signedOut)),
    {
      phase: "ready",
      errorCode: "SESSION_ENDED",
      loginHref: "/auth/oidc/login?return_to=%2Fflows",
    },
    "a known error and return path reach the ready state",
  );

  const failed: CapabilityState = { status: "failed", code: "AUTHZ_UNAVAILABLE" };
  assert.deepEqual(
    call(() => signInView("", failed)),
    { phase: "ready", errorCode: null, loginHref: "/auth/oidc/login?return_to=%2F" },
    "a failed session still offers the sign-in button without an error",
  );

  assert.deepEqual(
    call(() => signInView("?error=%3Cb%3E", signedOut)),
    { phase: "ready", errorCode: "UNKNOWN_ERROR", loginHref: "/auth/oidc/login?return_to=%2F" },
    "an unknown error code becomes the fallback code",
  );

  assert.deepEqual(
    call(() => signInView("?return_to=https%3A%2F%2Fevil.invalid", signedOut)),
    { phase: "ready", errorCode: null, loginHref: "/auth/oidc/login?return_to=%2F" },
    "a foreign return path is refused",
  );

  assert.deepEqual(
    call(() => signInView("?return_to=%2Fruns%2F5", ready("Alice Example"))),
    { phase: "signed_in", displayName: "Alice Example", continueHref: "/runs/5" },
    "a live session names the user and keeps the return path",
  );
});
