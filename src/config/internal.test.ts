import assert from "node:assert/strict";
import { test } from "node:test";

import type { AppConfig, Env } from "./config.ts";
import { loadConfig } from "./config.ts";
import { ConfigError } from "./errors.ts";
import { parseInternalPort } from "./internal.ts";

type InternalAppConfig = AppConfig & { readonly internalPort?: number };

const VARIABLE = "URSITOARE_INTERNAL_PORT";
const RANGE_REASON = "must be an integer from 1 to 65535";
const DIFFER_REASON = "must differ from URSITOARE_PORT";

function read(env: Env, publicPort: number): number {
  let port: number | undefined;
  assert.doesNotThrow(() => {
    port = parseInternalPort(env, publicPort);
  }, `parseInternalPort(${JSON.stringify(env)}, ${publicPort})`);
  assert.ok(port !== undefined, "parseInternalPort returns a port");
  return port;
}

function expectRefused(env: Env, publicPort: number, reason: string): void {
  assert.throws(
    () => parseInternalPort(env, publicPort),
    (error: unknown) => {
      assert.ok(error instanceof ConfigError, "expected ConfigError");
      assert.equal(error.code, "CONFIG_INVALID");
      assert.equal(error.variable, VARIABLE);
      assert.equal(error.message, `${VARIABLE}: ${reason}`);
      return true;
    },
  );
}

assert.equal(typeof parseInternalPort, "function");

test("C-50e3532e parseInternalPort defaults to 8090 and reads the environment", () => {
  assert.equal(read({}, 8080), 8090);
  assert.equal(read({ [VARIABLE]: "9091" }, 8080), 9091);
  assert.equal(read({ [VARIABLE]: "" }, 8080), 8090);
});

test("C-50e3532e parseInternalPort refuses out-of-range or non-numeric values", () => {
  for (const value of ["0", "65536", "80a"]) {
    expectRefused({ [VARIABLE]: value }, 8080, RANGE_REASON);
  }
});

test("C-50e3532e parseInternalPort refuses the public port", () => {
  expectRefused({ [VARIABLE]: "8080" }, 8080, DIFFER_REASON);
});

test("C-50e3532e loadConfig exposes the internal port", () => {
  assert.doesNotThrow(() => {
    const config = loadConfig({}) as InternalAppConfig;
    assert.equal(config.internalPort, 8090);

    const custom = loadConfig({ [VARIABLE]: "9091" }) as InternalAppConfig;
    assert.equal(custom.internalPort, 9091);
  });
});
