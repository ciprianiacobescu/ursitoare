import assert from "node:assert/strict";
import { test } from "node:test";

import { healthPayload } from "./health.ts";

test("healthPayload reports ok and the given version", () => {
  const payload = healthPayload("1.2.3");
  assert.equal(typeof payload, "object");
  assert.deepEqual(payload, { status: "ok", version: "1.2.3" });
});
