import assert from "node:assert/strict";
import { test } from "node:test";

import * as authoring from "../index.ts";
import type { joinTaint } from "./index.ts";

test("C-a609be4d names are exported by the authoring surface", () => {
  const surface = authoring as unknown as Record<string, unknown>;

  const functionNames = [
    "normalizeTaint",
    "joinTaint",
    "relabelExtract",
    "taintIncludes",
    "analyzeTaint",
    "capabilityEvidence",
    "flowCapabilities",
    "TaintError",
  ];
  for (const name of functionNames) {
    assert.equal(typeof surface[name], "function", name);
  }

  const objectNames = ["TAINT_LABELS", "NO_TAINT", "TAINT_LIMITS"];
  for (const name of objectNames) {
    assert.equal(typeof surface[name], "object", name);
  }

  let result: ReturnType<typeof joinTaint> = [];
  assert.doesNotThrow(() => {
    result = (surface["joinTaint"] as typeof joinTaint)(["untrusted"], ["extracted"]);
  });
  assert.deepEqual(result, ["extracted", "untrusted"]);
});
