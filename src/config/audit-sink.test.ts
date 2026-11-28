import assert from "node:assert/strict";
import { test } from "node:test";

import { loadConfig } from "./config.ts";
import type { AppConfig, Env } from "./config.ts";
import type { AuditSinkConfig } from "./audit-sink.ts";
import { loadAuditSinkConfig } from "./audit-sink.ts";
import type { SecretReader } from "./secret.ts";

const DATABASE_URL = "postgres://ursitoare_app@db.internal:5432/ursitoare";
const SINK_VARIABLE = "URSITOARE_AUDIT_SINK";
const SINK_MESSAGE = "URSITOARE_AUDIT_SINK: must be enabled or unset";
const DATABASE_MESSAGE = "URSITOARE_AUDIT_SINK: requires URSITOARE_DATABASE_URL";

const BASE_KEYS = [
  "database",
  "engineKey",
  "host",
  "internalPort",
  "logLevel",
  "port",
  "publicBaseUrl",
  "role",
  "shutdownDrainMs",
  "webDist",
];

type AuditSinkAppConfig = AppConfig & { readonly auditSink?: AuditSinkConfig };

function recordingReader(calls: string[]): SecretReader {
  return (path) => {
    calls.push(path);
    throw new Error(`unexpected read of ${path}`);
  };
}

function auditSinkOf(config: AppConfig): AuditSinkConfig | undefined {
  return (config as AuditSinkAppConfig)["auditSink"];
}

function sortedKeys(config: AppConfig): string[] {
  return [...Object.keys(config)].sort();
}

function assertRefused(env: Env, variable: string, message: string): void {
  assert.throws(
    () => loadConfig(env, recordingReader([])),
    (thrown: unknown): boolean => {
      const error = thrown as { name?: string; code?: string; variable?: string; message?: string };
      assert.equal(error.name, "ConfigError");
      assert.equal(error.code, "CONFIG_INVALID");
      assert.equal(error.variable, variable);
      assert.equal(error.message, message);
      return true;
    },
  );
}

test("C-f7e5a5bd loadAuditSinkConfig enabled unset and refused", () => {
  const readerCalls: string[] = [];
  const reader = recordingReader(readerCalls);

  const a1 = loadConfig({}, reader);
  assert.deepEqual(sortedKeys(a1), BASE_KEYS);
  assert.equal(auditSinkOf(a1), undefined);

  const a2 = loadConfig({ [SINK_VARIABLE]: "" }, reader);
  assert.deepEqual(sortedKeys(a2), BASE_KEYS);
  assert.equal(auditSinkOf(a2), undefined);

  const a3 = loadConfig({ [SINK_VARIABLE]: "enabled", URSITOARE_DATABASE_URL: DATABASE_URL }, reader);
  assert.deepEqual(sortedKeys(a3), [...BASE_KEYS, "auditSink"].sort());
  assert.deepEqual(auditSinkOf(a3), { enabled: true });

  for (const value of ["Enabled", "true", "1", "disabled", " enabled"]) {
    assertRefused(
      { [SINK_VARIABLE]: value, URSITOARE_DATABASE_URL: DATABASE_URL },
      SINK_VARIABLE,
      SINK_MESSAGE,
    );
  }
  assertRefused({ [SINK_VARIABLE]: "enabled" }, SINK_VARIABLE, DATABASE_MESSAGE);
  assertRefused({ [SINK_VARIABLE]: "yes" }, SINK_VARIABLE, SINK_MESSAGE);

  assert.deepEqual(
    loadAuditSinkConfig({ [SINK_VARIABLE]: "enabled" }, { database: { app: {} } }),
    { enabled: true },
  );
  assert.equal(loadAuditSinkConfig({}, { database: { app: null } }), undefined);
  assert.deepEqual(readerCalls, []);
});

test("C-dcbe2479 the engine reads no token file", () => {
  const readerCalls: string[] = [];
  const reader = recordingReader(readerCalls);

  const a6 = loadConfig(
    {
      [SINK_VARIABLE]: "enabled",
      URSITOARE_DATABASE_URL: DATABASE_URL,
      URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE: "/nonexistent/broker",
      URSITOARE_AUDIT_SINK_PROXY_TOKEN_FILE: "/nonexistent/proxy",
    },
    reader,
  );
  assert.deepEqual(auditSinkOf(a6), { enabled: true });
  assert.deepEqual(readerCalls, []);
  const serialized = JSON.stringify(a6);
  assert.ok(!serialized.includes("/nonexistent"));
  assert.ok(!serialized.includes("TOKEN"));

  assert.throws(
    () =>
      loadConfig(
        {
          [SINK_VARIABLE]: "enabled",
          URSITOARE_DATABASE_URL: DATABASE_URL,
          URSITOARE_AUDIT_SINK_BROKER_TOKEN: "abc123",
        },
        reader,
      ),
    (thrown: unknown): boolean => {
      const error = thrown as { name?: string; code?: string; variable?: string; message?: string };
      assert.equal(error.name, "ConfigError");
      assert.equal(error.code, "CONFIG_INVALID");
      assert.equal(error.variable, "URSITOARE_AUDIT_SINK_BROKER_TOKEN");
      assert.equal(
        error.message,
        "URSITOARE_AUDIT_SINK_BROKER_TOKEN: secrets are read only from files; set URSITOARE_AUDIT_SINK_BROKER_TOKEN_FILE",
      );
      assert.ok(!(error.message ?? "").includes("abc123"));
      return true;
    },
  );
  assert.deepEqual(readerCalls, []);
});
