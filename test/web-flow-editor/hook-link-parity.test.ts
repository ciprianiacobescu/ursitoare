/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  HOOK_ERROR_CODES,
  HOOK_WARNING_CODES,
  diagnosticLink,
} from "../../src/authoring/index.ts";
import { REPO_DOCS_BASE, diagnosticHref } from "../../web/src/flows/diagnostics.ts";

assert.equal(typeof diagnosticHref, "function");

test("C-8a9b0cea every hook code has a guide link", () => {
  assert.deepEqual([...HOOK_ERROR_CODES], [
    "H_SCHEMA",
    "H_BLOCK",
    "H_ROUTE_TARGET",
    "H_ROUTE_HUMAN",
    "H_ROUTE_EFFECT",
    "H_RETRY_SCOPE",
    "H_CYCLE",
    "H_DOMINANCE",
  ]);
  assert.deepEqual([...HOOK_WARNING_CODES], ["W_NO_MATCH"]);

  for (const code of [...HOOK_ERROR_CODES, ...HOOK_WARNING_CODES]) {
    const link = diagnosticLink(code);
    assert.notEqual(link, null, `${code} has an engine guide link`);
    assert.equal(diagnosticHref(code), `${REPO_DOCS_BASE}${link}`, `${code} links to its guide`);
  }
});
