/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  createEditorPanelRegistry,
  EditorPanelError,
  listEditorPanels,
  registerEditorPanel,
  type EditorPanel,
} from "./editor-panels.ts";

assert.equal(typeof createEditorPanelRegistry, "function");

const render = () => null;

function codeOf(run: () => void): unknown {
  try {
    run();
  } catch (error) {
    return error instanceof EditorPanelError ? error.code : String(error);
  }
  return "no error";
}

test("C-159129bd: a valid panel registers and list returns it", () => {
  assert.doesNotThrow(() => {
    const registry = createEditorPanelRegistry();
    const panel: EditorPanel = { id: "graph", title: "Graph", render };
    registry.register(panel);
    assert.deepEqual(registry.list(), [panel]);
  });
});

test("C-159129bd: a duplicate id is EDITOR_PANEL_DUPLICATE", () => {
  assert.doesNotThrow(() => {
    const registry = createEditorPanelRegistry();
    registry.register({ id: "graph", title: "Graph", render });
    assert.equal(codeOf(() => registry.register({ id: "graph", title: "Other", render })), "EDITOR_PANEL_DUPLICATE");
    assert.equal(registry.list().length, 1);
  });
});

test("C-159129bd: invalid ids, titles and render are EDITOR_PANEL_INVALID", () => {
  assert.doesNotThrow(() => {
    const registry = createEditorPanelRegistry();
    const bad: unknown[] = [
      { id: "Bad Id", title: "T", render },
      { id: "", title: "T", render },
      { id: "ok", title: "", render },
      { id: "ok", title: "a".repeat(61), render },
      { id: "ok", title: "T", render: "no" },
    ];
    for (const panel of bad) {
      assert.equal(codeOf(() => registry.register(panel as EditorPanel)), "EDITOR_PANEL_INVALID");
    }
    assert.deepEqual(registry.list(), []);
    registry.register({ id: "a".repeat(40), title: "a".repeat(60), render });
    assert.equal(registry.list().length, 1);
  });
});

test("C-159129bd: mutating the returned list does not change the registry", () => {
  assert.doesNotThrow(() => {
    const registry = createEditorPanelRegistry();
    const panel: EditorPanel = { id: "graph", title: "Graph", render };
    registry.register(panel);
    (registry.list() as EditorPanel[]).push({ id: "x", title: "X", render });
    assert.deepEqual(registry.list(), [panel]);
  });
});

test("C-159129bd: the default registry is shared and keeps registration order", () => {
  assert.doesNotThrow(() => {
    registerEditorPanel({ id: "first-shared", title: "First", render });
    registerEditorPanel({ id: "second-shared", title: "Second", render });
    const ids = listEditorPanels().map((p) => p.id);
    assert.deepEqual(ids, ["first-shared", "second-shared"]);
  });
});
