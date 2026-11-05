import { stepRendererFor } from "./step-renderers.ts";
import type { PayloadValue, RunError, RunState, StepState, StepView } from "./types.ts";
import { runErrorMessage } from "./messages.ts";

export interface DetailRow {
  term: string;
  value: string;
  href: string | null;
}

export type PayloadLoad =
  | { phase: "loading" }
  | { phase: "ready"; value: PayloadValue }
  | { phase: "error"; error: unknown };

const TERMINAL_RUN_STATES: readonly RunState[] = ["completed", "failed", "cancelled"];
const LIVE_RUN_STATES: readonly RunState[] = ["queued", "running"];
const DECISION_ID_PATTERN = /^[A-Za-z0-9_.:-]{1,128}$/;

function stateText(state: StepState, runState: RunState): string {
  const { label, note } = stepStateLabel(state, runState);
  return note === null ? label : `${label} (${note})`;
}

export function stepStateLabel(
  state: StepState,
  runState: RunState,
): { label: string; note: string | null } {
  if (state === "started") {
    if (TERMINAL_RUN_STATES.includes(runState)) {
      return { label: "Interrupted", note: "Not finalized" };
    }
    if (LIVE_RUN_STATES.includes(runState)) {
      return { label: "running", note: null };
    }
  }
  return { label: state, note: null };
}

export function timelineItems(
  steps: readonly StepView[],
  runState: RunState,
): { seq: number; nodeId: string; text: string }[] {
  return [...steps]
    .sort((a, b) => a.seq - b.seq)
    .map((step) => ({
      seq: step.seq,
      nodeId: step.nodeId,
      text: `${stepRendererFor(step.kind).label(step)} · ${stateText(step.state, runState)}`,
    }));
}

export function stepDetailRows(step: StepView, runState: RunState): DetailRow[] {
  const rows: DetailRow[] = [
    { term: "Node", value: step.nodeId, href: null },
    { term: "Kind", value: step.kind, href: null },
    { term: "State", value: stateText(step.state, runState), href: null },
    { term: "Outcome", value: step.outcome ?? "none", href: null },
    { term: "Started", value: step.startedAt, href: null },
    { term: "Ended", value: step.endedAt ?? "not ended", href: null },
    ...stepRendererFor(step.kind).details(step).map((row) => ({
      term: row.term,
      value: row.value,
      href: null,
    })),
  ];
  if (step.error !== null) {
    rows.push({
      term: "Error",
      value: `${step.error.code}: ${step.error.message}`,
      href: null,
    });
  }
  if (step.policyDecisionId !== null) {
    rows.push({
      term: "Decision",
      value: step.policyDecisionId,
      href: decisionHref(step.policyDecisionId),
    });
  }
  return rows;
}

export function decisionHref(decisionId: string): string | null {
  if (!DECISION_ID_PATTERN.test(decisionId)) return null;
  return `/api/v1/policy-decisions?decision_id=${encodeURIComponent(decisionId)}`;
}

export function runErrorText(error: RunError | null): string | null {
  if (error === null) return null;
  const base = `${error.code}: ${error.message}`;
  return error.node === null ? base : `${base} (at ${error.node})`;
}

export function payloadShown(ref: string | null, load: PayloadLoad | undefined): string {
  if (ref === null) return "none";
  if (load === undefined || load.phase === "loading") return "Loading";
  if (load.phase === "ready") return JSON.stringify(load.value, null, 2);
  return runErrorMessage(load.error);
}

export function setPayloadLoad(
  loads: ReadonlyMap<string, PayloadLoad>,
  digest: string,
  load: PayloadLoad,
): Map<string, PayloadLoad> {
  const next = new Map(loads);
  next.set(digest, load);
  return next;
}
