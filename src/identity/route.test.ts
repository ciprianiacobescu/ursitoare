import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { IDP_ROUTE_KIND, IdentityError, idpRouteKey, organizationFromClaim } from "./index.ts";

const ISS = "https://idp.example/realms/ursitoare";

function caught(fn: () => unknown): { code?: unknown; message?: unknown; name?: unknown } | null {
  try {
    fn();
  } catch (e) {
    const err = e as Error & { code?: unknown };
    return { code: err.code, message: err.message, name: err.name };
  }
  return null;
}

function value<T>(fn: () => T): T | undefined {
  let out: T | undefined;
  try {
    out = fn();
  } catch {
    out = undefined;
  }
  return out;
}

function expectIdentity(fn: () => unknown, code: string, message: string): void {
  assert.deepEqual(caught(fn), { code, message, name: "IdentityError" });
}

describe("IdentityError", () => {
  it("is an Error with name code and message", () => {
    const e = value(() => new IdentityError("IDENTITY_INVALID", "m"));
    assert.ok(e instanceof Error);
    assert.equal(e?.name, "IdentityError");
    assert.equal(e?.code, "IDENTITY_INVALID");
    assert.equal(e?.message, "m");
  });
});

describe("idpRouteKey", () => {
  it("C-ca21e129: known value and refused halves", () => {
    assert.equal(value(() => idpRouteKey(ISS, "org-a")), `${ISS}\norg-a`);
    assert.equal(IDP_ROUTE_KIND, "idp");
    assert.equal(value(() => idpRouteKey("x".repeat(2048), "o")), `${"x".repeat(2048)}\no`);
    assert.equal(value(() => idpRouteKey("https://x", "x".repeat(255))), `https://x\n${"x".repeat(255)}`);
    const badIssuers: unknown[] = ["", " https://x", "a\nb", "a\u0000b", "\ud800", 5, "x".repeat(2049)];
    for (const i of badIssuers) {
      expectIdentity(() => idpRouteKey(i as string, "org-a"), "IDENTITY_INVALID", "invalid identity input");
    }
    const badOrgs = ["", "o\nrg", "org ", "\ud800", "x".repeat(256), "b\nc"];
    for (const o of badOrgs) {
      expectIdentity(() => idpRouteKey("a", o), "IDENTITY_INVALID", "invalid identity input");
    }
  });
});

describe("organizationFromClaim", () => {
  it("C-1762da65: one organization", () => {
    assert.equal(value(() => organizationFromClaim(["org-a"])), "org-a");
    assert.equal(value(() => organizationFromClaim("org-a")), "org-a");
  });

  it("C-f3a5ccfc: none", () => {
    assert.equal(value(() => organizationFromClaim(["org-a"])), "org-a");
    const claims: unknown[] = [undefined, null, [], [""], [5], ["a\nb"], { "org-a": { id: "1" } }, 7, true];
    for (const c of claims) {
      expectIdentity(
        () => organizationFromClaim(c),
        "IDENTITY_NO_ORGANIZATION",
        "token has no usable organization",
      );
    }
  });

  it("C-04803d57: ambiguous", () => {
    assert.equal(value(() => organizationFromClaim(["org-a"])), "org-a");
    for (const c of [["x-secret-one", "y-secret-two"], ["org-a", "org-a"]]) {
      expectIdentity(
        () => organizationFromClaim(c),
        "IDENTITY_AMBIGUOUS_ORGANIZATION",
        "token names more than one organization",
      );
    }
  });
});
