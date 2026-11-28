import assert from "node:assert/strict";
import { test } from "node:test";

import { loadAdminDatabase } from "./admin.ts";
import { isDatabaseUrl } from "./config.ts";
import { ConfigError } from "./errors.ts";

const URL_VARIABLE = "URSITOARE_DATABASE_ADMIN_URL";
const FILE_VARIABLE = "URSITOARE_DATABASE_ADMIN_PASSWORD_FILE";
const VALID_URL = "postgres://postgres@db.internal:5432/ursitoare";
const FILE = "/run/secrets/db_superuser_password";
const URL_REASON =
  "must be a postgres or postgresql URL with a host, no password and only sslmode disable or verify-full";
const NAME_REASON =
  "must name one database: up to 63 letters, digits, underscores or hyphens, not starting with a digit or hyphen";
const FILE_REASON = "file is missing, unreadable or empty";

const reader = (): string => "pw-admin\n";

function refusal(
  env: Record<string, string | undefined>,
  readSecret: (path: string) => string,
): ConfigError | null {
  try {
    loadAdminDatabase(env, readSecret);
  } catch (error) {
    return error instanceof ConfigError ? error : null;
  }
  return null;
}

function expectRefusal(
  env: Record<string, string | undefined>,
  readSecret: (path: string) => string,
  code: string,
  message: string,
): void {
  const error = refusal(env, readSecret);
  assert.ok(error, `expected a ConfigError for ${message}`);
  assert.equal(error.code, code);
  assert.equal(error.message, message);
}

test("C-4433906a loadAdminDatabase reads and refuses", () => {
  const valid = { [URL_VARIABLE]: VALID_URL, [FILE_VARIABLE]: FILE };
  let seenPath = "";
  let endpoint: ReturnType<typeof loadAdminDatabase> | undefined;
  assert.doesNotThrow(() => {
    endpoint = loadAdminDatabase(valid, (path) => {
      seenPath = path;
      return "pw-admin\n";
    });
  });
  assert.ok(endpoint);
  assert.equal(endpoint.url, VALID_URL);
  assert.equal(endpoint.password?.reveal(), "pw-admin");
  assert.equal(seenPath, FILE);
  const json = JSON.stringify(endpoint);
  assert.ok(json.includes("[REDACTED]"));
  assert.ok(!json.includes("pw-admin"));

  expectRefusal({ [FILE_VARIABLE]: FILE }, reader, "CONFIG_INVALID", `${URL_VARIABLE}: must be set`);

  const withPassword = refusal(
    { [URL_VARIABLE]: "postgres://postgres:pw-in-url@db.internal/ursitoare", [FILE_VARIABLE]: FILE },
    reader,
  );
  assert.ok(withPassword);
  assert.equal(withPassword.code, "CONFIG_INVALID");
  assert.equal(withPassword.message, `${URL_VARIABLE}: ${URL_REASON}`);
  assert.ok(!withPassword.message.includes("pw-in-url"));

  expectRefusal(
    { [URL_VARIABLE]: "postgres://postgres@db.internal", [FILE_VARIABLE]: FILE },
    reader,
    "CONFIG_INVALID",
    `${URL_VARIABLE}: ${NAME_REASON}`,
  );
  expectRefusal(
    { [URL_VARIABLE]: `postgres://postgres@db.internal/${"d".repeat(64)}`, [FILE_VARIABLE]: FILE },
    reader,
    "CONFIG_INVALID",
    `${URL_VARIABLE}: ${NAME_REASON}`,
  );
  const url63 = `postgres://postgres@db.internal/${"d".repeat(63)}`;
  assert.doesNotThrow(() => {
    assert.equal(loadAdminDatabase({ [URL_VARIABLE]: url63, [FILE_VARIABLE]: FILE }, reader).url, url63);
  });

  expectRefusal({ [URL_VARIABLE]: VALID_URL }, reader, "CONFIG_INVALID", `${FILE_VARIABLE}: must be set`);
  expectRefusal(
    valid,
    () => {
      throw new Error("ENOENT");
    },
    "CONFIG_SECRET_EMPTY",
    `${FILE_VARIABLE}: ${FILE_REASON}`,
  );
  expectRefusal(valid, () => "\n", "CONFIG_SECRET_EMPTY", `${FILE_VARIABLE}: ${FILE_REASON}`);

  assert.equal(isDatabaseUrl(VALID_URL), true);
  assert.equal(isDatabaseUrl("postgres://postgres:pw@db.internal/ursitoare"), false);
  assert.equal(isDatabaseUrl("mysql://x/y"), false);
});
