/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { surfaceDiff } from "./review.ts";
import { valueChangeLines, withValueLines, type ChangesText } from "./trust.ts";

const NOT_SET = Symbol("not set");

function call<T>(run: () => T): T {
  let value: T | typeof NOT_SET = NOT_SET;
  assert.doesNotThrow(() => {
    value = run();
  }, "the call must not throw");
  assert.ok(value !== NOT_SET, "the call returned a value");
  return value as T;
}

const IO = { type: "object" };

function M(name: string): Record<string, unknown> {
  return { kind: "mcp", endpoint: "/mcp", name, protocolVersion: "2026-07-28", output: "structured" };
}

function F(name: string, effect: string, over?: Record<string, unknown>): Record<string, unknown> {
  return { name, effect, input: IO, output: IO, call: M(name), ...over };
}

function S(...tools: unknown[]): { tools: unknown[] } {
  return { tools };
}

const AP2 = S(
  F("find_vendor", "write"),
  F("log_note", "write", { unsafe_to_retry: false }),
  F("same", "read"),
  F("dc", "read", { data_class: "public" }),
  F("fl", "read"),
);
const PP2 = S(
  F("find_vendor", "read", { untrusted_result: false }),
  F("log_note", "write", { unsafe_to_retry: true }),
  F("same", "read"),
  F("dc", "read", { data_class: "private" }),
  F("fl", "read", { data_class: "a‮b" }),
);

function asObject(m: ReadonlyMap<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(m);
}

test("C-315dc330 VL1 each changed field reads as a fixed line under its tool", () => {
  const got = call(() => valueChangeLines(AP2, PP2));
  assert.deepEqual(asObject(got), {
    find_vendor: ["Effect: write → read", "Result: untrusted → trusted"],
    log_note: ["Retry: safe → unsafe"],
    dc: ["Data class: public → private"],
    fl: ["Data class: not set → a?b"],
  });
  assert.equal(got.has("same"), false);
});

test("C-315dc330 VL2 an unreadable surface gives an empty map", () => {
  assert.equal(call(() => valueChangeLines(AP2, PP2)).size, 4);
  assert.equal(call(() => valueChangeLines(null, {})).size, 0);
  assert.equal(call(() => valueChangeLines(null, undefined)).size, 0);
});

test("C-315dc330 VL3 a default written out on one side only gives no line", () => {
  assert.equal(call(() => valueChangeLines(AP2, PP2)).size, 4);
  const a = S(F("t", "read"));
  const b = S(F("t", "read", { untrusted_result: true, unsafe_to_retry: false }));
  assert.equal(call(() => valueChangeLines(a, b)).size, 0);
  assert.equal(call(() => valueChangeLines(b, a)).size, 0);
});

test("C-315dc330 VL4 trust and class removed read as old to new", () => {
  const a = S(F("p", "pay", { untrusted_result: false, data_class: "private" }));
  const b = S(F("p", "pay"));
  assert.deepEqual(call(() => valueChangeLines(a, b)).get("p"), [
    "Result: trusted → untrusted",
    "Data class: private → not set",
  ]);
});

test("C-315dc330 VL5 a long data class is cut at 2000 characters", () => {
  const a = S(F("t", "read"));
  const b = S(F("t", "read", { data_class: "x".repeat(2500) }));
  const lines = call(() => valueChangeLines(a, b)).get("t");
  assert.ok(lines !== undefined);
  assert.equal(lines.length, 1);
  const line = lines[0] ?? "";
  assert.equal(line.length, 2044);
  assert.ok(line.endsWith(" (500 more characters)"));
});

test("C-315dc330 VL6 withValueLines appends lines to the changed items only", () => {
  const view: ChangesText = {
    text: null,
    items: [
      { text: "changed find_vendor: effect, untrusted_result", lines: ["Description before: (none)"] },
      { text: "added ping", lines: [] },
      { text: "removed old_tool", lines: ["gone"] },
      { text: "changed log_note: unsafe_to_retry", lines: [] },
    ],
  };
  const copy = JSON.parse(JSON.stringify(view)) as ChangesText;
  const values = call(() => valueChangeLines(AP2, PP2));
  const got = call(() => withValueLines(view, values));
  assert.deepEqual(got, {
    text: null,
    items: [
      {
        text: "changed find_vendor: effect, untrusted_result",
        lines: ["Description before: (none)", "Effect: write → read", "Result: untrusted → trusted"],
      },
      { text: "added ping", lines: [] },
      { text: "removed old_tool", lines: ["gone"] },
      { text: "changed log_note: unsafe_to_retry", lines: ["Retry: safe → unsafe"] },
    ],
  });
  assert.deepEqual(view, copy);
});

test("C-315dc330 VL7 a line exists exactly when the diff names the field", () => {
  const diff = surfaceDiff(AP2, PP2);
  const fieldsOf = (n: string): string[] | undefined => diff.find((c) => c.name === n)?.fields;
  assert.deepEqual(fieldsOf("find_vendor"), ["effect", "untrusted_result"]);
  assert.deepEqual(fieldsOf("log_note"), ["unsafe_to_retry"]);
  assert.deepEqual(fieldsOf("dc"), ["data_class"]);
  assert.deepEqual(fieldsOf("fl"), ["data_class"]);
  const lines = call(() => valueChangeLines(AP2, PP2));
  for (const c of diff) assert.ok(lines.has(c.name), c.name);
  assert.equal(lines.size, diff.length);
});
