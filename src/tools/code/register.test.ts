import assert from "node:assert/strict";
import { test } from "node:test";

import { checkAdapterSurface } from "../adapter-surface.ts";
import { surfaceDigest } from "../surface.ts";
import { codeBlockSurface } from "./register.ts";
import type { CodeBlockToolInput } from "./register.ts";

const IN_T = { type: "object", properties: { text: { type: "string" } }, required: ["text"] };
const OUT_W = { type: "object", properties: { words: { type: "integer" } }, required: ["words"] };
const SRC_WC = "return { words: input.text.trim().split(/\\s+/).length };";

const WC: CodeBlockToolInput = {
  name: "word_count",
  description: "Count the words.",
  input: IN_T as CodeBlockToolInput["input"],
  output: OUT_W as CodeBlockToolInput["output"],
  source: SRC_WC,
};

const D_WC = "59d11c4654e2eeb76542d2e1fcc814eb8fa1abc9c38debe573a09afa5d1d5a61";
const D_NODESC = "1ef528cafb3b5dc04a8a6c27a7d19382183261bb41df2fa9eb4b4e85b05f08e7";
const D_FIXED = "ca47766a9e363b72b7a9bdd8c301d900593cd1a63b310c0cb6eeb9a37a1c0513";

test("C-2e402f84 codeBlockSurface fixes the flags and covers the source, rows B1 to B6", () => {
  assert.equal(typeof codeBlockSurface, "function");

  // B1
  let b1: ReturnType<typeof codeBlockSurface> | undefined;
  assert.doesNotThrow(() => {
    b1 = codeBlockSurface([WC]);
  });
  assert.ok(b1);
  assert.deepEqual(b1, {
    tools: [
      {
        name: "word_count",
        description: "Count the words.",
        effect: "read",
        input: IN_T,
        output: OUT_W,
        untrusted_result: false,
        unsafe_to_retry: false,
        call: { kind: "code", source: SRC_WC },
      },
    ],
  });
  assert.equal(surfaceDigest(b1 as ReturnType<typeof codeBlockSurface>), `sha256:${D_WC}`);

  // B2 (no description)
  const wcNoDesc: CodeBlockToolInput = { name: "word_count", input: IN_T as never, output: OUT_W as never, source: SRC_WC };
  let b2: ReturnType<typeof codeBlockSurface> | undefined;
  assert.doesNotThrow(() => {
    b2 = codeBlockSurface([wcNoDesc]);
  });
  assert.ok(b2);
  assert.equal(Object.prototype.hasOwnProperty.call((b2 as { tools: { description?: string }[] }).tools[0], "description"), false);
  assert.equal(surfaceDigest(b2 as ReturnType<typeof codeBlockSurface>), `sha256:${D_NODESC}`);

  // B3 FIXED
  const FIXED: CodeBlockToolInput = {
    name: "word_count",
    description: "Count the words.",
    input: IN_T as never,
    output: OUT_W as never,
    source: "return { words: 3 };",
  };
  let b3: ReturnType<typeof codeBlockSurface> | undefined;
  assert.doesNotThrow(() => {
    b3 = codeBlockSurface([FIXED]);
  });
  assert.ok(b3);
  assert.equal(surfaceDigest(b3 as ReturnType<typeof codeBlockSurface>), `sha256:${D_FIXED}`);

  // B4 deeply frozen argument unchanged
  const frozen = Object.freeze([Object.freeze({ ...WC })]);
  const copy = structuredClone(WC);
  let b4: ReturnType<typeof codeBlockSurface> | undefined;
  assert.doesNotThrow(() => {
    b4 = codeBlockSurface(frozen as readonly CodeBlockToolInput[]);
  });
  assert.ok(b4);
  assert.deepEqual(WC, copy);

  // B5 empty
  let b5: ReturnType<typeof codeBlockSurface> | undefined;
  assert.doesNotThrow(() => {
    b5 = codeBlockSurface([]);
  });
  assert.ok(b5);
  assert.deepEqual(b5, { tools: [] });

  // B6 checkAdapterSurface returns same object
  assert.ok(b1);
  let b6: unknown;
  assert.doesNotThrow(() => {
    b6 = checkAdapterSurface("code_block", b1 as ReturnType<typeof codeBlockSurface>);
  });
  assert.equal(b6, b1);
});
