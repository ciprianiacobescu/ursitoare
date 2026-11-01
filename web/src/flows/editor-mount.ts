// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Diagnostic } from "@codemirror/lint";
import type { EditorState } from "@codemirror/state";

export interface EditorHandle {
  getText(): string;
  setText(text: string): void;
  setDiagnostics(items: readonly Diagnostic[]): void;
  select(from: number, to: number): void;
  focus(): void;
  destroy(): void;
}

export function mountEditor(_host: HTMLElement, _state: EditorState): EditorHandle {
  throw new Error("not implemented");
}
