// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { personLabel } from "../people/people.ts";
import { formatAgo, formatDuration, formatInstant } from "../ui/format.ts";
import { runStateTone, stepStateTone } from "../ui/tones.ts";
import type { Tone } from "../ui/tones.ts";
import { runLinkName } from "./pages.ts";
import { stepStateLabel, timelineItems } from "./timeline.ts";
import type { PayloadLoad } from "./timeline.ts";
import type { RunState, RunView, StepView } from "./types.ts";

const DASH = "—";

const FINISHED_RUN_STATES: readonly RunState[] = ["completed", "failed", "cancelled"];

function runDuration(run: RunView, startedIso: string, nowMs: number): string {
  if (run.endedAt === null && FINISHED_RUN_STATES.includes(run.state)) return DASH;
  return formatDuration(startedIso, run.endedAt, nowMs);
}

export interface RunHeaderView {
  stateText: string;
  tone: Tone;
  flowId: string;
  mode: string;
  startedBy: string;
  started: string;
  startedIso: string;
  duration: string;
}

export function runHeaderView(
  run: RunView,
  names: ReadonlyMap<string, string>,
  nowMs: number,
): RunHeaderView {
  const startedIso = run.startedAt ?? run.createdAt;
  return {
    stateText: `State: ${run.state}`,
    tone: runStateTone(run.state),
    flowId: run.flowId,
    mode: run.mode,
    startedBy: personLabel(names, run.principal.userId),
    started: formatInstant(startedIso),
    startedIso,
    duration: runDuration(run, startedIso, nowMs),
  };
}

export interface StepRowView {
  seq: number;
  nodeId: string;
  text: string;
  state: string;
  tone: Tone;
  duration: string;
  preview: string | null;
}

export function stepRowViews(
  steps: readonly StepView[],
  runState: RunState,
  loads: ReadonlyMap<string, PayloadLoad>,
  nowMs: number,
): StepRowView[] {
  const finished = FINISHED_RUN_STATES.includes(runState);
  const texts = new Map(timelineItems(steps, runState).map((item) => [item.seq, item.text]));
  const ordered = [...steps].sort((a, b) => a.seq - b.seq);
  const rows: StepRowView[] = [];
  let withOutput = 0;
  for (const step of ordered) {
    let preview: string | null = null;
    if (step.outputRef !== null) {
      withOutput += 1;
      if (withOutput <= PREVIEW_STEP_LIMIT) {
        preview = outputPreview(step.outputRef, loads.get(step.outputRef));
      }
    }
    const interrupted = step.state === "started" && finished;
    rows.push({
      seq: step.seq,
      nodeId: step.nodeId,
      text: texts.get(step.seq) ?? "",
      state: stepStateLabel(step.state, runState).label,
      tone: interrupted ? "warning" : stepStateTone(step.state),
      duration:
        step.endedAt === null && finished
          ? DASH
          : formatDuration(step.startedAt, step.endedAt, nowMs),
      preview,
    });
  }
  return rows;
}

export const PREVIEW_CHARS = 120;
export const PREVIEW_STEP_LIMIT = 50;
export const PREVIEW_CONCURRENCY = 4;

export function outputPreview(ref: string | null, load: PayloadLoad | undefined): string | null {
  if (ref === null) return null;
  if (load === undefined || load.phase === "loading") return "Loading output…";
  if (load.phase === "error") return "Output not loaded.";
  const text = JSON.stringify(load.value) ?? "null";
  const points = Array.from(text);
  if (points.length <= PREVIEW_CHARS) return text;
  return `${points.slice(0, PREVIEW_CHARS - 1).join("")}…`;
}

export function previewRefs(steps: readonly StepView[]): string[] {
  const refs: string[] = [];
  for (const step of [...steps].sort((a, b) => a.seq - b.seq).slice(0, PREVIEW_STEP_LIMIT)) {
    if (step.outputRef !== null && !refs.includes(step.outputRef)) refs.push(step.outputRef);
  }
  return refs;
}

export interface PreviewQueue {
  enqueue(refs: readonly string[]): void;
}

export function createPreviewQueue(
  _work: (ref: string) => Promise<void>,
  _limit?: number,
): PreviewQueue {
  return {
    enqueue(_refs: readonly string[]): void {},
  };
}

export interface RunRowView {
  id: string;
  linkName: string;
  flowId: string;
  mode: string;
  state: string;
  tone: Tone;
  started: string;
  duration: string;
  startedBy: string;
}

export function runRowView(
  run: RunView,
  names: ReadonlyMap<string, string>,
  nowMs: number,
): RunRowView {
  const startedIso = run.startedAt ?? run.createdAt;
  return {
    id: run.id,
    linkName: runLinkName(run.id),
    flowId: run.flowId,
    mode: run.mode,
    state: run.state,
    tone: runStateTone(run.state),
    started: formatAgo(startedIso, nowMs),
    duration: runDuration(run, startedIso, nowMs),
    startedBy: personLabel(names, run.principal.userId),
  };
}

export interface DetailCell {
  text: string;
  iso: string | null;
}

export function detailCell(row: { term: string; value: string }): DetailCell {
  if (row.term === "Started" || row.term === "Ended") {
    const ms = Date.parse(row.value);
    if (Number.isFinite(ms)) return { text: formatInstant(row.value), iso: row.value };
  }
  return { text: row.value, iso: null };
}
