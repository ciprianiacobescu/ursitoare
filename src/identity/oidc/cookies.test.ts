import assert from "node:assert/strict";
import { test } from "node:test";

import { OidcError, SESSION_COOKIE, parseCookies, serializeCookie } from "../index.ts";

test("OidcError carries a stable name code and details", () => {
  assert.doesNotThrow(() => {
    const error = new OidcError("SESSION_INVALID", "invalid cookie");
    assert.ok(error instanceof Error);
    assert.equal(error.name, "OidcError");
    assert.equal(error.code, "SESSION_INVALID");
    assert.deepEqual(error.details, {});

    const detailed = new OidcError("SESSION_INVALID", "invalid cookie", { reason: "name" });
    assert.deepEqual(detailed.details, { reason: "name" });
  });
});

test("parseCookies keeps the first value and does not decode", () => {
  assert.doesNotThrow(() => {
    const first = parseCookies("a=1; a=2");
    assert.equal(first["a"], "1");
    assert.equal(Object.keys(first).length, 1);

    assert.equal(parseCookies("a=%41%20")["a"], "%41%20");
  });
});

test("parseCookies leaves Object.prototype untouched", () => {
  assert.doesNotThrow(() => {
    const parsed = parseCookies("__proto__=1");
    assert.equal(Object.getPrototypeOf(parsed), null);
    assert.equal(parsed["__proto__"], "1");
    assert.equal(Object.getPrototypeOf({}), Object.prototype);
  });
});

test("parseCookies skips a pair without an equals sign", () => {
  assert.doesNotThrow(() => {
    const parsed = parseCookies("a=1; broken; b=2");
    assert.equal(parsed["a"], "1");
    assert.equal(parsed["b"], "2");
    assert.equal(parsed["broken"], undefined);
  });
});

test("parseCookies rejects a header over 8192 characters", () => {
  assert.doesNotThrow(() => {
    const parsed = parseCookies("a=" + "x".repeat(8192));
    assert.equal(Object.keys(parsed).length, 0);
  });
});

test("serializeCookie writes the session cookie exactly", () => {
  assert.doesNotThrow(() => {
    assert.equal(SESSION_COOKIE, "ursitoare_session");
    assert.equal(
      serializeCookie(SESSION_COOKIE, "abc", { path: "/", secure: false }),
      "ursitoare_session=abc; Path=/; HttpOnly; SameSite=Lax",
    );
    assert.equal(
      serializeCookie(SESSION_COOKIE, "abc", { path: "/", secure: true }),
      "ursitoare_session=abc; Path=/; HttpOnly; SameSite=Lax; Secure",
    );
  });
});

test("serializeCookie writes the login cookie exactly", () => {
  assert.doesNotThrow(() => {
    assert.equal(
      serializeCookie("ursitoare_login", "payload", {
        path: "/auth/oidc",
        secure: false,
        maxAgeS: 600,
      }),
      "ursitoare_login=payload; Path=/auth/oidc; Max-Age=600; HttpOnly; SameSite=Lax",
    );
    assert.equal(
      serializeCookie("ursitoare_login", "payload", {
        path: "/auth/oidc",
        secure: true,
        maxAgeS: 600,
      }),
      "ursitoare_login=payload; Path=/auth/oidc; Max-Age=600; HttpOnly; SameSite=Lax; Secure",
    );
  });
});

test("serializeCookie writes a clearing cookie exactly", () => {
  assert.doesNotThrow(() => {
    assert.equal(
      serializeCookie("ursitoare_login", "", {
        path: "/auth/oidc",
        secure: false,
        maxAgeS: 0,
      }),
      "ursitoare_login=; Path=/auth/oidc; Max-Age=0; HttpOnly; SameSite=Lax",
    );
    assert.equal(
      serializeCookie("ursitoare_login", "", {
        path: "/auth/oidc",
        secure: true,
        maxAgeS: 0,
      }),
      "ursitoare_login=; Path=/auth/oidc; Max-Age=0; HttpOnly; SameSite=Lax; Secure",
    );
  });
});

test("serializeCookie refuses an invalid name value or path", () => {
  const invalid = [
    () => serializeCookie("a b", "value", { path: "/", secure: false }),
    () => serializeCookie("name", "a;b", { path: "/", secure: false }),
    () => serializeCookie("name", "value", { path: "x", secure: false }),
  ];

  for (const call of invalid) {
    assert.throws(call, { name: "OidcError", code: "SESSION_INVALID" });
  }
});
