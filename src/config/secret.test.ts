import assert from "node:assert/strict";
import { test } from "node:test";
import { inspect } from "node:util";

import { ConfigError, Secret } from "./index.ts";
import { readSecretValue } from "./secret.ts";

const ENGINE_KEY_VARIABLE = "URSITOARE_ENGINE_KEY_FILE";
const ENGINE_KEY_PATH = "/run/secrets/engine_key";
const SECRET_EMPTY_MESSAGE = `${ENGINE_KEY_VARIABLE}: file is missing, unreadable or empty`;

test("C-16430cae a Secret hides its value from JSON String and inspect", () => {
  assert.doesNotThrow(() => {
    const engineKey = "ab12".repeat(16);
    const password = "pw-Zq7";
    const engine = new Secret(engineKey);
    const dbPassword = new Secret(password);
    const config = {
      engineKey: engine,
      database: { app: { url: "postgres://u@h/db", password: dbPassword }, owner: null },
    };

    assert.equal(engine.reveal(), engineKey);
    assert.equal(dbPassword.reveal(), password);
    assert.equal(engine.toJSON(), "[REDACTED]");
    assert.equal(engine.toString(), "[REDACTED]");
    assert.equal(String(engine), "[REDACTED]");
    assert.equal(inspect(engine, { depth: null }), "[REDACTED]");
    assert.equal(JSON.stringify(engine), '"[REDACTED]"');

    const serialized = JSON.stringify(config);
    const inspected = inspect(config, { depth: null });
    assert.ok(!serialized.includes(engineKey));
    assert.ok(!serialized.includes(password));
    assert.ok(!inspected.includes(engineKey));
    assert.ok(!inspected.includes(password));
    assert.ok(serialized.includes("[REDACTED]"));
    assert.ok(inspected.includes("[REDACTED]"));
  });
});

test("C-7a4aa4d4 readSecretValue strips one trailing newline and reads the named file once", () => {
  assert.doesNotThrow(() => {
    const calls: string[] = [];
    const hexKey = "9f".repeat(32);
    const secret = readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, (path) => {
      calls.push(path);
      return `${hexKey}\n`;
    });

    assert.ok(secret instanceof Secret);
    assert.equal(secret.reveal(), hexKey);
    assert.deepEqual(calls, [ENGINE_KEY_PATH]);

    const base64Key = Buffer.alloc(32, 7).toString("base64");
    assert.equal(
      readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, () => base64Key).reveal(),
      base64Key,
    );
    assert.equal(
      readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, () => "key-value\r\n").reveal(),
      "key-value",
    );
    assert.equal(
      readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, () => "key-value\n\n").reveal(),
      "key-value\n",
    );
  });
});

test("C-ca797e1f readSecretValue refuses empty whitespace-only and unreadable secrets without their text", () => {
  assert.doesNotThrow(() => {
    for (const contents of ["", "\n", "  \n", "   "]) {
      assert.throws(
        () => readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, () => contents),
        (error: unknown) => {
          assert.ok(error instanceof ConfigError);
          assert.equal(error.code, "CONFIG_SECRET_EMPTY");
          assert.equal(error.variable, ENGINE_KEY_VARIABLE);
          assert.equal(error.message, SECRET_EMPTY_MESSAGE);
          return true;
        },
      );
    }

    assert.throws(
      () =>
        readSecretValue(ENGINE_KEY_VARIABLE, ENGINE_KEY_PATH, () => {
          throw new Error("pw=hunter2");
        }),
      (error: unknown) => {
        assert.ok(error instanceof ConfigError);
        assert.equal(error.code, "CONFIG_SECRET_EMPTY");
        assert.equal(error.variable, ENGINE_KEY_VARIABLE);
        assert.equal(error.message, SECRET_EMPTY_MESSAGE);
        assert.ok(!error.message.includes("hunter2"));
        return true;
      },
    );
  });
});

test("C-ca797e1f a weak engine key is CONFIG_INVALID with its file variable", () => {
  assert.doesNotThrow(() => {
    const error = new ConfigError(
      "CONFIG_INVALID",
      ENGINE_KEY_VARIABLE,
      "key must be at least 64 hex characters or base64 of at least 32 bytes",
    );

    assert.ok(error instanceof ConfigError);
    assert.ok(error instanceof Error);
    assert.equal(error.code, "CONFIG_INVALID");
    assert.equal(error.variable, ENGINE_KEY_VARIABLE);
    assert.equal(
      error.message,
      `${ENGINE_KEY_VARIABLE}: key must be at least 64 hex characters or base64 of at least 32 bytes`,
    );
    assert.ok(!error.message.includes("k".repeat(32)));
  });
});

test("C-3d74e0ae ConfigError names the variable and rule without a value", () => {
  assert.doesNotThrow(() => {
    const pair = new ConfigError(
      "CONFIG_INVALID",
      "URSITOARE_DATABASE_PASSWORD_FILE",
      "set only together with URSITOARE_DATABASE_URL",
    );
    assert.ok(pair instanceof Error);
    assert.equal(pair.code, "CONFIG_INVALID");
    assert.equal(pair.variable, "URSITOARE_DATABASE_PASSWORD_FILE");
    assert.equal(
      pair.message,
      "URSITOARE_DATABASE_PASSWORD_FILE: set only together with URSITOARE_DATABASE_URL",
    );

    const url = new ConfigError(
      "CONFIG_INVALID",
      "URSITOARE_DATABASE_URL",
      "must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full",
    );
    assert.equal(url.code, "CONFIG_INVALID");
    assert.equal(url.variable, "URSITOARE_DATABASE_URL");
    assert.equal(
      url.message,
      "URSITOARE_DATABASE_URL: must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full",
    );
    assert.ok(!url.message.includes("u:pw@h"));
  });
});

test("C-406ddaa1 readSecretValue returns a Secret for a database password file", () => {
  assert.doesNotThrow(() => {
    const calls: string[] = [];
    const password = readSecretValue(
      "URSITOARE_DATABASE_PASSWORD_FILE",
      "/run/secrets/db_password",
      (path) => {
        calls.push(path);
        return "pw-Zq7\n";
      },
    );
    const app = {
      url: "postgres://ursitoare_app@db.internal:5432/ursitoare",
      password,
    };

    assert.deepEqual(calls, ["/run/secrets/db_password"]);
    assert.equal(app.url, "postgres://ursitoare_app@db.internal:5432/ursitoare");
    assert.ok(password instanceof Secret);
    assert.equal(password.reveal(), "pw-Zq7");
    assert.equal(JSON.stringify({ password }), '{"password":"[REDACTED]"}');
    assert.ok(!inspect(password, { depth: null }).includes("pw-Zq7"));
    assert.ok(inspect(password, { depth: null }).includes("[REDACTED]"));
  });
});
