import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { missingDocTerms } from "./index.ts";

const docUrl = new URL("../../../docs/authoring/format.md", import.meta.url);

test("C-62fccf2b format.md reads the node-id rule and the optional selector", () => {
  const markdown = readFileSync(docUrl, "utf8");
  const text = markdown.replace(/\s+/g, " ");
  assert.ok(text.includes("lower-case snake_case, at most 128 characters"));
  assert.ok(
    text.includes(
      "an `id`, an optional `match` selector (an absent one selects every node) and optional `pre` and `post` hook definitions",
    ),
  );
  assert.ok(!text.includes("a `match` selector and optional"));
  assert.deepEqual(missingDocTerms(markdown), []);
});
