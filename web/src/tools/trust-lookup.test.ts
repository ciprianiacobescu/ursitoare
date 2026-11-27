/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

const PAGES = ["RegisterPage.tsx", "ReplaceSection.tsx", "ReviewSections.tsx"] as const;

function readPage(name: string): string {
  const url = new URL(`./${name}`, import.meta.url);
  assert.ok(existsSync(url), `${name} must exist`);
  return existsSync(url) ? readFileSync(url, "utf8") : "";
}

// A plain index with a nullish fallback reads inherited members such as toString or constructor.
const PLAIN_TRUST_LOOKUP = /\b\w*[tT]rust\[[^\]\n]+\]\s*\?\?/;

for (const name of PAGES) {
  test(`C-f43385f5 C-c7bb4abe ${name} reads trust only through own entries`, () => {
    const source = readPage(name);
    assert.equal(
      PLAIN_TRUST_LOOKUP.test(source),
      false,
      `${name} must not read a trust record by a plain index with a nullish fallback`,
    );
    assert.equal(
      source.includes("Object.hasOwn(") || source.includes("trustFor("),
      true,
      `${name} guards its trust lookups with Object.hasOwn`,
    );
  });
}
