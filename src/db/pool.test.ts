import assert from "node:assert/strict";
import { test } from "node:test";

import { DbError, ROLE_APP, ROLE_OWNER, createPool } from "./index.ts";

const VALID_URL = "postgres://u@127.0.0.1:5433/d";

test("C-7c1574be createPool builds a pool from an endpoint password with the default options", () => {
  assert.doesNotThrow(() => {
    const pool = createPool({
      url: VALID_URL,
      password: { reveal: () => "s3cret-x" },
    });

    assert.equal(pool.options.host, "127.0.0.1");
    assert.equal(pool.options.port, 5433);
    assert.equal(pool.options.user, "u");
    assert.equal(pool.options.database, "d");
    assert.equal(pool.options.max, 10);
    assert.equal(pool.options.password, "s3cret-x");
    assert.equal(pool.options.ssl, false);
    assert.equal(pool.totalCount, 0);

    void pool.end();

    assert.equal(ROLE_OWNER, "ursitoare_owner");
    assert.equal(ROLE_APP, "ursitoare_app");
  });
});

test("C-7c1574be createPool accepts postgresql URLs and verify-full TLS", () => {
  assert.doesNotThrow(() => {
    const plain = createPool("postgresql://u@127.0.0.1:5433/d");
    assert.equal(plain.options.host, "127.0.0.1");
    assert.equal(plain.options.ssl, false);
    void plain.end();

    const verified = createPool("postgresql://u@127.0.0.1:5433/d?sslmode=verify-full");
    assert.deepEqual(verified.options.ssl, { rejectUnauthorized: true });
    void verified.end();
  });
});

test("C-63221721 createPool refuses bad endpoints and options without echoing them", () => {
  const cases: {
    label: string;
    run: () => unknown;
    reason: string;
  }[] = [
    { label: "wrong scheme", run: () => createPool("mysql://u@h/d"), reason: "bad_scheme" },
    { label: "not a URL", run: () => createPool("not a url"), reason: "bad_scheme" },
    { label: "no host", run: () => createPool("postgres:///d"), reason: "missing_host" },
    { label: "malformed userinfo", run: () => createPool("postgres://u@/d"), reason: "bad_url" },
    { label: "port out of range", run: () => createPool("postgres://h:99999/d"), reason: "bad_url" },
    {
      label: "unsupported parameter",
      run: () => createPool("postgres://u@h/d?host=x"),
      reason: "unsupported_parameter",
    },
    {
      label: "unsupported sslmode",
      run: () => createPool("postgres://u:p4ss@h/d?sslmode=require"),
      reason: "unsupported_sslmode",
    },
    {
      label: "empty password",
      run: (): unknown => createPool({ url: "postgres://u@h/d", password: { reveal: () => "" } }),
      reason: "bad_password",
    },
    { label: "zero max", run: () => createPool("postgres://u@h/d", { max: 0 }), reason: "bad_option" },
  ];

  const urls = [
    "mysql://u@h/d",
    "not a url",
    "postgres:///d",
    "postgres://u@/d",
    "postgres://h:99999/d",
    "postgres://u@h/d?host=x",
    "postgres://u:p4ss@h/d?sslmode=require",
    "postgres://u@h/d",
  ];

  for (const entry of cases) {
    assert.throws(entry.run, (error: unknown) => {
      assert.ok(error instanceof DbError, `${entry.label} throws DbError`);
      assert.equal(error.code, "DB_INVALID", `${entry.label} has DB_INVALID`);
      assert.equal(error.details.reason, entry.reason, `${entry.label} names its rule`);
      assert.ok(!error.message.includes("p4ss"), `${entry.label} hides the password`);
      for (const url of urls) {
        assert.ok(!error.message.includes(url), `${entry.label} hides ${url}`);
      }
      return true;
    });
  }
});

test("C-dc754ade an idle client error reaches onError once and never throws", () => {
  assert.doesNotThrow(() => {
    const seen: Error[] = [];
    const recording = createPool(VALID_URL, { onError: (error) => seen.push(error) });
    const boom = new Error("boom");

    recording.emit("error", boom);

    assert.equal(seen.length, 1);
    assert.equal(seen[0], boom);
    void recording.end();

    const silent = createPool(VALID_URL);
    silent.emit("error", new Error("boom"));
    void silent.end();
  });
});
