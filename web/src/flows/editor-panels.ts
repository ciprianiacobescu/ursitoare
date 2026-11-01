// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { ValidationView } from "./diagnostics.ts";
import type { VersionRow } from "./versions.ts";

export interface EditorPanelContext {
  flowId: string;
  text: string;
  version: VersionRow | null;
  canonical: unknown;
  result: ValidationView | null;
}

export interface EditorPanel {
  id: string;
  title: string;
  render: (context: EditorPanelContext) => ReactNode;
}

export interface EditorPanelRegistry {
  register(panel: EditorPanel): void;
  list(): readonly EditorPanel[];
}

export class EditorPanelError extends Error {
  readonly code: "EDITOR_PANEL_INVALID" | "EDITOR_PANEL_DUPLICATE";

  constructor(_code: EditorPanelError["code"], message: string) {
    super(message);
    throw new Error("not implemented");
  }
}

export function createEditorPanelRegistry(): EditorPanelRegistry {
  throw new Error("not implemented");
}

export function registerEditorPanel(_panel: EditorPanel): void {
  throw new Error("not implemented");
}

export function listEditorPanels(): readonly EditorPanel[] {
  throw new Error("not implemented");
}
