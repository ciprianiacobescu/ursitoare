/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { RESERVED_ROOTS as WEB_RESERVED_ROOTS } from "../../../src/api/web-paths.ts";
import { RESERVED_ROOTS } from "./features.ts";

test("C-34823202 the web reserved roots equal the engine reserved roots", () => {
  assert.ok(RESERVED_ROOTS.length > 0, "the web reserved roots are not empty");
  assert.deepEqual(RESERVED_ROOTS, WEB_RESERVED_ROOTS);
});
