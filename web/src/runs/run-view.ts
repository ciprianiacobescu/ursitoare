// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Tone } from "../ui/tones.ts";
import type { PayloadLoad } from "./timeline.ts";
import type { RunState, RunView, StepView } from "./types.ts";

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
  _run: RunView,
  _names: ReadonlyMap<string, string>,
  _nowMs: number,
): RunHeaderView {
  return {
    stateText: "",
    tone: "neutral",
    flowId: "",
    mode: "",
    startedBy: "",
    started: "",
    startedIso: "",
    duration: "",
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
  _run: RunView,
  _names: ReadonlyMap<string, string>,
  _nowMs: number,
): RunRowView {
  return {
    id: "",
    linkName: "",
    flowId: "",
    mode: "",
    state: "",
    tone: "neutral",
    started: "",
    duration: "",
    startedBy: "",
  };
}

export interface DetailCell {
  text: string;
  iso: string | null;
}

export function detailCell(_row: { term: string; value: string }): DetailCell {
  return { text: "", iso: null };
}
