/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const PAGE = readFileSync(new URL("./RunPage.tsx", import.meta.url), "utf8");
const CSS = readFileSync(new URL("./runs.css", import.meta.url), "utf8");

test("C-2df1ce97 Input and Output payloads use the class whose rule wraps long lines", () => {
  const used = PAGE.split(/className="[^"]*\bruns-payload\b[^"]*"/).length - 1;
  assert.ok(used >= 2, "Input and Output each carry the runs-payload class");
  const rule = /\.runs-payload(?:\s+pre)?\s*\{([^}]*)\}/.exec(CSS);
  assert.ok(rule, "runs.css has a runs-payload rule");
  assert.match(rule[1] ?? "", /white-space:\s*pre-wrap/);
  assert.match(rule[1] ?? "", /overflow-wrap:\s*anywhere/);
});

test("C-2df1ce97 the payload rule reaches the pre element inside the Step details column", () => {
  const sectionPre = /<Section[^>]*title="(?:Input|Output)"[^>]*>\s*<pre\b([^>]*)>/g;
  const matches = [...PAGE.matchAll(sectionPre)];
  assert.equal(matches.length, 2);
  for (const m of matches) {
    const direct = /className="[^"]*\bruns-payload\b/.test(m[1] ?? "");
    const viaSection = /\.runs-payload\s+pre\s*\{/.test(CSS);
    assert.ok(direct || viaSection);
    assert.ok(direct, "the pre itself carries runs-payload, so the rule matches it");
  }
});
