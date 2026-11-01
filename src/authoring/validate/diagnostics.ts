// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

import type { Layer } from "./types.ts";

export const DIAGNOSTICS_DOC_PATH: string = "";

export function diagnosticAnchor(_code: string): string {
  throw new Error("not implemented");
}

export function diagnosticLink(_code: string): string | null {
  throw new Error("not implemented");
}

export interface DiagnosticInfo {
  code: string;
  layer: Layer | null;
  severity: "error" | "warning";
  summary: string;
  fix: string;
}

export const DIAGNOSTICS: readonly DiagnosticInfo[] = [];

export function renderDiagnosticsDoc(): string {
  throw new Error("not implemented");
}
