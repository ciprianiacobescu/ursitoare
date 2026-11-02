/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { lineColumnOffset, pointerRange } from "./positions.ts";

assert.equal(typeof pointerRange, "function");

const T = 'flow: x\nnodes:\n  a:\n    uses: "k.b@1"\n    tools:\n      - z\n';

const TJ = '{"flow":"x","nodes":{"a":{"uses":"k"}}}';

function offset(text: string, line: number, column: number): number {
  let result: number | undefined;
  assert.doesNotThrow(() => {
    result = lineColumnOffset(text, line, column);
  }, `line ${line} column ${column} gives an offset`);
  assert.ok(result !== undefined, `line ${line} column ${column} produced an offset`);
  return result as number;
}

function range(text: string, pointer: string): { from: number; to: number } {
  let result: { from: number; to: number } | undefined;
  assert.doesNotThrow(() => {
    result = pointerRange(text, pointer);
  }, `${pointer} is found in the text`);
  assert.ok(result !== undefined, `${pointer} produced a range`);
  return result as { from: number; to: number };
}

function slice(text: string, pointer: string): string {
  const { from, to } = range(text, pointer);
  return text.slice(from, to);
}

test("C-944fd4d1 lineColumnOffset clamps a column and a line to the text", () => {
  const text = "ab\ncde\n";
  assert.equal(offset(text, 1, 1), 0, "the start of the text");
  assert.equal(offset(text, 2, 2), 4, "the second character of the second line");
  assert.equal(offset(text, 2, 99), 6, "a column past the end of the line");
  assert.equal(offset(text, 3, 1), 7, "the empty last line");
  assert.equal(offset(text, 9, 1), 7, "a line past the end of the text");
  assert.equal(offset(text, 1.5, 1), 0, "a line that is not a whole number");
});

test("C-944fd4d1 pointerRange finds the value a YAML pointer names", () => {
  assert.equal(slice(T, "/flow"), "x", "a scalar value");
  assert.equal(slice(T, "/nodes/a/uses"), "k.b@1", "a quoted scalar value without its quotes");
  assert.equal(slice(T, "/nodes/a/tools/0"), "z", "the first item of a sequence");
  assert.equal(slice(T, "/nodes/a"), "a", "the key of a mapping value");
  assert.equal(slice(T, "/nodes/a/missing"), "a", "the last resolved key for a missing segment");
  assert.equal(slice(T, "/nodes"), "nodes", "the key of the root mapping value");
  assert.equal(slice(T, ""), "flow: x", "the first line for a pointer without a slash");
  assert.equal(slice(T, "/ghost/deeper"), "flow: x", "the first line when nothing resolves");
  assert.equal(slice(T, "x"), "flow: x", "the first line for a pointer without a leading slash");
});

test("C-944fd4d1 pointerRange reads JSON and escaped keys and the empty text", () => {
  assert.equal(slice(TJ, "/nodes/a/uses"), "k", "a value in a JSON flow");
  assert.equal(slice("a/b: 1\n", "/a~1b"), "1", "a key whose slash is escaped");
  assert.deepEqual(range("", "/a"), { from: 0, to: 0 }, "the empty text gives an empty range");
});
