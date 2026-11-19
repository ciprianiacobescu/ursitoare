/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import type { CapabilityState } from "../kit/capabilities.ts";
import { navPlacement } from "./nav-groups.ts";

test("C-20b4a37d navPlacement follows the session state", async () => {
  assert.equal(typeof navPlacement, "function");
  const ready = { status: "ready", me: {} } as unknown as CapabilityState;
  const signedOut = { status: "signed_out" } as unknown as CapabilityState;
  const failed = { status: "failed", code: "UNKNOWN_ERROR" } as unknown as CapabilityState;
  let answers: string[] = [];
  assert.doesNotThrow(() => {
    answers = [navPlacement(null), navPlacement(signedOut), navPlacement(failed), navPlacement(ready)];
  });
  assert.deepEqual(answers, ["sidebar", "inline", "inline", "sidebar"]);
});
