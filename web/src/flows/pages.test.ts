/// <reference types="node" />
import assert from "node:assert/strict";
import { test } from "node:test";

import { createFeatureRegistry } from "../app/features.ts";
import type { FeatureRegistry } from "../app/features.ts";
import { dataTableModel } from "../kit/data/data-table.ts";
import type { DataTableModel, DataTableSpec } from "../kit/data/data-table.ts";
import { FLOW_PAGES, FLOW_TABLES, flowFeatureLiterals } from "./pages.ts";
import type { FlowFeatureLiterals, FlowPage } from "./pages.ts";

assert.equal(typeof flowFeatureLiterals, "function");

const LITERAL_SOURCE =
  'export const feature = { id: "flow-editor", path: "/flows/:flowId", element: <FlowEditorPage /> };';

function modelFor(key: keyof typeof FLOW_TABLES): DataTableModel {
  let model: DataTableModel | undefined;
  assert.doesNotThrow(() => {
    model = dataTableModel(FLOW_TABLES[key]);
  }, `dataTableModel builds the ${key} table`);
  assert.ok(model !== undefined, `the ${key} table has a model`);
  return model;
}

test("C-1f5393c5 the flow pages are listed in order", () => {
  const expected: readonly FlowPage[] = [
    {
      id: "flows",
      file: "70-flows.tsx",
      path: "/flows",
      navLabel: "Flows",
      capability: "read_flow",
    },
    {
      id: "flow-editor",
      file: "71-flow-editor.tsx",
      path: "/flows/:flowId",
      navLabel: null,
      capability: null,
    },
  ];

  assert.deepEqual(FLOW_PAGES, expected, "the flow pages are listed in their order");
});

test("C-1f5393c5 the flow tables carry their captions columns and empty texts", () => {
  const expected: Record<keyof typeof FLOW_TABLES, DataTableSpec> = {
    flows: {
      caption: "Flows",
      columns: [
        { key: "flow", header: "Flow", rowHeader: true },
        { key: "ownerTeam", header: "Owner team" },
        { key: "versions", header: "Versions" },
        { key: "latest", header: "Latest version" },
      ],
      emptyTitle: "No flows yet",
      emptyDescription: "Create a flow above. You see the flows owned by your teams.",
    },
    versions: {
      caption: "Versions",
      columns: [
        { key: "number", header: "Number", rowHeader: true },
        { key: "state", header: "State" },
        { key: "saved", header: "Saved (UTC)" },
        { key: "author", header: "Author" },
        { key: "actions", header: "Actions" },
      ],
      emptyTitle: "No versions yet",
      emptyDescription: "Save the flow to create version 1.",
    },
  };

  for (const key of Object.keys(expected) as (keyof typeof FLOW_TABLES)[]) {
    const spec = expected[key];
    assert.deepEqual(FLOW_TABLES[key], spec, `the ${key} table is its spec`);
    const model = modelFor(key);
    assert.equal(model.caption, spec.caption, `the ${key} table has its caption`);
    assert.equal(model.emptyTitle, spec.emptyTitle, `the ${key} table has its empty title`);
    assert.equal(
      model.emptyDescription,
      spec.emptyDescription ?? null,
      `the ${key} table has its empty description`,
    );
  }
});

test("C-1f5393c5 the navigation follows the read flow capability", () => {
  const registry: FeatureRegistry = createFeatureRegistry();
  for (const page of FLOW_PAGES) {
    registry.register({
      id: page.id,
      path: page.path,
      ...(page.navLabel === null ? {} : { navLabel: page.navLabel }),
      ...(page.capability === null ? {} : { capability: page.capability }),
      element: null,
    });
  }

  assert.deepEqual(
    registry.nav(new Set(["read_flow"])),
    [{ id: "flows", path: "/flows", label: "Flows" }],
    "a reader of flows sees the Flows entry only",
  );
  assert.deepEqual(registry.nav(new Set()), [], "a user with no capability sees no entry");
});

test("C-1f5393c5 flowFeatureLiterals reads the literals of a feature file", () => {
  let literal: FlowFeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    literal = flowFeatureLiterals(LITERAL_SOURCE);
  }, "the sample feature text is read");
  assert.deepEqual(
    literal,
    {
      id: "flow-editor",
      path: "/flows/:flowId",
      navLabel: null,
      capability: null,
    },
    "the literals are read and the missing fields are null",
  );

  let missing: FlowFeatureLiterals | null | undefined;
  assert.doesNotThrow(() => {
    missing = flowFeatureLiterals("const x = 1");
  }, "a text without a feature is read");
  assert.equal(missing, null, "a text without a feature gives null");
});
