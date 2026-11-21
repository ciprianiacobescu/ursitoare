import { useEffect, useState } from "react";

import { browserSession } from "../auth/browser-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { loadRunDocument, runDocumentWanted } from "./input-form.ts";
import type { RunDocument } from "./input-form.ts";

export function useRunDocument(context: EditorPanelContext): RunDocument {
  const { flowId, version, canonical } = context;
  const hash = version === null ? null : version.hash;
  const wanted = runDocumentWanted(version, canonical);
  const [loaded, setLoaded] = useState<{ hash: string; document: RunDocument } | null>(null);

  useEffect(() => {
    if (!wanted || hash === null) return undefined;
    const controller = new AbortController();
    loadRunDocument(browserSession.api, flowId, hash, controller.signal).then(
      (document) => {
        if (!controller.signal.aborted) setLoaded({ hash, document: { phase: "ready", canonical: document } });
      },
      () => {
        if (!controller.signal.aborted) setLoaded({ hash, document: { phase: "failed" } });
      },
    );
    return () => controller.abort();
  }, [wanted, flowId, hash]);

  if (version === null) return { phase: "none" };
  if (!wanted) return { phase: "ready", canonical };
  if (loaded !== null && loaded.hash === hash) return loaded.document;
  return { phase: "loading" };
}
