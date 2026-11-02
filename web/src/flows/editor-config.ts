import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { yaml } from "@codemirror/lang-yaml";
import { type Diagnostic, linter } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";
import { drawSelection, EditorView, keymap, lineNumbers } from "@codemirror/view";

import type { DiagnosticRow } from "./diagnostics.ts";
import { lineColumnOffset, pointerRange } from "./positions.ts";

export const EDITOR_LABEL: string = "Flow text";

export type EditorTheme = Readonly<Record<string, Readonly<Record<string, string>>>>;

export const EDITOR_THEME: EditorTheme = {
  "&": {
    color: "var(--ui-color-text)",
    backgroundColor: "var(--ui-color-surface)",
    fontSize: "var(--ui-font-size)",
  },
  ".cm-content": { fontFamily: "monospace", caretColor: "var(--ui-color-text)" },
  ".cm-scroller": { overflowX: "auto" },
  ".cm-gutters": {
    color: "var(--ui-color-text-muted)",
    backgroundColor: "var(--ui-color-bg)",
    borderRight: "1px solid var(--ui-color-border)",
  },
  "&.cm-focused": { outline: "var(--ui-focus-width) solid var(--ui-color-focus)" },
};

export function createEditorState(text: string, onChange: (text: string) => void): EditorState {
  return EditorState.create({
    doc: text,
    extensions: [
      lineNumbers(),
      history(),
      drawSelection(),
      EditorView.lineWrapping,
      yaml(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      linter(null),
      EditorView.theme(EDITOR_THEME),
      EditorView.contentAttributes.of({ "aria-label": EDITOR_LABEL, "aria-multiline": "true" }),
      EditorView.updateListener.of((update) => {
        if (update.docChanged) onChange(update.state.doc.toString());
      }),
    ],
  });
}

function lineEnd(text: string, from: number): number {
  const newline = text.indexOf("\n", from);
  return newline === -1 ? text.length : newline;
}

function rangeOf(text: string, row: DiagnosticRow): { from: number; to: number } {
  if (row.position !== null) {
    const from = lineColumnOffset(text, row.position.line, row.position.column);
    return { from, to: lineEnd(text, from) };
  }
  if (row.path !== null) return pointerRange(text, row.path);
  return { from: 0, to: lineEnd(text, 0) };
}

export function lintItems(text: string, rows: readonly DiagnosticRow[]): Diagnostic[] {
  return rows.map((row) => ({
    ...rangeOf(text, row),
    severity: row.severity,
    message: `${row.code}: ${row.message}`,
    source: row.code,
  }));
}
