// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { DataTableSpec } from "../kit/data/data-table.ts";

export const TOOL_PAGES: readonly {
  id: string;
  file: string;
  path: string;
  navLabel: string;
  capability: string;
}[] = [];

export const TOOL_TITLES: { servers: string; grants: string; policies: string } = {
  servers: "",
  grants: "",
  policies: "",
};

const EMPTY_TABLE: DataTableSpec = { caption: "", columns: [] };

export const TOOL_TABLES: Readonly<Record<"servers" | "tools" | "grants", DataTableSpec>> = {
  servers: EMPTY_TABLE,
  tools: EMPTY_TABLE,
  grants: EMPTY_TABLE,
};

export const TOOL_NAMES: Readonly<Record<string, string>> = {};

export type RegionLoad<T> =
  | { phase: "loading" }
  | { phase: "error"; error: unknown }
  | { phase: "ready"; value: T };

export function regionState<T>(
  _load: RegionLoad<T>,
  _isEmpty?: (value: T) => boolean,
): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean } {
  throw new Error("not implemented");
}

export type ActionPhase =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "done"; text: string }
  | { phase: "failed"; text: string };

export function actionState(_a: ActionPhase): {
  disabled: boolean;
  status: { role: "status" | "alert"; text: string } | null;
} {
  throw new Error("not implemented");
}
