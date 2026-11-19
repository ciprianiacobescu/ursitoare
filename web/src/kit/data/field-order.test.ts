/// <reference types="node" />
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const FIELD = readFileSync(new URL("./Field.tsx", import.meta.url), "utf8");
const FORM = readFileSync(new URL("./Form.tsx", import.meta.url), "utf8");

function order(block: string, needles: readonly string[]): number[] {
  return needles.map((needle) => block.indexOf(needle));
}

function ascending(positions: readonly number[]): boolean {
  return positions.every((p, i) => p >= 0 && (i === 0 || p > (positions[i - 1] ?? 0)));
}

test("C-23da30c9 the stacked Field renders label then control then described", () => {
  const start = FIELD.lastIndexOf('<div className="ui-field">');
  assert.ok(start >= 0);
  const block = FIELD.slice(start);
  assert.ok(ascending(order(block, ["{label}", "{props.children(control)}", "{described}"])));
});

test("C-23da30c9 the inline Field order and the Error prefix stay while the stacked order changes", () => {
  const start = FIELD.indexOf('<div className="ui-field-inline">');
  assert.ok(start >= 0);
  const block = FIELD.slice(start, FIELD.indexOf("</div>", start));
  assert.ok(ascending(order(block, ["{props.children(control)}", "{label}", "{described}"])));
  assert.match(
    FIELD,
    /className="ui-field-error">\s*<span className="ui-visually-hidden">Error: <\/span>/,
  );
  const stacked = FIELD.slice(FIELD.lastIndexOf('<div className="ui-field">'));
  assert.ok(ascending(order(stacked, ["{label}", "{props.children(control)}", "{described}"])));
});

test("C-23da30c9 the Form submit button carries the primary tone once", () => {
  assert.equal(FORM.split('data-tone="primary"').length - 1, 1);
});
