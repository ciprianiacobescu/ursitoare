import type { DataTableSpec } from "../kit/data/data-table.ts";

export interface FlowPage {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

export const FLOW_PAGES: readonly FlowPage[] = [
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

export type FlowTables = Readonly<Record<"flows" | "versions", DataTableSpec>>;

export const FLOW_TABLES: FlowTables = {
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

export interface FlowFeatureLiterals {
  id: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

const FEATURE_MARKER = /\bexport\s+const\s+feature\b/;

function stringField(source: string, name: string): string | null {
  const match = new RegExp(`\\b${name}\\s*:\\s*"([^"]*)"`).exec(source);
  return match === null ? null : (match[1] ?? null);
}

export function flowFeatureLiterals(source: string): FlowFeatureLiterals | null {
  if (typeof source !== "string") {
    return null;
  }
  const marker = FEATURE_MARKER.exec(source);
  if (marker === null) {
    return null;
  }
  const block = source.slice(marker.index);
  const id = stringField(block, "id");
  const path = stringField(block, "path");
  if (id === null || path === null) {
    return null;
  }
  return {
    id,
    path,
    navLabel: stringField(block, "navLabel"),
    capability: stringField(block, "capability"),
  };
}
