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

  constructor(code: EditorPanelError["code"], message: string) {
    super(message);
    this.name = "EditorPanelError";
    this.code = code;
  }
}

const PANEL_ID = /^[a-z][a-z0-9-]{0,39}$/;

export function createEditorPanelRegistry(): EditorPanelRegistry {
  const panels: EditorPanel[] = [];
  return {
    register(panel: EditorPanel): void {
      if (
        typeof panel !== "object" ||
        panel === null ||
        typeof panel.id !== "string" ||
        !PANEL_ID.test(panel.id) ||
        typeof panel.title !== "string" ||
        panel.title.length < 1 ||
        panel.title.length > 60 ||
        typeof panel.render !== "function"
      ) {
        throw new EditorPanelError("EDITOR_PANEL_INVALID", "The editor panel is not valid.");
      }
      if (panels.some((p) => p.id === panel.id)) {
        throw new EditorPanelError("EDITOR_PANEL_DUPLICATE", `The editor panel ${panel.id} is already registered.`);
      }
      panels.push(panel);
    },
    list(): readonly EditorPanel[] {
      return [...panels];
    },
  };
}

const defaultRegistry = createEditorPanelRegistry();

export function registerEditorPanel(panel: EditorPanel): void {
  defaultRegistry.register(panel);
}

export function listEditorPanels(): readonly EditorPanel[] {
  return defaultRegistry.list();
}
