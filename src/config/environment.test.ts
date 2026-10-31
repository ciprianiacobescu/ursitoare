import assert from "node:assert/strict";
import { test } from "node:test";

import type { Env } from "./config.ts";
import { readProcessEnv } from "./environment.ts";

const PROBE = "URSITOARE_CLI_PROBE";

test("C-54587b81 readProcessEnv returns a copy of the process environment", () => {
  process.env[PROBE] = "x";
  try {
    let env: Env | undefined;
    assert.doesNotThrow(() => {
      env = readProcessEnv();
    }, "readProcessEnv returns the process environment");
    assert.ok(env !== undefined, "readProcessEnv returns an environment");
    assert.equal(env[PROBE], "x");

    const mutable: Record<string, string | undefined> = env;
    mutable[PROBE] = "y";
    assert.equal(process.env[PROBE], "x");
  } finally {
    Reflect.deleteProperty(process.env, PROBE);
  }
});
