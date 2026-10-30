/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { CapabilityState, Me } from "../kit/capabilities.ts";
import { accountView } from "./account.ts";

assert.equal(typeof accountView, "function");

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

function ready(displayName: string, tenantName: string): CapabilityState {
  const me: Me = {
    user: { id: "user-1", displayName, email: null },
    tenant: { id: "tenant-1", name: tenantName, reviewProfile: "solo" },
    capabilities: new Set(["read_self"]),
    csrfToken: "t" + "A".repeat(42),
  };
  return { status: "ready", me };
}

test("C-e3de8f9e header shows the user and tenant and offers sign out", () => {
  assert.deepEqual(
    call(() => accountView(null, { pathname: "/flows", search: "?tab=2" })),
    { kind: "hidden" },
    "an unknown session hides the account",
  );

  const failed: CapabilityState = { status: "failed", code: "AUTHZ_UNAVAILABLE" };
  assert.deepEqual(
    call(() => accountView(failed, { pathname: "/flows", search: "?tab=2" })),
    { kind: "hidden" },
    "a failed session hides the account",
  );

  const signedOut: CapabilityState = { status: "signed_out" };
  assert.deepEqual(
    call(() => accountView(signedOut, { pathname: "/flows", search: "?tab=2" })),
    { kind: "signed_out", href: "/sign-in?return_to=%2Fflows%3Ftab%3D2" },
    "a signed-out visitor gets the sign-in link back to the current path",
  );
  assert.deepEqual(
    call(() => accountView(signedOut, { pathname: "/", search: "" })),
    { kind: "signed_out", href: "/sign-in" },
    "the root needs no return path",
  );
  assert.deepEqual(
    call(() => accountView(signedOut, { pathname: "/sign-in", search: "" })),
    { kind: "hidden" },
    "the sign-in page offers no sign-in link",
  );

  assert.deepEqual(
    call(() => accountView(ready("<b>Alice</b>", "T <i>"), { pathname: "/flows", search: "" })),
    { kind: "signed_in", displayName: "<b>Alice</b>", tenantName: "T <i>" },
    "a live session keeps both names unchanged as data",
  );
});
