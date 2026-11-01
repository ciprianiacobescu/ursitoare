// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Diagnostic } from "@codemirror/lint";
import type { EditorState } from "@codemirror/state";

import type { DiagnosticRow } from "./diagnostics.ts";

export const EDITOR_LABEL: string = "";

export type EditorTheme = Readonly<Record<string, Readonly<Record<string, string>>>>;

export const EDITOR_THEME: EditorTheme = {};

export function createEditorState(_text: string, _onChange: (text: string) => void): EditorState {
  throw new Error("not implemented");
}

export function lintItems(_text: string, _rows: readonly DiagnosticRow[]): Diagnostic[] {
  throw new Error("not implemented");
}
