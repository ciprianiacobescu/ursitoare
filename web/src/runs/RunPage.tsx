import { useEffect, useId, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router";

import { ApiRequestError } from "../api/client.ts";
import { browserSession } from "../auth/browser-session.ts";
import { ErrorPanel } from "../kit/ErrorPanel.tsx";
import { LoadingState } from "../kit/LoadingState.tsx";
import { PageHeader } from "../kit/layout/PageHeader.tsx";
import { Section } from "../kit/layout/Section.tsx";
import { useDisplayNames } from "../people/use-names.ts";
import { Badge } from "../ui/badge.tsx";
import { formatAgo } from "../ui/format.ts";
import { Tooltip } from "../ui/tooltip.tsx";
import { registerCodeRenderer } from "./code-renderer.ts";
import { decisionsView, decisionsWanted, loadDecisions } from "./decisions.ts";
import type { DecisionLoad } from "./decisions.ts";
import { runPageView } from "./failures.ts";
import { hookRows, hookTraceNote } from "./hook-rows.ts";
import { runTitle } from "./pages.ts";
import { followRun } from "./polling.ts";
import type { RunSnapshot } from "./polling.ts";
import { createPreviewQueue, detailCell, previewRefs, runHeaderView, stepRowViews } from "./run-view.ts";
import { loadPayload } from "./runs-source.ts";
import { payloadShown, runErrorText, setPayloadLoad, stepDetailRows } from "./timeline.ts";
import type { PayloadLoad } from "./timeline.ts";

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
  const [snapshot, setSnapshot] = useState<RunSnapshot | null>(null);
  const [error, setError] = useState<unknown>(undefined);
  const [attempt, setAttempt] = useState(0);
  const [selectedSeq, setSelectedSeq] = useState<number | null>(null);
  const [loads, setLoads] = useState<Map<string, PayloadLoad>>(() => new Map());
  const [decisionLoad, setDecisionLoad] = useState<DecisionLoad | undefined>(undefined);
  const [decisionTry, setDecisionTry] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());

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
    setDecisionLoad(undefined);
    setDecisionTry(0);
    setNowMs(Date.now());
  }, [runId]);

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const result = await followRun(browserSession.api, runId, {
          signal: controller.signal,
          deadlineMs: Infinity,
          onUpdate: (next) => {
            if (!controller.signal.aborted) {
              setSnapshot(next);
              setNowMs(Date.now());
            }
          },
        });
        if (!controller.signal.aborted) {
          setSnapshot(result);
          setNowMs(Date.now());
        }
      } catch (failure) {
        if (!controller.signal.aborted && !isAbortError(failure)) setError(failure);
      }
    })();
    return () => {
      controller.abort();
    };
  }, [runId, attempt]);

  const view = runPageView(snapshot, error);

  const wanted = decisionsWanted(snapshot?.run ?? null);
  useEffect(() => {
    if (!wanted) return undefined;
    const controller = new AbortController();
    setDecisionLoad({ phase: "loading" });
    void loadDecisions(browserSession.api, runId, controller.signal).then(
      (result) => {
        if (!controller.signal.aborted) setDecisionLoad({ phase: "ready", ...result });
      },
      (failure: unknown) => {
        if (!controller.signal.aborted) setDecisionLoad({ phase: "error", error: failure });
      },
    );
    return () => {
      controller.abort();
    };
  }, [runId, wanted, decisionTry]);

  const decisions = decisionsView(snapshot?.run ?? null, snapshot?.steps ?? [], decisionLoad);

  const requestPayload = useMemo(() => {
    const controller = new AbortController();
    const requested = new Set<string>();
    return {
      controller,
      request(ref: string): Promise<void> {
        if (requested.has(ref)) return Promise.resolve();
        requested.add(ref);
        setLoads((current) => setPayloadLoad(current, ref, { phase: "loading" }));
        return loadPayload(browserSession.api, runId, ref, controller.signal).then(
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
      },
    };
  }, [runId]);

  useEffect(() => {
    return () => {
      requestPayload.controller.abort();
    };
  }, [requestPayload]);

  const steps = snapshot?.steps ?? [];
  const selectedStep =
    snapshot === null || selectedSeq === null
      ? null
      : (snapshot.steps.find((step) => step.seq === selectedSeq) ?? null);

  useEffect(() => {
    if (selectedStep === null) return;
    const refs = [selectedStep.inputRef, selectedStep.outputRef].filter(
      (ref): ref is string => ref !== null,
    );
    for (const ref of refs) void requestPayload.request(ref);
  }, [selectedStep, requestPayload]);

  const previewQueue = useMemo(
    () => createPreviewQueue((ref) => requestPayload.request(ref)),
    [requestPayload],
  );
  const previewKey = previewRefs(steps).join(",");
  useEffect(() => {
    if (previewKey === "") return;
    previewQueue.enqueue(previewKey.split(","));
  }, [previewQueue, previewKey]);

  const runState = snapshot?.run.state ?? "queued";
  const live = runState === "queued" || runState === "running";
  useEffect(() => {
    const period = live ? 1000 : 30000;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, period);
    return () => {
      clearInterval(timer);
    };
  }, [live]);

  const names = useDisplayNames(snapshot === null ? [] : [snapshot.run.principal.userId]);
  const header = snapshot === null ? null : runHeaderView(snapshot.run, names, nowMs);
  const stepRows =
    snapshot === null ? [] : stepRowViews(snapshot.steps, snapshot.run.state, loads, nowMs);

  const detailRows =
    selectedStep === null ? [] : stepDetailRows(selectedStep, snapshot?.run.state ?? "queued");
  const rows = selectedStep === null ? [] : hookRows(selectedStep);
  const note = selectedStep === null ? null : hookTraceNote(selectedStep);
  const runError = snapshot === null ? null : runErrorText(snapshot.run.error);

  return (
    <div className="runs-page">
      {view.loading ? <LoadingState label="Loading run" /> : null}
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
      {snapshot === null || header === null ? null : (
        <>
          <PageHeader
            title={`Run ${runId}`}
            meta={
              <>
                <p role="status" aria-label="Run state" data-tone={header.tone} className="runs-state">
                  {header.stateText}
                </p>
                <span className="runs-meta-item">
                  Flow <Link to={`/flows/${header.flowId}`}>{header.flowId}</Link>
                </span>
                <span className="runs-meta-item">{`Mode ${header.mode}`}</span>
                <span className="runs-meta-item">
                  Started by <span title={snapshot.run.principal.userId}>{header.startedBy}</span>
                </span>
                <span className="runs-meta-item">
                  <Tooltip content={header.started}>
                    <time dateTime={header.startedIso} tabIndex={0}>
                      {`Started ${formatAgo(header.startedIso, nowMs)}`}
                    </time>
                  </Tooltip>
                </span>
                <span className="runs-meta-item">{`Duration ${header.duration}`}</span>
              </>
            }
          />
          {runError === null ? null : <p className="runs-error-text">{runError}</p>}
          <div className="runs-layout">
            <Section title="Timeline">
              {stepRows.length === 0 ? <p>No steps yet.</p> : null}
              <ol className="runs-steps" aria-label="Steps">
                {stepRows.map((row) => (
                  <li className="runs-step" key={row.seq}>
                    <button
                      type="button"
                      className="ui-button runs-step-button"
                      aria-expanded={selectedSeq === row.seq}
                      aria-controls={detailsId}
                      onClick={() => {
                        setSelectedSeq(row.seq);
                      }}
                    >
                      {row.nodeId}
                    </button>
                    <Badge tone={row.tone}>{row.state}</Badge>
                    <span className="runs-step-duration">{row.duration}</span>
                    <span className="runs-step-text">{row.text}</span>
                    {row.preview === null ? null : <p className="runs-preview">{row.preview}</p>}
                  </li>
                ))}
              </ol>
              {snapshot.truncated ? <p>Showing the first 1,000 steps.</p> : null}
            </Section>
            <Section title="Step details" id={detailsId}>
              {selectedStep === null ? (
                <p>Choose a step to see its details.</p>
              ) : (
                <>
                  <dl className="runs-details">
                    {detailRows.map((row, index) => {
                      const cell = detailCell(row);
                      return (
                        <div className="runs-detail-row" key={`${row.term}-${String(index)}`}>
                          <dt>{row.term}</dt>
                          <dd>
                            {row.href === null ? (
                              cell.iso === null ? (
                                cell.text
                              ) : (
                                <time dateTime={cell.iso} title={cell.iso}>
                                  {cell.text}
                                </time>
                              )
                            ) : (
                              <a href={row.href} target="_blank" rel="noopener noreferrer">
                                {`Decision ${row.value} (opens in a new tab)`}
                              </a>
                            )}
                          </dd>
                        </div>
                      );
                    })}
                  </dl>
                  {rows.length === 0 && note === null ? null : (
                    <Section title="Hooks" headingLevel={3} className="runs-flat">
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
                    </Section>
                  )}
                  <Section title="Input" headingLevel={3} className="runs-flat">
                    <pre>
                      {payloadShown(selectedStep.inputRef, loads.get(selectedStep.inputRef ?? ""))}
                    </pre>
                  </Section>
                  <Section title="Output" headingLevel={3} className="runs-flat">
                    <pre>
                      {payloadShown(selectedStep.outputRef, loads.get(selectedStep.outputRef ?? ""))}
                    </pre>
                  </Section>
                </>
              )}
            </Section>
            {decisions.kind === "hidden" ? null : (
              <Section title="Policy decisions">
                {decisions.kind === "loading" ? (
                  <LoadingState label="Loading policy decisions" />
                ) : null}
                {decisions.kind === "error" ? (
                  <>
                    <p>{decisions.message}</p>
                    <button
                      type="button"
                      className="ui-button"
                      onClick={() => {
                        setDecisionLoad({ phase: "loading" });
                        setDecisionTry((count) => count + 1);
                      }}
                    >
                      Try again
                    </button>
                  </>
                ) : null}
                {decisions.kind === "empty" ? <p>{decisions.text}</p> : null}
                {decisions.kind === "rows" ? (
                  <>
                    <ul className="runs-hook-list" aria-label="Policy decisions">
                      {decisions.rows.map((row, index) => (
                        <li key={`${row.nodeId}-${String(index)}`}>
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
                    {decisions.note === null ? null : <p>{decisions.note}</p>}
                  </>
                ) : null}
              </Section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
