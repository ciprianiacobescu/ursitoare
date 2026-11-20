// The graph page /flows/:flowId/graph (design.md decision 10).

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router";

import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { PAGE_WIDTHS } from "../kit/layout/layout.ts";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { Button } from "../ui/button.tsx";
import { cn } from "../ui/cn.ts";
import { FlowGraphView } from "./FlowGraphView.tsx";
import { graphView } from "./graph-model.ts";
import { GRAPH_LOADING, loadLatestGraph, settleGraphLoad } from "./graph-source.ts";
import type { GraphLoad, LatestGraph } from "./graph-source.ts";
import { versionNote } from "./pages.ts";

const RETRY_LABEL = "Try again";

function loadingLabel(): string {
  return GRAPH_LOADING.phase === "loading" ? GRAPH_LOADING.label : "Loading graph";
}

export function FlowGraphPage(): ReactNode {
  const params = useParams();
  const flowId = params["flowId"] ?? "";
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const [load, setLoad] = useState<GraphLoad | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const previous = document.title;
    document.title = `Graph of ${flowId} · Ursitoare`;
    return () => {
      document.title = previous;
    };
  }, [flowId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoad(GRAPH_LOADING);
    void (async () => {
      try {
        const settled = await settleGraphLoad(
          loadLatestGraph(browserSession.api, flowId, controller.signal),
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
  }, [flowId, attempt]);

  useEffect(() => {
    if (load !== null && load.phase !== "loading") headingRef.current?.focus();
  }, [load]);

  const latest =
    load !== null && load.phase === "ready" ? (load.value as LatestGraph) : null;

  return (
    <div className={cn("flow-page flex flex-col gap-4", PAGE_WIDTHS.list)}>
      <PageHeader title={`Graph of ${flowId}`} headingRef={headingRef} />
      {load === null || load.phase === "loading" ? (
        <LoadingState label={loadingLabel()} />
      ) : null}
      {load !== null && load.phase === "error" ? (
        <>
          <ErrorPanel error={load.error} />
          <Button
            onClick={() => {
              setAttempt((count) => count + 1);
            }}
          >
            {load.retryLabel}
          </Button>
        </>
      ) : null}
      {latest === null ? null : (
        <>
          <p>
            <Link to={`/flows/${flowId}`}>Back to the editor</Link>
          </p>
          <Section title="Graph">
            <FlowGraphView
              key={latest.version ?? "none"}
              view={graphView(latest.canonical, latest.saved)}
              canonical={latest.canonical}
              note={versionNote(latest.version)}
            />
          </Section>
        </>
      )}
    </div>
  );
}
