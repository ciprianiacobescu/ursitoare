// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { ReactNode } from "react";

import type { EditorHandle } from "./editor-mount.ts";

export interface CodeEditorProps {
  initialText: string;
  onChange: (text: string) => void;
  onReady: (handle: EditorHandle | null) => void;
}

export function CodeEditor(_props: CodeEditorProps): ReactNode {
  throw new Error("not implemented");
}
