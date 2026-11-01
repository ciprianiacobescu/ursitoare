import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { documentedTerms, missingDocTerms } from "./index.ts";

const docUrl = new URL("../../../docs/authoring/format.md", import.meta.url);

const kinds = [
  "block",
  "code",
  "llm.extract",
  "llm.generate",
  "llm.decide",
  "agent",
  "switch",
  "human.approval",
  "human.form",
  "foreach",
  "subflow",
  "delegate",
  "wait",
  "end",
];

const topLevelFields = [
  "ursitoare",
  "flow",
  "version",
  "description",
  "inputs",
  "start",
  "nodes",
  "hooks",
  "expose",
];

const extraTerms = [
  "skill_mode",
  "context_budget",
  "max_retries",
  "hook",
  "FORMAT_NOT_JSON",
  "sha256",
  "maxBytes",
  "1048576",
  "maxDepth",
  "maxAliasCount",
];

function terms(): string[] {
  let result: string[] = [];
  assert.doesNotThrow(() => {
    result = documentedTerms();
  });
  return result;
}

function missing(markdown: string): string[] {
  let result: string[] = [];
  assert.doesNotThrow(() => {
    result = missingDocTerms(markdown);
  });
  return result;
}

function readDoc(): string {
  assert.equal(existsSync(docUrl), true, "docs/authoring/format.md exists");
  return readFileSync(docUrl, "utf8");
}

test("C-0ec8f597 documentedTerms lists every term without duplicates", () => {
  const listed = terms();
  assert.equal(new Set(listed).size, listed.length, "documentedTerms has no duplicates");
  for (const term of [...kinds, ...topLevelFields, ...extraTerms]) {
    assert.ok(listed.includes(term), `documentedTerms includes ${term}`);
  }
});

test("C-0ec8f597 the documentation is missing no term", () => {
  const markdown = readDoc();
  assert.deepEqual(missing(markdown), []);
});

test("C-0ec8f597 an empty document is missing every term", () => {
  const listed = terms();
  assert.ok(listed.length > 0, "documentedTerms is not empty");
  assert.deepEqual(missing(""), listed);
});

test("C-0ec8f597 a document without the hooks term misses only hooks", () => {
  const markdown = readDoc();
  assert.deepEqual(missing(markdown.replaceAll("`hooks`", "")), ["hooks"]);
});
