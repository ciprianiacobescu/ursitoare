import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { useParams } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { registerCodeRenderer } from "./code-renderer.ts";
import { runPageView } from "./failures.ts";
import { hookRows, hookTraceNote } from "./hook-rows.ts";
import { runTitle } from "./pages.ts";
import { followRun } from "./polling.ts";
import type { RunSnapshot } from "./polling.ts";
import { loadPayload } from "./runs-source.ts";
import {
  payloadShown,
  runErrorText,
  setPayloadLoad,
  stepDetailRows,
  timelineItems,
} from "./timeline.ts";
import type { PayloadLoad } from "./timeline.ts";
import "./runs.css";
import "./hooks.css";

registerCodeRenderer();

function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: unknown }).name === "AbortError"
  );
}

function panelError(error: unknown): unknown {
  if (error instanceof RangeError) {
    return new ApiRequestError(404, "NOT_FOUND", "Not found");
  }
  return error;
}

export function RunPage(): ReactNode {
  const params = useParams();
  const runId = params["runId"] ?? "";
  const detailsId = useId();
  const hooksId = useId();
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState<unknown>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [loads, setLoads] = useState<Map<string, PayloadLoad>>(() => new Map());

  useEffect(() => {
    const previous = document.title;
    document.title = runTitle(runId);
    return () => {
      document.title = previous;
    };
  }, [runId]);

  useEffect(() => {
    setSnapshot(null);
    setError(undefined);
    setSelectedSeq(null);
    setLoads(new Map());
  }, [runId]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await followRun(browserSession.api, runId, {
          signal: controller.signal,
          deadlineMs: Infinity,
          onUpdate: (next) => {
            if (!controller.signal.aborted) setSnapshot(next);
          },
        });
        if (!controller.signal.aborted) setSnapshot(result);
      } catch (failure) {
        if (!controller.signal.aborted && !isAbortError(failure)) setError(failure);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [runId, attempt]);

  const view = runPageView(snapshot, error);

  const steps = snapshot?.steps ?? [];
  const items = useMemo(
    () => timelineItems(steps, snapshot?.run.state ?? "queued"),
    [steps, snapshot?.run.state],
  );
  const selectedStep =
    snapshot === null || selectedSeq === null
      ? null
      : (snapshot.steps.find((step) => step.seq === selectedSeq) ?? null);

  useEffect(() => {
    if (selectedStep === null) return undefined;
    const refs = [selectedStep.inputRef, selectedStep.outputRef].filter(
      (ref): ref is string => ref !== null,
    );
    const missing = refs.filter((ref) => !loads.has(ref));
    if (missing.length === 0) return undefined;
    const controller = new AbortController();
    for (const ref of missing) {
      setLoads((current) => setPayloadLoad(current, ref, { phase: "loading" }));
      void loadPayload(browserSession.api, runId, ref, controller.signal).then(
        (payload) => {
          if (!controller.signal.aborted) {
            setLoads((current) =>
              setPayloadLoad(current, ref, { phase: "ready", value: payload.data }),
            );
          }
        },
        (failure: unknown) => {
          if (!controller.signal.aborted) {
            setLoads((current) => setPayloadLoad(current, ref, { phase: "error", error: failure }));
          }
        },
      );
    }
    return () => {
      controller.abort();
    };
  }, [selectedStep, runId]);

  const detailRows = selectedStep === null ? [] : stepDetailRows(selectedStep, snapshot?.run.state ?? "queued");
  const rows = selectedStep === null ? [] : hookRows(selectedStep);
  const note = selectedStep === null ? null : hookTraceNote(selectedStep);
  const runError = snapshot === null ? null : runErrorText(snapshot.run.error);

  return (
    <div className="runs-page">
      <h1>{`Run ${runId}`}</h1>
      {view.loading ? <LoadingState label="Loading run" /> : null}
      {view.snapshot === null ? null : (
        <>
          <p role="status" aria-label="Run state">{`State: ${view.snapshot.run.state}`}</p>
          <p>{`Flow ${view.snapshot.run.flowId} · ${view.snapshot.run.mode} · started by ${view.snapshot.run.principal.userId}`}</p>
          {runError === null ? null : <p className="runs-error-text">{runError}</p>}
        </>
      )}
      {view.failure === null ? null : (
        <div className="runs-failure">
          <ErrorPanel error={panelError(error)} />
          <button
            type="button"
            className="ui-button"
            onClick={() => {
              setError(undefined);
              setAttempt((count) => count + 1);
            }}
          >
            {view.failure.retryLabel}
          </button>
        </div>
      )}
      {view.snapshot === null ? null : (
        <>
          <section className="runs-section" aria-labelledby={`${detailsId}-timeline`}>
            <h2 id={`${detailsId}-timeline`}>Timeline</h2>
            {items.length === 0 ? <p>No steps yet.</p> : null}
            <ol className="runs-steps" aria-label="Steps">
              {items.map((item) => (
                <li key={item.seq}>
                  <button
                    type="button"
                    className="ui-button runs-step-button"
                    aria-expanded={selectedSeq === item.seq}
                    aria-controls={detailsId}
                    onClick={() => {
                      setSelectedSeq(item.seq);
                    }}
                  >
                    {item.nodeId}
                  </button>{" "}
                  <span>{item.text}</span>
                </li>
              ))}
            </ol>
            {view.snapshot.truncated ? <p>Showing the first 1,000 steps.</p> : null}
          </section>
          <section
            className="runs-section"
            id={detailsId}
            aria-labelledby={`${detailsId}-details`}
          >
            <h2 id={`${detailsId}-details`}>Step details</h2>
            {selectedStep === null ? (
              <p>Choose a step to see its details.</p>
            ) : (
              <>
                <dl className="runs-details">
                  {detailRows.map((row, index) => (
                    <div className="runs-detail-row" key={`${row.term}-${String(index)}`}>
                      <dt>{row.term}</dt>
                      <dd>
                        {row.href === null ? (
                          row.value
                        ) : (
                          <a href={row.href} target="_blank" rel="noopener noreferrer">
                            {`Decision ${row.value} (opens in a new tab)`}
                          </a>
                        )}
                      </dd>
                    </div>
                  ))}
                </dl>
                {rows.length === 0 && note === null ? null : (
                  <section className="runs-hooks" aria-labelledby={hooksId}>
                    <h3 id={hooksId}>Hooks</h3>
                    {rows.length === 0 ? (
                      <p>{note}</p>
                    ) : (
                      <ul className="runs-hook-list" aria-label="Hooks">
                        {rows.map((row, index) => (
                          <li key={`${row.label}-${String(index)}`}>
                            {row.text}
                            <dl className="runs-hook-details">
                              {row.details.map((detail) => (
                                <div className="runs-detail-row" key={detail.term}>
                                  <dt>{detail.term}</dt>
                                  <dd>{detail.value}</dd>
                                </div>
                              ))}
                            </dl>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                )}
                <section className="runs-payload" aria-labelledby={`${detailsId}-input`}>
                  <h3 id={`${detailsId}-input`}>Input</h3>
                  <pre>{payloadShown(selectedStep.inputRef, loads.get(selectedStep.inputRef ?? ""))}</pre>
                </section>
                <section className="runs-payload" aria-labelledby={`${detailsId}-output`}>
                  <h3 id={`${detailsId}-output`}>Output</h3>
                  <pre>{payloadShown(selectedStep.outputRef, loads.get(selectedStep.outputRef ?? ""))}</pre>
                </section>
              </>
            )}
          </section>
        </>
      )}
    </div>
  );
}
