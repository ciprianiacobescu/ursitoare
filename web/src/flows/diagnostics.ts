// Signature stub (milestone scaffold, docs/decisions/0002): the change that owns this file implements it.

export interface IssueView {
  layer: "L1" | "L2" | "L3";
  code: string;
  node: string | null;
  path: string;
  message: string;
}

export interface ValidationView {
  ok: boolean;
  errors: IssueView[];
  warnings: IssueView[];
  layers_run: ("L1" | "L2" | "L3")[];
}

export interface DiagnosticRow {
  key: string;
  severity: "error" | "warning";
  code: string;
  message: string;
  where: string;
  href: string | null;
  linkText: string | null;
  path: string | null;
  position: { line: number; column: number } | null;
}

export const REPO_DOCS_BASE: string = "";

export function parseValidation(_raw: unknown): ValidationView | null {
  throw new Error("not implemented");
}

export function diagnosticHref(_code: string): string | null {
  throw new Error("not implemented");
}

export function diagnosticRows(_result: ValidationView): DiagnosticRow[] {
  throw new Error("not implemented");
}

export function textProblemRow(_error: unknown, _flowId: string): DiagnosticRow | null {
  throw new Error("not implemented");
}

export function diagnosticsSummary(_result: ValidationView, _validatedAt: string | null): string {
  throw new Error("not implemented");
}
