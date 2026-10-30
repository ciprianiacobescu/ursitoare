import assert from "node:assert/strict";
import { test } from "node:test";

import type { AppConfig, Env } from "./config.ts";
import { loadConfig } from "./config.ts";
import type { OidcConfig } from "./oidc.ts";
import type { SecretReader } from "./secret.ts";

type OidcAppConfig = AppConfig & { readonly oidc?: OidcConfig };

const ISSUER_VARIABLE = "URSITOARE_OIDC_ISSUER";
const CLIENT_ID_VARIABLE = "URSITOARE_OIDC_CLIENT_ID";
const SECRET_FILE_VARIABLE = "URSITOARE_OIDC_CLIENT_SECRET_FILE";
const DIRECT_SECRET_VARIABLE = "URSITOARE_OIDC_CLIENT_SECRET";
const SECRET_FILE = "/run/secrets/oidc_client_secret";
const ENGINE_KEY_FILE = "/run/secrets/engine_key";
const DATABASE_URL = "postgres://ursitoare_app@db.internal:5432/ursitoare";
const ENGINE_KEY = "9f".repeat(32);
const CLIENT_SECRET = "test-oidc-client-secret";
const ISSUER_REASON =
  "must be an https URL, or an http URL for a private host, without credentials, query or fragment";
const SECRET_EMPTY_REASON = "file is missing, unreadable or empty";

function reader(files: ReadonlyMap<string, string>): SecretReader {
  return (path) => {
    const contents = files.get(path);
    if (contents === undefined) throw new Error(`missing ${path}`);
    return contents;
  };
}

function secrets(overrides: Readonly<Record<string, string>> = {}): Map<string, string> {
  const files = new Map<string, string>([
    [SECRET_FILE, `${CLIENT_SECRET}\n`],
    [ENGINE_KEY_FILE, `${ENGINE_KEY}\n`],
  ]);
  for (const [path, value] of Object.entries(overrides)) files.set(path, value);
  return files;
}

function completeEnv(overrides: Env = {}): Env {
  return {
    [ISSUER_VARIABLE]: "https://idp.example/realms/ursitoare",
    [SECRET_FILE_VARIABLE]: SECRET_FILE,
    URSITOARE_ENGINE_KEY_FILE: ENGINE_KEY_FILE,
    URSITOARE_DATABASE_URL: DATABASE_URL,
    ...overrides,
  };
}

function without(env: Env, ...names: string[]): Env {
  return Object.fromEntries(Object.entries(env).filter(([name]) => !names.includes(name)));
}

function load(env: Env, files: ReadonlyMap<string, string> = secrets()): OidcAppConfig {
  return loadConfig(env, reader(files)) as OidcAppConfig;
}

function assertRefused(
  code: "CONFIG_INVALID" | "CONFIG_SECRET_EMPTY",
  env: Env,
  files: ReadonlyMap<string, string>,
  variable: string,
  reason: string,
): void {
  assert.throws(() => load(env, files), {
    name: "ConfigError",
    code,
    variable,
    message: `${variable}: ${reason}`,
  });
}

test("C-449f1e02 loadConfig leaves oidc absent without OIDC variables and reads it when all three are set", () => {
  assert.doesNotThrow(() => {
    assert.equal(load({}).oidc, undefined);

    const config = load(completeEnv());
    const oidc = config.oidc;
    assert.ok(oidc !== undefined);
    assert.equal(oidc.issuer, "https://idp.example/realms/ursitoare");
  });
});

test("C-111fb00c loadConfig accepts an https issuer and every private http host", () => {
  assert.doesNotThrow(() => {
    const issuers = [
      "https://idp.example/realms/ursitoare",
      "http://127.0.0.1:8081/r",
      "http://10.1.2.3/r",
      "http://localhost:8080/r",
      "http://[::1]:8080/r",
      "http://keycloak:8080/realms/ursitoare",
    ];

    for (const issuer of issuers) {
      const config = load(completeEnv({ [ISSUER_VARIABLE]: issuer }));
      const oidc = config.oidc;
      assert.ok(oidc !== undefined);
      assert.equal(oidc.issuer, issuer);
      assert.equal(oidc.clientId, "ursitoare-engine");
      assert.equal(oidc.clientSecret.reveal(), CLIENT_SECRET);
    }
  });
});

