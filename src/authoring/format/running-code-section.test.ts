import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { missingDocTerms } from "./index.ts";

const docUrl = new URL("../../../docs/authoring/format.md", import.meta.url);

const HEADING = "## Running code and hooks";

const NINETEEN_LINES: readonly string[] = [
  "- A code node body reads its input as `input`.",
  "- A code node body must return an object.",
  "- A code node body is pure: it does no I/O.",
  "- A code node body sees a clock frozen to the run's step time.",
  "- A code node body sees a seeded `Math.random`.",
  "- A code node body runs under `CODE_LIMITS` (1000 ms, 32 MiB).",
  "- A code hook body reads `ctx` and returns nothing or an object with an `action`.",
  "- A code hook body runs under `HOOK_LIMITS`, the same 1000 ms and 32 MiB.",
  "- `continue` lets the node go on; a pre-hook may replace its input and a post-hook its output.",
  "- `skip` lets a pre-hook answer with the node's `output`, so the node does no work.",
  "- `redirect` lets a post-hook send the run to a node of its `routes` instead of the node's successor.",
  "- `retry` lets a post-hook run the node and its post-hooks again as the next attempt, without its pre-hooks, up to `max_retries`.",
  "- `fail` lets a pre-hook or a post-hook fail the node and the run with its `reason`.",
  "- A pre-hook may return: continue (with input), skip (read block or code node only), fail.",
  "- A post-hook may return: continue (with output on a code or block node), redirect (from a code, switch, wait or block node, to a node in routes, never an effect node), retry (with max_retries; an effect node needs allow_effect_retry; never on pay), fail.",
  "- A node has at most 16 pre-hooks and 16 post-hooks, a flow at most 16 rules, and a hook or rule id at most 64 characters.",
  "- `max_retries` is an integer from 1 to 5, set only on a post code hook.",
  "- A retry never re-pays: `max_retries` is refused (`H_RETRY_SCOPE`) on a `pay` node and when the node's post-hooks hold a `pay` block hook, and a `send`, `write` or unknown-effect node or post block hook needs `allow_effect_retry: true`.",
  "- A hook route into a node of effect `write`, `send`, `pay` or unknown (an agent, a subflow) is refused (`H_ROUTE_EFFECT`).",
];

const LITERAL_TERMS: readonly string[] = [
  "CODE_LIMITS",
  "HOOK_LIMITS",
  "16 hooks",
  "16 rules",
  "64 characters",
  "allow_effect_retry",
  "H_RETRY_SCOPE",
  "H_ROUTE_EFFECT",
  "1000 ms",
  "32 MiB",
  "ctx",
  "continue",
  "skip",
  "redirect",
  "retry",
  "fail",
];

function readDoc(): string {
  assert.equal(existsSync(docUrl), true, "docs/authoring/format.md exists");
  return readFileSync(docUrl, "utf8");
}

function sectionLines(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line === HEADING);
  assert.notEqual(start, -1, `heading ${HEADING} occurs`);
  assert.equal(
    lines.filter((line) => line === HEADING).length,
    1,
    `heading ${HEADING} occurs exactly once`,
  );
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line !== undefined && line.startsWith("## ")) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

test("C-258fa594 the running code and hooks section exists with its terms", () => {
  const markdown = readDoc();
  const lines = sectionLines(markdown);
  const text = lines.join("\n");

  for (const term of LITERAL_TERMS) {
    assert.ok(text.includes(term), `the section contains ${term}`);
  }

  const expected = [...NINETEEN_LINES];
  const actual = lines.filter((line) => expected.includes(line));
  assert.deepEqual(actual, expected, "the nineteen lines appear once each and in order");

  assert.equal(
    lines.filter((line) => line.startsWith("- A pre-hook may return:")).length,
    1,
    "the pre-hook line appears exactly once",
  );
  assert.equal(
    lines.filter((line) => line.startsWith("- A post-hook may return:")).length,
    1,
    "the post-hook line appears exactly once",
  );

  assert.deepEqual(missingDocTerms(markdown), []);
});
