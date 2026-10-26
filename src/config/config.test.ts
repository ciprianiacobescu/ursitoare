import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";

import type { Env } from "./config.ts";
import { loadConfig } from "./config.ts";
import { ConfigError, Secret } from "./index.ts";

const PORT_MESSAGE = "URSITOARE_PORT: must be an integer from 1 to 65535";
const LOG_LEVEL_MESSAGE = "URSITOARE_LOG_LEVEL: must be one of fatal, error, warn, info, debug, trace, silent";
const ROLE_MESSAGE = "URSITOARE_ROLE: must be one of all, api, worker, sandbox";
const HOST_MESSAGE = "URSITOARE_HOST: must be a host name or address";
const DRAIN_MESSAGE = "URSITOARE_SHUTDOWN_DRAIN_MS: must be an integer from 1 to 300000";
const BASE_URL_MESSAGE =
  "URSITOARE_PUBLIC_BASE_URL: must be an http or https URL without credentials, query or fragment";

interface RefusalCase {
  env: Env;
  variable: string;
  message?: string;
  forbidden?: string;
}

function assertConfigRefused(bad: RefusalCase): void {
  assert.throws(
    () => loadConfig(bad.env),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.code, "CONFIG_INVALID");
      assert.equal(error.variable, bad.variable);
      if (bad.message !== undefined) {
        assert.equal(error.message, bad.message);
      }
      if (bad.forbidden !== undefined) {
        assert.ok(!error.message.includes(bad.forbidden), `the message of ${bad.variable} must not echo the value`);
      }
      return true;
    },
  );
}

function assertRefusals(cases: RefusalCase[]): void {
  for (const bad of cases) {
    assertConfigRefused(bad);
  }
}

test("C-7b6bccec loadConfig returns every documented default for an empty environment", () => {
  assert.doesNotThrow(() => {
    const config = loadConfig({});
    assert.equal(config.role, "all");
    assert.equal(config.host, "127.0.0.1");
    assert.equal(config.port, 8080);
    assert.equal(config.logLevel, "info");
    assert.equal(config.publicBaseUrl, "http://127.0.0.1:8080");
    assert.equal(config.webDist, null);
    assert.equal(config.shutdownDrainMs, 10000);
    assert.equal(config.engineKey, null);
    assert.deepEqual(config.database, { app: null, owner: null });
  });
});

test("C-95e9881e loadConfig reads every non-secret setting from the environment and drops a trailing slash", () => {
  assert.doesNotThrow(() => {
    const config = loadConfig({
      URSITOARE_PORT: "9090",
      URSITOARE_HOST: "0.0.0.0",
      URSITOARE_LOG_LEVEL: "debug",
      URSITOARE_ROLE: "api",
      URSITOARE_WEB_DIST: "/srv/web",
      URSITOARE_SHUTDOWN_DRAIN_MS: "2500",
      URSITOARE_PUBLIC_BASE_URL: "https://ursitoare.example.com/",
    });
    assert.equal(config.role, "api");
    assert.equal(config.host, "0.0.0.0");
    assert.equal(config.port, 9090);
    assert.equal(config.logLevel, "debug");
    assert.equal(config.publicBaseUrl, "https://ursitoare.example.com");
    assert.equal(config.webDist, "/srv/web");
    assert.equal(config.shutdownDrainMs, 2500);
  });
});

test("C-95e9881e loadConfig derives publicBaseUrl from the port and ignores empty or unknown variables", () => {
  assert.doesNotThrow(() => {
    const portOnly = loadConfig({ URSITOARE_PORT: "9090" });
    assert.equal(portOnly.port, 9090);
    assert.equal(portOnly.publicBaseUrl, "http://127.0.0.1:9090");
    assert.equal(portOnly.role, "all");

    const ignored = loadConfig({ URSITOARE_PORT: "", URSITOARE_NO_SUCH_SETTING: "yes" });
    assert.equal(ignored.port, 8080);
    assert.equal(ignored.publicBaseUrl, "http://127.0.0.1:8080");
    assert.equal(ignored.logLevel, "info");
  });
});

