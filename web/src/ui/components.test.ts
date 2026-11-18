/// <reference types="node" />
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { findInlineStyleUse } from "../kit/contrast.ts";

assert.equal(typeof findInlineStyleUse, "function");

const FORBIDDEN = [
  ["outline", "none"].join("-"),
  ["focus", "ring"].join(":"),
  ["focus-visible", "ring"].join(":"),
  ["role", "="].join(""),
];

function sourceFor(name: string): string {
  const url = new URL(`./${name}.tsx`, import.meta.url);
  assert.ok(existsSync(url), `${url.pathname} must exist`);
  return readFileSync(url, "utf8");
}

function assertClean(name: string, source: string): void {
  assert.deepEqual(findInlineStyleUse(source), [], `${name}.tsx has no inline style`);
  for (const needle of FORBIDDEN) {
    assert.equal(source.includes(needle), false, `${name}.tsx must not contain ${needle}`);
  }
}

function assertContains(source: string, needed: readonly string[]): void {
  for (const text of needed) {
    assert.ok(source.includes(text), `the source contains ${text}`);
  }
}

const DISABLED_WORD = /(?<![\w-])disabled(?![\w-])/;

test("C-a22e8a8b button source keeps the markup and class rules", () => {
  const source = sourceFor("button");
  assertClean("button", source);
  assert.equal(DISABLED_WORD.test(source), false, "button.tsx never names the native disabled");
  assertContains(source, [
    "{ buttonClasses }",
    "data-slot=\"button\"",
    "Slot",
    "buttonClasses(",
    "type = \"button\"",
    "{...props}",
  ]);
});

test("C-a22e8a8b badge source keeps the tone pairs", () => {
  const source = sourceFor("badge");
  assertClean("badge", source);
  assertContains(source, [
    "data-slot=\"badge\"",
    "data-tone",
    "bg-quiet-surface text-quiet-text",
    "bg-info-surface text-info-text",
    "bg-success-surface text-success-text",
    "bg-warning-surface text-warning-text",
    "bg-danger-surface text-danger-text",
  ]);
});

test("C-a22e8a8b card source keeps the token utilities", () => {
  const source = sourceFor("card");
  assertClean("card", source);
  assertContains(source, [
    "data-slot=\"card\"",
    "rounded-(--ui-radius-lg)",
    "shadow-(--ui-shadow-sm)",
  ]);
});

test("C-a22e8a8b skeleton source stays hidden and slot tagged", () => {
  const source = sourceFor("skeleton");
  assertClean("skeleton", source);
  assertContains(source, ["data-slot=\"skeleton\"", "aria-hidden=\"true\""]);
});

test("C-a22e8a8b tooltip source keeps the provider delay and portal", () => {
  const source = sourceFor("tooltip");
  assertClean("tooltip", source);
  assertContains(source, ["delayDuration={300}", "asChild", "Portal"]);
});

test("C-a22e8a8b collapsible source keeps its three slots", () => {
  const source = sourceFor("collapsible");
  assertClean("collapsible", source);
  assertContains(source, [
    "data-slot=\"collapsible\"",
    "data-slot=\"collapsible-trigger\"",
    "data-slot=\"collapsible-content\"",
  ]);
});
