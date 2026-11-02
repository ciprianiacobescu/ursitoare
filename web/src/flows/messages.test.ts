/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { ApiRequestError } from "../api/client.ts";
import { FALLBACK_MESSAGE } from "../kit/messages.ts";
import { flowErrorMessage } from "./messages.ts";

assert.equal(typeof flowErrorMessage, "function");

test("C-ba506c1d: flowErrorMessage turns errors into actionable text", () => {
  assert.doesNotThrow(() => {
    assert.equal(
      flowErrorMessage(new ApiRequestError(409, "ALREADY_EXISTS", "m")),
      "A flow with this name already exists. Choose another name.",
    );
    assert.equal(
      flowErrorMessage(new ApiRequestError(403, "FORBIDDEN", "m", { details: { decisionId: "d-1" } })),
      "You are not allowed to do this. If you think you should be, give the decision id to an administrator. Decision id: d-1",
    );
    assert.equal(
      flowErrorMessage(new ApiRequestError(422, "FLOW_TEXT_INVALID", "m")),
      "The text is not a flow document. See the diagnostics.",
    );
    assert.equal(flowErrorMessage(new RangeError("Enter the flow text first.")), "Enter the flow text first.");
    assert.equal(flowErrorMessage(new Error("x")), FALLBACK_MESSAGE);
  });
});
