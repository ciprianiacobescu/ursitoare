import assert from "node:assert/strict";
import { test } from "node:test";

import { createWorkerSandbox, SandboxError } from "./index.ts";
import type { WorkerSandboxOptions } from "./index.ts";

test("C-c1be5467 C-061daa6c: a Proxy whose getPrototypeOf trap throws is refused as unreadable opts", () => {
  const opts = new Proxy(
    {},
    {
      getPrototypeOf() {
        throw new Error("trap");
      },
    },
  );

  assert.throws(
    () => createWorkerSandbox(opts as unknown as WorkerSandboxOptions),
    (error: unknown) => {
      assert.ok(error instanceof SandboxError, "the error is a SandboxError");
      assert.equal(error.name, "SandboxError", "the error name");
      assert.equal(error.code, "SANDBOX_INVALID", "the error code");
      assert.equal(error.message, "opts could not be read", "the error message");
      assert.deepEqual(error.details, { option: "opts" }, "the error details");
      return true;
    },
    "createWorkerSandbox must throw a SandboxError synchronously",
  );
});
