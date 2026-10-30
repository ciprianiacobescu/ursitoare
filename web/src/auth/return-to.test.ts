/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  loginUrl,
  parseSignInSearch,
  redirectToSignIn,
  safeReturnTo,
  signInUrl,
} from "./return-to.ts";
import type { LocationLike } from "./return-to.ts";

assert.equal(typeof safeReturnTo, "function");
assert.equal(typeof loginUrl, "function");
assert.equal(typeof signInUrl, "function");
assert.equal(typeof parseSignInSearch, "function");
assert.equal(typeof redirectToSignIn, "function");

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

interface RecordingLocation {
  readonly location: LocationLike;
  readonly assigned: string[];
}

function recordingLocation(pathname: string, search: string): RecordingLocation {
  const assigned: string[] = [];
  const location: LocationLike = {
    pathname,
    search,
    assign(url: string): void {
      assigned.push(url);
    },
  };
  return { location, assigned };
}

test("C-cef4634b login and sign-in URLs", () => {
  const refused = "/auth/oidc/login?return_to=%2F";
  const cases: readonly { readonly input: unknown; readonly expected: string }[] = [
    { input: "/flows?x=1", expected: "/auth/oidc/login?return_to=%2Fflows%3Fx%3D1" },
    { input: "/runs/5#top", expected: "/auth/oidc/login?return_to=%2Fruns%2F5%23top" },
    { input: "//evil.invalid", expected: refused },
    { input: "https://evil.invalid/x", expected: refused },
    { input: "/\\evil.invalid", expected: refused },
    { input: "/a\r\nb", expected: refused },
    { input: "/sign-in", expected: refused },
    { input: "/sign-in/x", expected: refused },
    { input: "/auth/oidc/login", expected: refused },
    { input: "/" + "x".repeat(512), expected: refused },
    { input: undefined, expected: refused },
  ];

  for (const { input, expected } of cases) {
    assert.equal(
      call(() => loginUrl(input)),
      expected,
      `loginUrl(${JSON.stringify(input)}) refuses an unsafe destination`,
    );
  }

  assert.equal(call(() => signInUrl()), "/sign-in", "the bare sign-in URL has no query");
  assert.equal(
    call(() => signInUrl({ returnTo: "/" })),
    "/sign-in",
    "a root return path adds no query",
  );
  assert.equal(
    call(() => signInUrl({ error: "SESSION_ENDED", returnTo: "/flows?tab=2" })),
    "/sign-in?error=SESSION_ENDED&return_to=%2Fflows%3Ftab%3D2",
    "a known error and destination are carried",
  );
  assert.equal(
    call(() => signInUrl({ error: "bad code" })),
    "/sign-in",
    "an unknown code is not carried",
  );
});

test("C-23a4ce1e search parsing", () => {
  const cases: readonly {
    readonly search: string;
    readonly expected: { readonly error: string | null; readonly returnTo: string };
  }[] = [
    {
      search: "?error=OIDC_TOKEN_INVALID&return_to=%2Fruns%2F5",
      expected: { error: "OIDC_TOKEN_INVALID", returnTo: "/runs/5" },
    },
    {
      search: "?error=%3Cscript%3E",
      expected: { error: "UNKNOWN_ERROR", returnTo: "/" },
    },
    {
      search: "?error=__proto__",
      expected: { error: "UNKNOWN_ERROR", returnTo: "/" },
    },
    {
      search: "?error=",
      expected: { error: null, returnTo: "/" },
    },
    {
      search: "",
      expected: { error: null, returnTo: "/" },
    },
    {
      search: "?return_to=%2Fsign-in",
      expected: { error: null, returnTo: "/" },
    },
    {
      search: "?error=SESSION_ENDED&error=OIDC_INTERNAL",
      expected: { error: "SESSION_ENDED", returnTo: "/" },
    },
  ];

  for (const { search, expected } of cases) {
    assert.deepEqual(
      call(() => parseSignInSearch(search)),
      expected,
      `parseSignInSearch(${JSON.stringify(search)})`,
    );
  }
});

test("C-b4adf358 a dead session sends the user to sign in", () => {
  const flow = recordingLocation("/flows", "?tab=2");
  assert.equal(call(() => redirectToSignIn(flow.location)), true, "a normal path is redirected");
  assert.deepEqual(flow.assigned, ["/sign-in?error=SESSION_ENDED&return_to=%2Fflows%3Ftab%3D2"]);

  const root = recordingLocation("/", "");
  assert.equal(call(() => redirectToSignIn(root.location)), true, "the root is redirected");
  assert.deepEqual(root.assigned, ["/sign-in?error=SESSION_ENDED"]);

  const signIn = recordingLocation("/sign-in", "");
  assert.equal(call(() => redirectToSignIn(signIn.location)), false, "the sign-in page is left");
  assert.deepEqual(signIn.assigned, [], "the sign-in page is not redirected");

  const below = recordingLocation("/sign-in/x", "");
  assert.equal(call(() => redirectToSignIn(below.location)), false, "below sign-in is left");
  assert.deepEqual(below.assigned, [], "below sign-in is not redirected");
});
