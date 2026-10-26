import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env } from "./config.ts";
import { loadConfig } from "./config.ts";
import { ConfigError } from "./index.ts";

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