test("C-c0bf38f0 loadConfig refuses a bad port host log level or role", () => {
  assertRefusals([
    { env: { URSITOARE_PORT: "0" }, variable: "URSITOARE_PORT", message: PORT_MESSAGE, forbidden: "0" },
    { env: { URSITOARE_PORT: "70000" }, variable: "URSITOARE_PORT", forbidden: "70000" },
    { env: { URSITOARE_PORT: "abc" }, variable: "URSITOARE_PORT", forbidden: "abc" },
    { env: { URSITOARE_PORT: "80.5" }, variable: "URSITOARE_PORT", forbidden: "80.5" },
    { env: { URSITOARE_LOG_LEVEL: "verbose" }, variable: "URSITOARE_LOG_LEVEL", message: LOG_LEVEL_MESSAGE },
    { env: { URSITOARE_ROLE: "boss" }, variable: "URSITOARE_ROLE", message: ROLE_MESSAGE },
    { env: { URSITOARE_HOST: "bad host" }, variable: "URSITOARE_HOST", message: HOST_MESSAGE },
    { env: { URSITOARE_HOST: "http://h" }, variable: "URSITOARE_HOST", forbidden: "http://h" },
  ]);
});

test("C-c0bf38f0 loadConfig refuses a bad drain deadline or public base URL without echoing the value", () => {
  assertRefusals([
    { env: { URSITOARE_SHUTDOWN_DRAIN_MS: "0" }, variable: "URSITOARE_SHUTDOWN_DRAIN_MS", message: DRAIN_MESSAGE },
    { env: { URSITOARE_SHUTDOWN_DRAIN_MS: "300001" }, variable: "URSITOARE_SHUTDOWN_DRAIN_MS", forbidden: "300001" },
    { env: { URSITOARE_SHUTDOWN_DRAIN_MS: "1e3" }, variable: "URSITOARE_SHUTDOWN_DRAIN_MS", forbidden: "1e3" },
    { env: { URSITOARE_SHUTDOWN_DRAIN_MS: " 5" }, variable: "URSITOARE_SHUTDOWN_DRAIN_MS", forbidden: " 5" },
    { env: { URSITOARE_SHUTDOWN_DRAIN_MS: "+5" }, variable: "URSITOARE_SHUTDOWN_DRAIN_MS", forbidden: "+5" },
    {
      env: { URSITOARE_PUBLIC_BASE_URL: "ftp://x" },
      variable: "URSITOARE_PUBLIC_BASE_URL",
      message: BASE_URL_MESSAGE,
    },
    {
      env: { URSITOARE_PUBLIC_BASE_URL: "https://u:pw@x.example/" },
      variable: "URSITOARE_PUBLIC_BASE_URL",
      forbidden: "u:pw@x.example",
    },
  ]);
});

test("C-f3f5587d loadConfig refuses a non-empty secret-shaped variable without echoing its value", () => {
  assertRefusals([
    {
      env: { URSITOARE_ENGINE_KEY: "abc123" },
      variable: "URSITOARE_ENGINE_KEY",
      message: "URSITOARE_ENGINE_KEY: secrets are read only from files; set URSITOARE_ENGINE_KEY_FILE",
      forbidden: "abc123",
    },
    {
      env: { URSITOARE_DATABASE_PASSWORD: "pw-y" },
      variable: "URSITOARE_DATABASE_PASSWORD",
      forbidden: "pw-y",
    },
    { env: { URSITOARE_FOO_TOKEN: "x" }, variable: "URSITOARE_FOO_TOKEN" },
    {
      env: { PGPASSWORD: "pw-x" },
      variable: "PGPASSWORD",
      message: "PGPASSWORD: not allowed; use the URSITOARE_DATABASE_*PASSWORD_FILE variables",
      forbidden: "pw-x",
    },
    {
      env: { PGPASSFILE: "/home/u/.pgpass" },
      variable: "PGPASSFILE",
      forbidden: "/home/u/.pgpass",
    },
  ]);
});

test("C-f3f5587d loadConfig ignores an empty secret-shaped variable", () => {
  assert.doesNotThrow(() => {
    for (const name of [
      "URSITOARE_ENGINE_KEY",
      "URSITOARE_DATABASE_PASSWORD",
      "URSITOARE_FOO_TOKEN",
      "PGPASSWORD",
      "PGPASSFILE",
    ]) {
      const config = loadConfig({ [name]: "" });
      assert.equal(config.role, "all");
      assert.equal(config.port, 8080);
      assert.equal(config.publicBaseUrl, "http://127.0.0.1:8080");
    }
  });
});

