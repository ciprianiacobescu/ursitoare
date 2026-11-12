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
  load: RegionLoad<T>,
  isEmpty?: (value: T) => boolean,
): { view: "loading" | "error" | "empty" | "ready"; actionsDisabled: boolean } {
  switch (load.phase) {
    case "loading":
      return { view: "loading", actionsDisabled: true };
    case "error":
      return { view: "error", actionsDisabled: true };
    case "ready":
      if (isEmpty !== undefined && isEmpty(load.value)) {
        return { view: "empty", actionsDisabled: false };
      }
      return { view: "ready", actionsDisabled: false };
    default:
      throw new RangeError("Unknown region phase");
  }
}

export type ActionPhase =
  | { phase: "idle" }
  | { phase: "busy" }
  | { phase: "done"; text: string }
  | { phase: "failed"; text: string };

export function actionState(a: ActionPhase): {
  disabled: boolean;
  status: { role: "status" | "alert"; text: string } | null;
} {
  switch (a.phase) {
    case "idle":
      return { disabled: false, status: null };
    case "busy":
      return { disabled: true, status: null };
    case "done":
      if (a.text === "") throw new RangeError("An action status needs a text");
      return { disabled: false, status: { role: "status", text: a.text } };
    case "failed":
      if (a.text === "") throw new RangeError("An action status needs a text");
      return { disabled: false, status: { role: "alert", text: a.text } };
    default:
      throw new RangeError("Unknown action phase");
  }
}
