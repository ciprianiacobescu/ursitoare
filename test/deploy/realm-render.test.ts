import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  KC_REALM_ENV,
  REALM_BROWSER_FLOW,
  REALM_CLIENTS,
  REALM_GROUPS,
  REALM_TEMPLATE_PATH,
  readRealmTemplate,
  realmPlaceholders,
  renderRealm,
} from "./realm.ts";

test("C-32ad3ca4 the constants, the reader and the substitution", async () => {
  assert.equal(typeof realmPlaceholders, "function");

  assert.equal(REALM_TEMPLATE_PATH, "deploy/keycloak/import/ursitoare-realm.json");
  assert.deepEqual([...KC_REALM_ENV], [
    "KC_URSITOARE_CLIENT_SECRET",
    "KC_URSITOARE_REDIRECT_URI",
    "KC_URSITOARE_POST_LOGOUT_URI",
    "KC_URSITOARE_FIRST_USER",
    "KC_URSITOARE_FIRST_PASSWORD",
    "KC_URSITOARE_ORGANIZATION",
  ]);
  assert.deepEqual([...REALM_GROUPS], ["ursitoare-admins", "ursitoare-authors", "team-default"]);
  assert.deepEqual([...REALM_CLIENTS], ["ursitoare-engine", "ursitoare-mcp"]);
  assert.equal(REALM_BROWSER_FLOW, "browser-single-page");

  const dir = await mkdtemp(join(tmpdir(), "keycloak-realm-"));
  try {
    const p = join(dir, "realm.json");
    await writeFile(p, '{"a":1}', "utf8");

    assert.equal(readRealmTemplate(p), '{"a":1}');

    let missingErr: unknown;
    try {
      readRealmTemplate(join(dir, "missing.json"));
    } catch (e) {
      missingErr = e;
    }
    assert.equal((missingErr as { code?: string })?.code, "ENOENT");

    assert.deepEqual(
      realmPlaceholders("${A} ${A:x} ${B:} $C ${env.D} ${E:a:b} ${}"),
      ["A", "B", "E"],
    );

    assert.deepEqual(
      renderRealm('{"a":"${A:x}","b":"${B}","c":"${C:}","d":"${D:}"}', {
        A: "1",
        B: "",
        D: "",
      }),
      { a: "1", b: "", c: "", d: "" },
    );

    assert.deepEqual(renderRealm('{"a":"${A:x}","b":"${B}"}', {}), { a: "x", b: "${B}" });

    assert.deepEqual(renderRealm('{"a":"${toString:x}"}', {}), { a: "x" });

    let badErr: unknown;
    try {
      renderRealm('{"a":"${A}"}', { A: 'x"y' });
    } catch (e) {
      badErr = e;
    }
    assert.equal((badErr as { name?: string })?.name, "SyntaxError");

    let badErr2: unknown;
    try {
      renderRealm("{", {});
    } catch (e) {
      badErr2 = e;
    }
    assert.equal((badErr2 as { name?: string })?.name, "SyntaxError");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