test("C-111fb00c loadConfig reads a custom client id and strips only the secret file trailing newline", () => {
  assert.doesNotThrow(() => {
    const files = secrets();
    files.set(SECRET_FILE, `${CLIENT_SECRET}\r\n`);

    const config = load(completeEnv({ [CLIENT_ID_VARIABLE]: "my-client" }), files);
    const oidc = config.oidc;
    assert.ok(oidc !== undefined);
    assert.equal(oidc.clientId, "my-client");
    assert.equal(oidc.clientSecret.reveal(), CLIENT_SECRET);
  });
});

test("C-9c6f374f loadConfig refuses every public http credentialed or malformed issuer with its reason", () => {
  const badIssuers = [
    "http://idp.example/r",
    "http://172.32.0.1/r",
    "ftp://x/r",
    "https://u:p@idp.example/r",
    "https://idp.example/r?x=1",
    "https://idp.example/r#f",
    "nope",
  ];

  for (const issuer of badIssuers) {
    assertRefused(
      "CONFIG_INVALID",
      completeEnv({ [ISSUER_VARIABLE]: issuer }),
      secrets(),
      ISSUER_VARIABLE,
      ISSUER_REASON,
    );
  }
});

test("C-78a80972 loadConfig requires the OIDC secret file and refuses a missing or empty one", () => {
  assertRefused(
    "CONFIG_INVALID",
    without(completeEnv(), SECRET_FILE_VARIABLE),
    secrets(),
    SECRET_FILE_VARIABLE,
    "required when URSITOARE_OIDC_ISSUER is set",
  );

  const missingFile = new Map<string, string>([[ENGINE_KEY_FILE, `${ENGINE_KEY}\n`]]);
  assertRefused("CONFIG_SECRET_EMPTY", completeEnv(), missingFile, SECRET_FILE_VARIABLE, SECRET_EMPTY_REASON);

  assertRefused(
    "CONFIG_SECRET_EMPTY",
    completeEnv(),
    secrets({ [SECRET_FILE]: "" }),
    SECRET_FILE_VARIABLE,
    SECRET_EMPTY_REASON,
  );
});

test("C-78a80972 loadConfig refuses a bad client id and an issuer without the engine key or database URL", () => {
  assert.throws(() => load(completeEnv({ [CLIENT_ID_VARIABLE]: "bad id" })), {
    name: "ConfigError",
    code: "CONFIG_INVALID",
    variable: CLIENT_ID_VARIABLE,
  });

  assertRefused(
    "CONFIG_INVALID",
    without(completeEnv(), "URSITOARE_ENGINE_KEY_FILE"),
    secrets(),
    ISSUER_VARIABLE,
    "requires URSITOARE_ENGINE_KEY_FILE",
  );

  assertRefused(
    "CONFIG_INVALID",
    without(completeEnv(), "URSITOARE_DATABASE_URL"),
    secrets(),
    ISSUER_VARIABLE,
    "requires URSITOARE_DATABASE_URL",
  );
});

test("C-78a80972 loadConfig refuses stray OIDC variables and a direct client secret without an issuer", () => {
  assertRefused(
    "CONFIG_INVALID",
    { [CLIENT_ID_VARIABLE]: "my-client" },
    new Map(),
    CLIENT_ID_VARIABLE,
    "set only together with URSITOARE_OIDC_ISSUER",
  );

  assertRefused(
    "CONFIG_INVALID",
    { [SECRET_FILE_VARIABLE]: SECRET_FILE },
    secrets(),
    SECRET_FILE_VARIABLE,
    "set only together with URSITOARE_OIDC_ISSUER",
  );

  assert.throws(() => loadConfig({ [DIRECT_SECRET_VARIABLE]: CLIENT_SECRET }), {
    name: "ConfigError",
    code: "CONFIG_INVALID",
    variable: DIRECT_SECRET_VARIABLE,
  });
});
