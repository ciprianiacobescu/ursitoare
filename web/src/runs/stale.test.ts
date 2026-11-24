import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { dryRunFormErrors } from "./dry-run.ts";
import { registerRunMessages } from "./messages.ts";
import { staleVersionText } from "./stale.ts";
import { testRunFormErrors } from "./test-run.ts";

const STALE =
  "This version was validated by an older validator. Validate it again from the flow's version page, then run it.";
const BLOCKS = "The flow uses blocks the registry does not have: erp.lookup_vendor@1.";

const staleDetails = { reason: "version_not_runnable", cause: "validation_stale" };
const blockDetails = {
  reason: "version_not_runnable",
  cause: "block_missing",
  blocks: ["erp.lookup_vendor@1"],
};

function refusal(details: unknown): ApiRequestError {
  return new ApiRequestError(422, "OPERATION_REFUSED", "refused", { details });
}

test("C-a7a348b2 staleVersionText gives the text for a stale version and null otherwise", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");
  let got: unknown[] = [];
  assert.doesNotThrow(() => {
    got = [
      staleVersionText(staleDetails),
      staleVersionText(blockDetails),
      staleVersionText({ cause: "validation_stale" }),
      staleVersionText(null),
    ];
  });
  assert.deepEqual(got, [STALE, null, null, null]);
});

test("C-a7a348b2 testRunFormErrors reads a stale refusal as one message", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");
  assert.deepEqual(testRunFormErrors(refusal(staleDetails)), { $form: STALE });
  assert.deepEqual(testRunFormErrors(refusal(blockDetails)), { $form: BLOCKS });
});

test("C-a7a348b2 dryRunFormErrors reads a stale refusal as one message", () => {
  assert.doesNotThrow(() => registerRunMessages(), "the run messages register");
  assert.deepEqual(dryRunFormErrors(refusal(staleDetails)), { $form: STALE });
  assert.deepEqual(dryRunFormErrors(refusal(blockDetails)), { $form: BLOCKS });
});
