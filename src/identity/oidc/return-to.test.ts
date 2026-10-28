import assert from "node:assert/strict";
import { test } from "node:test";

import { sanitizeReturnTo } from "../index.ts";

test("C-7320db36 Only a relative return_to survives", () => {
  assert.doesNotThrow(() => {
    assert.equal(sanitizeReturnTo("/flows"), "/flows");
    assert.equal(sanitizeReturnTo("/runs/5?x=1#top"), "/runs/5?x=1#top");

    const refused: unknown[] = [
      "//evil.example",
      "https://evil.example/x",
      "/\\evil.example",
      "/a\r\nb",
      "javascript:alert(1)",
      "",
      undefined,
      5,
      "/auth/oidc/login",
      "/" + "x".repeat(512),
    ];
    for (const raw of refused) {
      assert.equal(sanitizeReturnTo(raw), "/");
    }
  });
});
