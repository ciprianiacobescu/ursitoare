/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { shellLayout } from "./nav-groups.ts";

test("C-b054e7d6 shellLayout is a sidebar from 1024 px and collapsed below", () => {
  assert.equal(typeof shellLayout, "function");
  const widths = [0, 1023, 1023.9, 1024, 1280, 1366, Number.NaN, Number.POSITIVE_INFINITY, -1];
  assert.deepEqual(widths.map(shellLayout), [
    "collapsed",
    "collapsed",
    "collapsed",
    "sidebar",
    "sidebar",
    "sidebar",
    "collapsed",
    "sidebar",
    "collapsed",
  ]);
});
