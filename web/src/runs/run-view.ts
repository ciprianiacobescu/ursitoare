// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import { personLabel } from "../people/people.ts";
import { formatAgo, formatDuration, formatInstant } from "../ui/format.ts";
import { runStateTone } from "../ui/tones.ts";
import type { Tone } from "../ui/tones.ts";
import { runLinkName } from "./pages.ts";
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
  _steps: readonly StepView[],
  _runState: RunState,
  _loads: ReadonlyMap<string, PayloadLoad>,
  _nowMs: number,
): StepRowView[] {
  return [];
}

export const PREVIEW_CHARS = 120;
export const PREVIEW_STEP_LIMIT = 50;
export const PREVIEW_CONCURRENCY = 4;

export function outputPreview(_ref: string | null, _load: PayloadLoad | undefined): string | null {
  return null;
}

export function previewRefs(_steps: readonly StepView[]): string[] {
  return [];
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
