import assert from "node:assert/strict";
import { test } from "node:test";

import { renderLoginPage } from "./login-page.ts";

const ACTION = "/realms/ursitoare/protocol/openid-connect/auth?state=s1";

function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

test("C-7e2314fa login page has the Keycloak language title heading and exact controls", () => {
  assert.doesNotThrow(() => {
    const html = renderLoginPage({ action: ACTION });

    assert.equal(html.includes('<html lang="en">'), true);
    assert.match(html, /<title>[^<]+<\/title>/);
    assert.equal(count(html, "<h1"), 1);

    assert.equal(
      html.includes(`<form id="kc-form-login" method="post" action="${ACTION}"`),
      true,
    );
    assert.equal(
      html.includes('<label for="username">Username or email</label>'),
      true,
    );
    assert.equal(
      html.includes(
        '<input id="username" name="username" type="text" autocomplete="username">',
      ),
      true,
    );
    assert.equal(html.includes('<label for="password">Password</label>'), true);
    assert.equal(
      html.includes(
        '<input id="password" name="password" type="password" autocomplete="current-password">',
      ),
      true,
    );
    assert.equal(
      html.includes('<button id="kc-login" type="submit">Sign In</button>'),
      true,
    );

    assert.equal(count(html, "Username or email"), 1);
    assert.equal(count(html, "Password"), 1);
    assert.equal(count(html, "Sign In"), 1);
    assert.equal(html.includes('id="input-error"'), false);
    assert.equal(html.includes("value="), false);
  });
});

test("C-7e2314fa login page reflects a username and an error only when they are given", () => {
  assert.doesNotThrow(() => {
    const plain = renderLoginPage({ action: ACTION });
    assert.equal(plain.includes("value="), false);
    assert.equal(plain.includes('id="input-error"'), false);

    const withUsername = renderLoginPage({ action: ACTION, username: "alice" });
    assert.equal(
      withUsername.includes(
        '<input id="username" name="username" type="text" autocomplete="username" value="alice">',
      ),
      true,
    );
    assert.equal(withUsername.includes('id="input-error"'), false);

    const withError = renderLoginPage({
      action: ACTION,
      error: "Invalid username or password.",
    });
    assert.equal(withError.includes('<p id="input-error" role="alert">'), true);
  });
});

test("C-8905a65e login page escapes the reflected action username and error", () => {
  assert.doesNotThrow(() => {
    const html = renderLoginPage({
      action: "/a?x=1&y=2",
      username: '"><script>1</script>',
      error: "<b>",
    });

    assert.equal(html.includes("<script>"), false);
    assert.equal(html.includes("<b>"), false);
    assert.equal(html.includes("/a?x=1&amp;y=2"), true);
  });
});
