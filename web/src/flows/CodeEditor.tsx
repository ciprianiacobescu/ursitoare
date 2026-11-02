import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

import { createEditorState } from "./editor-config.ts";
import { mountEditor } from "./editor-mount.ts";
import type { EditorHandle } from "./editor-mount.ts";

export interface CodeEditorProps {
  initialText: string;
  onChange: (text: string) => void;
  onReady: (handle: EditorHandle | null) => void;
}

export function CodeEditor(props: CodeEditorProps): ReactNode {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onChange = useRef(props.onChange);
  const onReady = useRef(props.onReady);
  const initialText = useRef(props.initialText);
  onChange.current = props.onChange;
  onReady.current = props.onReady;

  useEffect(() => {
    const host = hostRef.current;
    if (host === null) return undefined;
    const handle = mountEditor(
      host,
      createEditorState(initialText.current, (text) => {
        onChange.current(text);
      }),
    );
    onReady.current(handle);
    return () => {
      onReady.current(null);
      handle.destroy();
    };
  }, []);

  return <div className="flow-editor-host" ref={hostRef} />;
}