test("C-7a4aa4d4 loadConfig reads the engine key from its file and strips the trailing newline", () => {
  const engineKeyPath = "/run/secrets/engine_key";
  const hexKey = "9f".repeat(32);
  const hexCalls: string[] = [];
  const hexConfig = loadConfig({ URSITOARE_ENGINE_KEY_FILE: engineKeyPath }, (path) => {
    hexCalls.push(path);
    return `${hexKey}\n`;
  });

  assert.ok(hexConfig.engineKey instanceof Secret);
  assert.equal(hexConfig.engineKey.reveal(), hexKey);
  assert.deepEqual(hexCalls, [engineKeyPath]);

  const base64Key = Buffer.alloc(32, 7).toString("base64");
  const base64Calls: string[] = [];
  const base64Config = loadConfig({ URSITOARE_ENGINE_KEY_FILE: engineKeyPath }, (path) => {
    base64Calls.push(path);
    return base64Key;
  });

  assert.ok(base64Config.engineKey instanceof Secret);
  assert.equal(base64Config.engineKey.reveal(), base64Key);
  assert.deepEqual(base64Calls, [engineKeyPath]);
});

test("C-ca797e1f loadConfig refuses an empty or unreadable engine key file with CONFIG_SECRET_EMPTY", () => {
  const engineKeyPath = "/run/secrets/engine_key";
  const readers: (() => string)[] = [
    () => "",
    () => "\n",
    () => "  \n",
    () => {
      throw new Error(`cannot read ${engineKeyPath}`);
    },
  ];

  for (const readSecret of readers) {
    assert.throws(
      () => loadConfig({ URSITOARE_ENGINE_KEY_FILE: engineKeyPath }, readSecret),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_SECRET_EMPTY");
        assert.equal(error.variable, "URSITOARE_ENGINE_KEY_FILE");
        assert.equal(error.message, "URSITOARE_ENGINE_KEY_FILE: file is missing, unreadable or empty");
        assert.ok(!error.message.includes("cannot read"));
        assert.ok(!error.message.includes(engineKeyPath));
        return true;
      },
    );
  }
});

test("C-ca797e1f loadConfig refuses a weak engine key with CONFIG_INVALID naming its file variable", () => {
  const engineKeyPath = "/run/secrets/engine_key";

  for (const weak of ["k".repeat(32), "a".repeat(63)]) {
    assert.throws(
      () => loadConfig({ URSITOARE_ENGINE_KEY_FILE: engineKeyPath }, () => weak),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_INVALID");
        assert.equal(error.variable, "URSITOARE_ENGINE_KEY_FILE");
        assert.equal(
          error.message,
          "URSITOARE_ENGINE_KEY_FILE: key must be at least 64 hex characters or base64 of at least 32 bytes",
        );
        assert.ok(!error.message.includes(weak));
        return true;
      },
    );
  }
});

test("C-16430cae a loaded config hides the engine key and database password from JSON String and inspect", () => {
  const engineKey = "ab12".repeat(16);
  const password = "pw-Zq7";
  const config = loadConfig(
    {
      URSITOARE_ENGINE_KEY_FILE: "/run/secrets/engine_key",
      URSITOARE_DATABASE_URL: "postgres://ursitoare_app@db.internal:5432/ursitoare",
      URSITOARE_DATABASE_PASSWORD_FILE: "/run/secrets/db_password",
    },
    (path) => (path === "/run/secrets/engine_key" ? engineKey : `${password}\n`),
  );

  assert.ok(config.engineKey instanceof Secret);
  assert.equal(config.engineKey.reveal(), engineKey);

  const app = config.database.app;
  assert.ok(app !== null);
  const secret = app.password;
  assert.ok(secret instanceof Secret);
  assert.equal(secret.reveal(), password);

  const representations = [
    JSON.stringify(config),
    inspect(config, { depth: null }),
    String(config.engineKey),
  ];
  for (const representation of representations) {
    assert.ok(!representation.includes(engineKey));
    assert.ok(!representation.includes(password));
  }
});

test("C-406ddaa1 loadConfig parses app and owner database endpoints with secret passwords", () => {
  const appUrl = "postgres://ursitoare_app@db.internal:5432/ursitoare";
  const ownerUrl = "postgres://ursitoare_owner@db.internal:5432/ursitoare";
  const calls: string[] = [];
  const config = loadConfig(
    {
      URSITOARE_DATABASE_URL: appUrl,
      URSITOARE_DATABASE_PASSWORD_FILE: "/run/secrets/db_password",
      URSITOARE_DATABASE_OWNER_URL: ownerUrl,
      URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/secrets/db_owner_password",
    },
    (path) => {
      calls.push(path);
      return path.endsWith("owner_password") ? "pw-owner\n" : "pw-app\n";
    },
  );

  const app = config.database.app;
  assert.ok(app !== null);
  assert.equal(app.url, appUrl);
  assert.ok(app.password instanceof Secret);
  assert.equal(app.password.reveal(), "pw-app");

  const owner = config.database.owner;
  assert.ok(owner !== null);
  assert.equal(owner.url, ownerUrl);
  assert.ok(owner.password instanceof Secret);
  assert.equal(owner.password.reveal(), "pw-owner");
  assert.deepEqual([...calls].sort(), ["/run/secrets/db_owner_password", "/run/secrets/db_password"]);
});

