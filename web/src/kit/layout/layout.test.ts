/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { PAGE_WIDTHS, captionDisplayFor, sectionHeadingId } from "./layout.ts";

test("C-ab3cdbf6 sectionHeadingId captionDisplayFor and PAGE_WIDTHS are fixed strings", () => {
  assert.equal(typeof sectionHeadingId, "function");
  assert.equal(typeof captionDisplayFor, "function");
  assert.equal(sectionHeadingId("flow", "Test run"), "flow-test-run");
  assert.equal(sectionHeadingId("flow", "  Hello, World!  "), "flow-hello-world");
  assert.equal(sectionHeadingId("runs", "Step 2 / Input"), "runs-step-2-input");
  assert.equal(sectionHeadingId("a", "Résumé"), "a-r-sum");
  assert.equal(sectionHeadingId("a", "!!!"), "a-");
  assert.equal(sectionHeadingId("a", ""), "a-");
  assert.equal(sectionHeadingId("x", "---Already-Slugged---"), "x-already-slugged");
  assert.equal(sectionHeadingId("p", "AAA  b"), "p-aaa-b");

  assert.equal(captionDisplayFor("Flows", "Flows"), "hidden");
  assert.equal(captionDisplayFor(" Flows ", "Flows"), "hidden");
  assert.equal(captionDisplayFor("Flows", "flows"), "visible");
  assert.equal(captionDisplayFor("Versions", "Flows"), "visible");
  assert.equal(captionDisplayFor("", ""), "hidden");

  assert.deepEqual(PAGE_WIDTHS, { form: "max-w-3xl", list: "max-w-6xl", wide: "max-w-none" });
});
