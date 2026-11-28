import assert from "node:assert/strict";
import { test } from "node:test";

import type { AppConfig, Env } from "./config.ts";
import { loadConfig } from "./config.ts";
import type { SecretReader } from "./secret.ts";

interface BackchannelOidc {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: { reveal(): string };
  readonly backchannelUrl?: string;
}
type OidcAppConfig = AppConfig & { readonly oidc?: BackchannelOidc };

const ISSUER_VARIABLE = "URSITOARE_OIDC_ISSUER";
const CLIENT_ID_VARIABLE = "URSITOARE_OIDC_CLIENT_ID";
const SECRET_FILE_VARIABLE = "URSITOARE_OIDC_CLIENT_SECRET_FILE";
const BACKCHANNEL_VARIABLE = "URSITOARE_OIDC_BACKCHANNEL_URL";
const SECRET_FILE = "/run/secrets/oidc_client_secret";
const ENGINE_KEY_FILE = "/run/secrets/engine_key";
const DATABASE_URL = "postgres://ursitoare_app@db.internal:5432/ursitoare";
const ENGINE_KEY = "9f".repeat(32);
const CLIENT_SECRET = "test-oidc-client-secret";
const LOCAL_ISSUER = "http://localhost:8180/realms/ursitoare";
const BACKCHANNEL_REASON = "must be an https origin, or an http origin for a private host";
const ISSUER_REASON =
  "must be an https URL, or an http URL for a private host, without credentials, query or fragment";
const STRAY_REASON = "set only together with URSITOARE_OIDC_ISSUER";

function reader(): SecretReader {
  const files = new Map<string, string>([
    [SECRET_FILE, `${CLIENT_SECRET}\n`],
    [ENGINE_KEY_FILE, `${ENGINE_KEY}\n`],
  ]);
  return (path) => {
    const contents = files.get(path);
    if (contents === undefined) throw new Error(`missing ${path}`);
    return contents;
  };
}

function completeEnv(overrides: Env = {}): Env {
  return {
    [ISSUER_VARIABLE]: LOCAL_ISSUER,
    [SECRET_FILE_VARIABLE]: SECRET_FILE,
    URSITOARE_ENGINE_KEY_FILE: ENGINE_KEY_FILE,
    URSITOARE_DATABASE_URL: DATABASE_URL,
    ...overrides,
  };
}

function load(env: Env): OidcAppConfig {
  return loadConfig(env, reader()) as OidcAppConfig;
}

function assertRefused(env: Env, variable: string, reason: string): void {
  assert.throws(() => load(env), {
    name: "ConfigError",
    code: "CONFIG_INVALID",
    variable,
    message: `${variable}: ${reason}`,
  });
}

test("C-07ab704f an origin value is stored as its origin", () => {
  assert.doesNotThrow(() => {
    const rows: ReadonlyArray<readonly [string, string]> = [
      ["http://keycloak:8080", "http://keycloak:8080"],
      ["http://keycloak:8080/", "http://keycloak:8080"],
      ["https://idp-internal.example/", "https://idp-internal.example"],
      ["https://IDP-Internal.example:443", "https://idp-internal.example"],
      ["http://10.0.0.5:8080", "http://10.0.0.5:8080"],
      ["http://[::1]:8080", "http://[::1]:8080"],
      ["http://localhost:8180", "http://localhost:8180"],
    ];
    for (const [value, expected] of rows) {
      const oidc = load(completeEnv({ [BACKCHANNEL_VARIABLE]: value })).oidc;
      assert.ok(oidc !== undefined, value);
      assert.equal(oidc.backchannelUrl, expected, value);
      assert.equal(oidc.issuer, LOCAL_ISSUER);
      assert.equal(oidc.clientId, "ursitoare-engine");
      assert.equal(oidc.clientSecret.reveal(), CLIENT_SECRET);
    }
  });
});

test("C-07ab704f an absent or empty value leaves no member and an empty one alone leaves oidc absent", () => {
  assert.doesNotThrow(() => {
    const set = load(completeEnv({ [BACKCHANNEL_VARIABLE]: "http://keycloak:8080" })).oidc;
    assert.equal(set?.backchannelUrl, "http://keycloak:8080");

    for (const env of [completeEnv(), completeEnv({ [BACKCHANNEL_VARIABLE]: "" })]) {
      const oidc = load(env).oidc;
      assert.ok(oidc !== undefined);
      assert.deepEqual(Object.keys(oidc).sort(), ["clientId", "clientSecret", "issuer"]);
    }
    assert.equal(load({ [BACKCHANNEL_VARIABLE]: "" }).oidc, undefined);
  });
});

test("C-41a07522 a bad back-channel value beside a valid issuer is refused", () => {
  assert.doesNotThrow(() => {
    for (const value of [
      "http://idp.example",
      "http://172.32.0.1:8080",
      "ftp://keycloak",
      "http://u:p@keycloak:8080",
      "http://keycloak:8080/realms/ursitoare",
      "http://keycloak:8080/?x=1",
      "http://keycloak:8080/#f",
      "nope",
    ]) {
      assertRefused(completeEnv({ [BACKCHANNEL_VARIABLE]: value }), BACKCHANNEL_VARIABLE, BACKCHANNEL_REASON);
    }
  });
});

test("C-41a07522 a bad issuer is reported before a bad back-channel and the back-channel before the secret file", () => {
  assert.doesNotThrow(() => {
    assertRefused(
      completeEnv({ [ISSUER_VARIABLE]: "http://idp.example/r", [BACKCHANNEL_VARIABLE]: "nope" }),
      ISSUER_VARIABLE,
      ISSUER_REASON,
    );
    const noSecretFile = Object.fromEntries(
      Object.entries(completeEnv({ [BACKCHANNEL_VARIABLE]: "nope" })).filter(
        ([name]) => name !== SECRET_FILE_VARIABLE,
      ),
    );
    assertRefused(noSecretFile, BACKCHANNEL_VARIABLE, BACKCHANNEL_REASON);
  });
});

test("C-41a07522 without an issuer the back-channel is stray, after a stray client id and secret file", () => {
  assert.doesNotThrow(() => {
    assertRefused({ [BACKCHANNEL_VARIABLE]: "http://keycloak:8080" }, BACKCHANNEL_VARIABLE, STRAY_REASON);
    assertRefused({ [BACKCHANNEL_VARIABLE]: "nope" }, BACKCHANNEL_VARIABLE, STRAY_REASON);
    assertRefused(
      { [BACKCHANNEL_VARIABLE]: "http://keycloak:8080", [CLIENT_ID_VARIABLE]: "my-client" },
      CLIENT_ID_VARIABLE,
      STRAY_REASON,
    );
    assertRefused(
      { [BACKCHANNEL_VARIABLE]: "http://keycloak:8080", [SECRET_FILE_VARIABLE]: SECRET_FILE },
      SECRET_FILE_VARIABLE,
      STRAY_REASON,
    );
  });
});
