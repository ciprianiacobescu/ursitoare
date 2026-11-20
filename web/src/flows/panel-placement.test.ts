import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { createEditorPanelRegistry } from "./editor-panels.ts";
import type { EditorPanel } from "./editor-panels.ts";
import { splitPanels } from "./workspace.ts";

const GRAPH_FEATURE_URL = new URL("../features/75-flow-graph.tsx", import.meta.url);
const RUNS_FEATURE_URL = new URL("../features/80-runs.tsx", import.meta.url);

const render = (): null => null;

test("C-fde02d58 placement is read by splitPanels and a registry accepts a panel without it", () => {
  assert.equal(typeof splitPanels, "function");
  const registry = createEditorPanelRegistry();
  registry.register({ id: "x", title: "X", render });
  registry.register({ id: "y", title: "Y", render, placement: "side" });
  const listed = registry.list();
  assert.deepEqual(
    listed.map((p) => p.id),
    ["x", "y"],
  );
  assert.equal("placement" in (listed[0] as EditorPanel), false);
  const first = splitPanels(listed);
  assert.deepEqual(
    first.side.map((p) => p.id),
    ["y"],
  );
  assert.deepEqual(
    first.below.map((p) => p.id),
    ["x"],
  );

  registry.register({ id: "z", title: "Z", render, placement: "left" } as unknown as EditorPanel);
  assert.equal(registry.list().length, 3);
  const second = splitPanels(registry.list());
  assert.deepEqual(
    second.below.map((p) => p.id),
    ["x", "z"],
  );

  const graph = readFileSync(GRAPH_FEATURE_URL, "utf8");
  assert.ok(graph.includes("placement: \"side\""));
  assert.ok(graph.includes("GRAPH_PANEL"));
  const runs = readFileSync(RUNS_FEATURE_URL, "utf8");
  assert.equal(runs.split("registerEditorPanel(").length - 1, 2);
  assert.ok(!runs.includes("placement"));
});
