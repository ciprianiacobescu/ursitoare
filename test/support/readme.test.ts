import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";

const README = path.join(import.meta.dirname, "README.md");
const FAKE_TOOLS_PREFIX = "| `fake-tools/` | `add-fake-tools` |";
const FAKE_TOOLS_ROW =
  "| `fake-tools/` | `add-fake-tools` | The 20 test-catalogue blocks as loopback tool handlers (recorded calls, idempotent effects, delay and failure knobs), reached through the fake proxy as `tools.fake.test`; e2e part `50-tools` |";
const REPLACED_SENTENCE =
  "The files `global-setup.ts` and `e2e-stack/main.ts` began as bootstrap placeholders; `add-db-foundation` and `add-e2e-stack` replaced them.";

function occurrences(text: string, part: string): number {
  return text.split(part).length - 1;
}

test("C-6ca0a047 the README names the fake accurately", () => {
  const text = readFileSync(README, "utf8");

  const rows = text
    .split("\n")
    .filter((line) => line.startsWith(FAKE_TOOLS_PREFIX));
  assert.equal(rows.length, 1, "exactly one line starts with the fake-tools row");
  assert.equal(rows[0], FAKE_TOOLS_ROW, "the fake-tools row is the one test-plan names");

  assert.equal(
    occurrences(text, REPLACED_SENTENCE),
    1,
    "the replaced bootstrap sentence is present once",
  );
  assert.equal(
    text.includes("Bootstrap placeholders exist"),
    false,
    "the stale bootstrap sentence is gone",
  );
});
