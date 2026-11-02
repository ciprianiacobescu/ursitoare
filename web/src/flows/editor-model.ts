import type { SaveResult, VersionRow } from "./versions.ts";

export interface Baseline {
  text: string;
  version: VersionRow;
}

export function editorStatus(baseline: Baseline | null, text: string): string {
  if (baseline === null) return "Not saved yet.";
  const n = baseline.version.number;
  if (baseline.text !== text) return `Unsaved changes since version ${n}.`;
  const ok = baseline.version.validationOk;
  if (ok === null) return `Version ${n} saved. Not validated yet.`;
  return ok ? `Version ${n} saved and validated.` : `Version ${n} saved. Validation found errors.`;
}

export function planValidate(baseline: Baseline | null, text: string): "validate" | "save-first" {
  return baseline !== null && baseline.text === text ? "validate" : "save-first";
}

export function saveMessage(saved: SaveResult): string {
  const n = saved.version.number;
  return saved.created ? `Saved version ${n}.` : `Nothing to save: this text is already version ${n}.`;
}
