// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { EditorPanelContext } from "../flows/editor-panels.ts";
import type { RunDocument } from "./input-form.ts";

export function useRunDocument(_context: EditorPanelContext): RunDocument {
  return { phase: "none" };
}
