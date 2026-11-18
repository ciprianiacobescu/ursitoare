// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EditorPanel } from "./editor-panels.ts";

export interface WorkspacePanels {
  side: readonly EditorPanel[];
  below: readonly EditorPanel[];
}

export function splitPanels(_panels: readonly EditorPanel[]): WorkspacePanels {
  return { side: [], below: [] };
}

export interface JumpLink {
  id: string;
  label: string;
  href: string;
}

export function jumpLinks(_panels: WorkspacePanels): JumpLink[] {
  return [];
}

export function ownerTeamSuggestions(_teams: readonly string[]): {
  options: string[];
  prefill: string;
} {
  return { options: [], prefill: "" };
}
