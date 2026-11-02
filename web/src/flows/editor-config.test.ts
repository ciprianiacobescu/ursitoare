/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { EditorView, keymap } from "@codemirror/view";

import { findRawColours } from "../kit/contrast.ts";
import type { DiagnosticRow } from "./diagnostics.ts";
import { createEditorState, EDITOR_LABEL, EDITOR_THEME, lintItems } from "./editor-config.ts";
import { pointerRange } from "./positions.ts";

assert.equal(typeof lintItems, "function");

const T = 'flow: x\nnodes:\n  a:\n    uses: "k.b@1"\n    tools:\n      - z\n';

function row(
  key: string,
  severity: "error" | "warning",
  code: string,
  message: string,
  path: string | null,
  position: { line: number; column: number } | null,
): DiagnosticRow {
  return { key, severity, code, message, where: "w", href: null, linkText: null, path, position };
}

test("C-944fd4d1 lintItems turns rows into marks in row order", () => {
  const rows = [
    row("text:0", "error", "FORMAT_YAML_SYNTAX", "Unexpected end", null, { line: 2, column: 1 }),
    row("error:0", "error", "L2_UNKNOWN_BLOCK", "no block", "/nodes/a/uses", null),
    row("warning:0", "warning", "W_X", "careful", "/nodes", null),
    row("warning:1", "warning", "W_Y", "whole", null, null),
  ];
  let items: ReturnType<typeof lintItems> = [];
  assert.doesNotThrow(() => {
    items = lintItems(T, rows);
  });
  assert.equal(items.length, 4);
  assert.deepEqual(
    items.map((item) => ({ severity: item.severity, message: item.message, source: item.source })),
    [
      { severity: "error", message: "FORMAT_YAML_SYNTAX: Unexpected end", source: "FORMAT_YAML_SYNTAX" },
      { severity: "error", message: "L2_UNKNOWN_BLOCK: no block", source: "L2_UNKNOWN_BLOCK" },
      { severity: "warning", message: "W_X: careful", source: "W_X" },
      { severity: "warning", message: "W_Y: whole", source: "W_Y" },
    ],
  );
  assert.deepEqual({ from: items[0]?.from, to: items[0]?.to }, { from: 8, to: 14 });
  const uses = pointerRange(T, "/nodes/a/uses");
  assert.deepEqual({ from: items[1]?.from, to: items[1]?.to }, uses);
  const nodes = pointerRange(T, "/nodes");
  assert.deepEqual({ from: items[2]?.from, to: items[2]?.to }, nodes);
  assert.deepEqual({ from: items[3]?.from, to: items[3]?.to }, { from: 0, to: 7 });
});

test("C-84837cec the editor state holds the text, the label and no Tab binding", () => {
  assert.equal(EDITOR_LABEL, "Flow text");
  let state: ReturnType<typeof createEditorState> | undefined;
  assert.doesNotThrow(() => {
    state = createEditorState("a: 1\n", () => undefined);
  });
  assert.ok(state !== undefined, "a state was built");
  assert.equal(state?.doc.toString(), "a: 1\n");
  const attributes = (state?.facet(EditorView.contentAttributes) ?? []).map((item) =>
    typeof item === "function" ? {} : item,
  );
  assert.ok(attributes.some((item) => item["aria-label"] === "Flow text"));
  assert.ok(attributes.some((item) => item["aria-multiline"] === "true"));
  const bindings = (state?.facet(keymap) ?? []).flat();
  assert.ok(bindings.length > 0, "default keys are bound");
  for (const binding of bindings) {
    for (const key of [binding.key, binding.mac, binding.win, binding.linux]) {
      assert.ok(!(key ?? "").includes("Tab"), `${key ?? ""} does not trap focus`);
    }
  }
});

test("C-84837cec the theme uses no raw colours and only var tokens", () => {
  const rules = Object.entries(EDITOR_THEME);
  assert.ok(rules.length > 0, "the theme has rules");
  const css = rules
    .map(([selector, declarations]) => {
      const lines = Object.entries(declarations).map(([p, v]) => `  ${p}: ${v};`);
      return `${selector} {\n${lines.join("\n")}\n}`;
    })
    .join("\n");
  assert.deepEqual(findRawColours(css), []);
  assert.ok(/var\(--/.test(css), "the theme uses tokens");
});
