/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  FLOW_ERROR_CODES,
  FLOW_RESERVED_CODES,
  FLOW_WARNING_CODES,
  diagnosticLink,
} from "../../src/authoring/index.ts";
import { REPO_DOCS_BASE, diagnosticHref } from "../../web/src/flows/diagnostics.ts";

assert.equal(typeof diagnosticHref, "function");

const BASE = "https://github.com/ciprianiacobescu/ursitoare/blob/main/";

function engineLink(code: string): string {
  let link: string | null | undefined;
  assert.doesNotThrow(() => {
    link = diagnosticLink(code);
  }, `${code} has an engine link`);
  assert.ok(link !== null && link !== undefined, `${code} has an engine link`);
  return link as string;
}

function webLink(code: string): string | null {
  let link: string | null | undefined;
  assert.doesNotThrow(() => {
    link = diagnosticHref(code);
  }, `${code} has a web link`);
  assert.ok(link !== undefined, `${code} produced a web link answer`);
  return link as string | null;
}

test("C-f96f8003 REPO_DOCS_BASE points at the repository main branch", () => {
  assert.equal(REPO_DOCS_BASE, BASE, "the docs base is the main branch of the repository");
});

test("C-f96f8003 every engine code links to its guide section", () => {
  const codes = [...FLOW_ERROR_CODES, ...FLOW_WARNING_CODES, ...FLOW_RESERVED_CODES];
  assert.ok(codes.length > 0, "the engine publishes diagnostic codes");

  for (const code of codes) {
    assert.equal(webLink(code), `${BASE}${engineLink(code)}`, `${code} links to its guide section`);
  }
});
