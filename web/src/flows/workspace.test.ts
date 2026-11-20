import assert from "node:assert/strict";
import { test } from "node:test";

import type { EditorPanel } from "./editor-panels.ts";
import { jumpLinks, ownerTeamSuggestions, splitPanels } from "./workspace.ts";

const render = (): null => null;

function panel(id: string, title: string, placement?: string): EditorPanel {
  if (placement === undefined) {
    return { id, title, render };
  }
  return { id, title, render, placement } as EditorPanel;
}

test("C-2c9ef2b6 splitPanels keeps the registration order within side and below", () => {
  assert.equal(typeof splitPanels, "function");
  const input = [panel("a", "A", "side"), panel("b", "B"), panel("c", "C", "below"), panel("d", "D", "side")];
  const split = splitPanels(input);
  assert.deepEqual(
    split.side.map((p) => p.id),
    ["a", "d"],
  );
  assert.deepEqual(
    split.below.map((p) => p.id),
    ["b", "c"],
  );
  assert.equal(input.length, 4);
  assert.deepEqual(splitPanels([]), { side: [], below: [] });
  const odd = splitPanels([panel("o", "O", "left")]);
  assert.deepEqual(
    odd.below.map((p) => p.id),
    ["o"],
  );
  assert.equal(odd.side.length, 0);
});

test("C-48e39912 jumpLinks lists the index in page order", () => {
  assert.equal(typeof jumpLinks, "function");
  const split = splitPanels([
    panel("graph", "Graph", "side"),
    panel("test-run", "Test run"),
    panel("dry-run", "Dry run"),
  ]);
  const links = jumpLinks(split);
  assert.deepEqual(links, [
    { id: "editor", label: "Editor", href: "#flow-editor" },
    { id: "diagnostics", label: "Diagnostics", href: "#flow-diagnostics" },
    { id: "graph", label: "Graph", href: "#flow-panel-graph" },
    { id: "versions", label: "Versions", href: "#flow-versions" },
    { id: "test-run", label: "Test run panel", href: "#flow-panel-test-run" },
    { id: "dry-run", label: "Dry run panel", href: "#flow-panel-dry-run" },
  ]);
  const empty = jumpLinks({ side: [], below: [] });
  assert.deepEqual(
    empty.map((l) => l.label),
    ["Editor", "Diagnostics", "Versions"],
  );
  const nav = [
    "Home",
    "Users",
    "Roles and teams",
    "Group mappings",
    "Audit log",
    "Tool servers",
    "Grants",
    "Policies",
    "Flows",
    "Runs",
  ];
  assert.ok(links.length > 0);
  for (const link of links) {
    assert.ok(!nav.includes(link.label));
  }
});

test("C-2aa2aa19 ownerTeamSuggestions sorts, drops and prefills", () => {
  assert.equal(typeof ownerTeamSuggestions, "function");
  assert.deepEqual(ownerTeamSuggestions([]), { options: [], prefill: "" });
  assert.deepEqual(ownerTeamSuggestions(["finance"]), { options: ["finance"], prefill: "finance" });
  assert.deepEqual(ownerTeamSuggestions(["ops", "finance", "ops"]), { options: ["finance", "ops"], prefill: "" });
  const long64 = "a".repeat(64);
  const mixed = ownerTeamSuggestions(["Finance", "a b", "", "9x", "a".repeat(65), "finance", "ops", long64]);
  assert.deepEqual(mixed.options, [long64, "finance", "ops"]);
  assert.equal(mixed.options[0]?.length, 64);
  assert.equal(mixed.prefill, "");
  assert.deepEqual(ownerTeamSuggestions(["ab", "a_b", "a-b"]), { options: ["a-b", "a_b", "ab"], prefill: "" });
  assert.deepEqual(ownerTeamSuggestions(["Finance"]), { options: [], prefill: "" });
});
