// The editor panel "Graph" (design.md decisions 1 and 8).

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { Link } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import type { EditorPanelContext } from "../flows/editor-panels.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { FlowGraphView } from "./FlowGraphView.tsx";
import { graphView } from "./graph-model.ts";
import {
  GRAPH_LOADING,
  loadGraphDocument,
  settleGraphLoad,
} from "./graph-source.ts";
import type { GraphLoad } from "./graph-source.ts";
import { graphPath, needsDocument, versionNote } from "./pages.ts";

const RETRY_LABEL = "Try again";

function loadingLabel(): string {
  return GRAPH_LOADING.phase === "loading" ? GRAPH_LOADING.label : "Loading graph";
}

export function GraphPanel({ context }: { context: EditorPanelContext }): ReactNode {
  const { flowId, version, canonical } = context;
  const hash = version === null ? null : version.hash;
  const needs = needsDocument(version, canonical);
  const [load, setLoad] = useState<GraphLoad | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!needs || hash === null) return undefined;
    const controller = new AbortController();
    setLoad(GRAPH_LOADING);
    void (async () => {
      try {
        const settled = await settleGraphLoad(
          loadGraphDocument(browserSession.api, flowId, hash, controller.signal),
        );
        if (!controller.signal.aborted) setLoad(settled);
      } catch (error) {
        if (!controller.signal.aborted) {
          setLoad({ phase: "error", error, retryLabel: RETRY_LABEL });
        }
      }
    })();
    return () => {
      controller.abort();
    };
  }, [needs, flowId, hash, attempt]);

  const saved = (document: unknown, number: number, key: string): ReactNode => (
    <>
      <FlowGraphView
        key={key}
        view={graphView(document, true)}
        canonical={document}
        note={versionNote(number)}
      />
      <p>
        <Link to={graphPath(flowId)}>Open the graph on its own page</Link>
      </p>
    </>
  );

  if (version === null) {
    return <FlowGraphView key="none" view={graphView(null, false)} canonical={null} note={null} />;
  }

  if (!needs) {
    return saved(canonical, version.number, hash ?? "none");
  }

  if (load === null || load.phase === "loading") {
    return <LoadingState label={loadingLabel()} />;
  }

  if (load.phase === "error") {
    return (
      <>
        <ErrorPanel error={load.error} />
        <button
          type="button"
          className="ui-button"
          onClick={() => {
            setAttempt((count) => count + 1);
          }}
        >
          {load.retryLabel}
        </button>
      </>
    );
  }

  return saved(load.value, version.number, hash ?? "none");
}
