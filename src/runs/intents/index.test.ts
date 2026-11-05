import assert from "node:assert/strict";
import { test } from "node:test";

import * as runs from "../index.ts";
import type { IntentError as IntentErrorType } from "./errors.ts";

const FUNCTION_NAMES = [
  "idemKey",
  "lineageOf",
  "recordIntent",
  "completeIntent",
  "markIntentUnknown",
  "getIntent",
  "createEffectIntents",
] as const;

test("C-cbabec69 The runs module exports the intent functions", () => {
  const surface = runs as unknown as Record<string, unknown>;

  for (const name of FUNCTION_NAMES) {
    assert.equal(typeof surface[name], "function", `${name} is a function`);
  }
});

test("C-cbabec69 IntentError is an exported error carrying its code", () => {
  const surface = runs as unknown as Record<string, unknown>;
  const IntentError = surface["IntentError"];
  assert.equal(typeof IntentError, "function", "IntentError is a function");

  const error = new (IntentError as new (code: string, message: string) => IntentErrorType)(
    "INTENT_NOT_FOUND",
    "x",
  );
  assert.ok(error instanceof Error, "IntentError extends Error");
  assert.equal(error.code, "INTENT_NOT_FOUND");
});
