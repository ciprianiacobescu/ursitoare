// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DataTableSpec } from "../kit/data/data-table.ts";

export interface FlowPage {
  id: string;
  file: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

export const FLOW_PAGES: readonly FlowPage[] = [];

export type FlowTables = Readonly<Record<"flows" | "versions", DataTableSpec>>;

export const FLOW_TABLES: FlowTables = {
  flows: { caption: "", columns: [] },
  versions: { caption: "", columns: [] },
};

export interface FlowFeatureLiterals {
  id: string;
  path: string;
  navLabel: string | null;
  capability: string | null;
}

export function flowFeatureLiterals(_source: string): FlowFeatureLiterals | null {
  throw new Error("not implemented");
}
