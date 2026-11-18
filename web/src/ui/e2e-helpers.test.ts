import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const conftest = readFileSync(new URL("../../../e2e/conftest.py", import.meta.url), "utf8");

test("C-97e30a51 conftest defines watch_csp and assert_layout", () => {
  assert.ok(conftest.includes("def watch_csp(page) -> list[str]:"));
  assert.ok(conftest.includes("def assert_layout(page, max_banner_px: int = 72) -> None:"));
  assert.ok(conftest.includes("securitypolicyviolation"));
  assert.ok(conftest.includes("Content Security Policy violation: "));
});

test("C-97e30a51 conftest still defines login and assert_accessible", () => {
  assert.ok(conftest.includes("def login("));
  assert.ok(conftest.includes("def assert_accessible("));
  assert.ok(conftest.includes("def watch_csp("));
});