test("C-406ddaa1 loadConfig keeps a postgresql sslmode URL unchanged and leaves a missing password null", () => {
  const appUrl = "postgresql://ursitoare_app@db.internal:5432/ursitoare?sslmode=verify-full";

  const withoutPassword = loadConfig({ URSITOARE_DATABASE_URL: appUrl });
  const appWithoutPassword = withoutPassword.database.app;
  assert.ok(appWithoutPassword !== null);
  assert.equal(appWithoutPassword.url, appUrl);
  assert.equal(appWithoutPassword.password, null);
  assert.equal(withoutPassword.database.owner, null);

  const withPassword = loadConfig(
    {
      URSITOARE_DATABASE_URL: appUrl,
      URSITOARE_DATABASE_PASSWORD_FILE: "/run/secrets/db_password",
    },
    () => "pw-app\n",
  );
  const appWithPassword = withPassword.database.app;
  assert.ok(appWithPassword !== null);
  assert.equal(appWithPassword.url, appUrl);
  assert.ok(appWithPassword.password instanceof Secret);
  assert.equal(appWithPassword.password.reveal(), "pw-app");
});

test("C-3d74e0ae a bad database URL is CONFIG_INVALID naming the URL variable without the password", () => {
  const badUrls = [
    "postgres://u:pw@h/db",
    "postgres://u@h/db?password=x",
    "postgres://u@h/db?sslmode=require",
    "postgres://u@h/db?application_name=x",
    "mysql://u@h/db",
  ];

  for (const url of badUrls) {
    assert.throws(
      () => loadConfig({ URSITOARE_DATABASE_URL: url }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_INVALID");
        assert.equal(error.variable, "URSITOARE_DATABASE_URL");
        assert.ok(!error.message.includes("pw"));
        assert.ok(!error.message.includes(url));
        return true;
      },
    );
  }
});

test("C-3d74e0ae a bad owner database URL names the owner URL variable", () => {
  assert.throws(
    () => loadConfig({ URSITOARE_DATABASE_OWNER_URL: "mysql://u@h/db" }),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError);
      assert.equal(error.code, "CONFIG_INVALID");
      assert.equal(error.variable, "URSITOARE_DATABASE_OWNER_URL");
      return true;
    },
  );
});

test("C-3d74e0ae a database password file without its URL names the password-file variable", () => {
  const cases = [
    {
      env: { URSITOARE_DATABASE_PASSWORD_FILE: "/run/secrets/db_password" },
      variable: "URSITOARE_DATABASE_PASSWORD_FILE",
      message: "URSITOARE_DATABASE_PASSWORD_FILE: set only together with URSITOARE_DATABASE_URL",
    },
    {
      env: { URSITOARE_DATABASE_OWNER_PASSWORD_FILE: "/run/secrets/db_owner_password" },
      variable: "URSITOARE_DATABASE_OWNER_PASSWORD_FILE",
      message:
        "URSITOARE_DATABASE_OWNER_PASSWORD_FILE: set only together with URSITOARE_DATABASE_OWNER_URL",
    },
  ];

  for (const bad of cases) {
    assert.throws(
      () => loadConfig(bad.env, () => "pw-x"),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_INVALID");
        assert.equal(error.variable, bad.variable);
        assert.equal(error.message, bad.message);
        assert.ok(!error.message.includes("pw-x"));
        return true;
      },
    );
  }
});

test("C-3d74e0ae an empty database password file with a valid URL gives CONFIG_SECRET_EMPTY", () => {
  const env = {
    URSITOARE_DATABASE_URL: "postgres://ursitoare_app@db.internal:5432/ursitoare",
    URSITOARE_DATABASE_PASSWORD_FILE: "/run/secrets/db_password",
  };

  for (const empty of ["", "\n", "  \n"]) {
    assert.throws(
      () => loadConfig(env, () => empty),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_SECRET_EMPTY");
        assert.equal(error.variable, "URSITOARE_DATABASE_PASSWORD_FILE");
        return true;
      },
    );
  }
});
