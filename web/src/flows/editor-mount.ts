import { type Diagnostic, setDiagnostics } from "@codemirror/lint";
import type { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export interface EditorHandle {
  getText(): string;
  setText(text: string): void;
  setDiagnostics(items: readonly Diagnostic[]): void;
  select(from: number, to: number): void;
  focus(): void;
  destroy(): void;
}

export function mountEditor(host: HTMLElement, state: EditorState): EditorHandle {
  const root = host.attachShadow({ mode: "open" });
  const parent = document.createElement("div");
  root.appendChild(parent);
  const view = new EditorView({ state, parent, root });
  return {
    getText: () => view.state.doc.toString(),
    setText: (text) => {
      view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: text } });
    },
    setDiagnostics: (items) => {
      view.dispatch(setDiagnostics(view.state, [...items]));
    },
    select: (from, to) => {
      const length = view.state.doc.length;
      view.dispatch({
        selection: { anchor: Math.min(from, length), head: Math.min(to, length) },
        scrollIntoView: true,
      });
    },
    focus: () => {
      view.focus();
    },
    destroy: () => {
      view.destroy();
    },
  };
}
