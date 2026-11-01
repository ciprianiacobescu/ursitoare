import { ApiRequestError } from "../api/client.ts";
import { clip } from "../admin/shared.ts";

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

export const REPO_DOCS_BASE: string = "https://github.com/ciprianiacobescu/ursitoare/blob/main/";

const DIAGNOSTICS_DOC_PATH = "docs/authoring/diagnostics.md";
const CODE_PATTERN = /^[A-Z][A-Z0-9_]{1,63}$/;
const HREF_PATTERN = /^(L[123]_|W_)[A-Z0-9_]+$/;
const LAYERS: readonly string[] = ["L1", "L2", "L3"];
const MAX_MESSAGE_LENGTH = 300;

const NOT_OBJECT_MESSAGE =
  "The text must describe one flow: a mapping with keys such as flow, start and nodes.";
const OTHER_REASON_MESSAGE = "The text is not a flow document.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLayer(value: unknown): value is "L1" | "L2" | "L3" {
  return typeof value === "string" && LAYERS.includes(value);
}

function parseIssue(raw: unknown): IssueView | null {
  if (!isRecord(raw)) return null;
  const layer = raw["layer"];
  const code = raw["code"];
  const node = raw["node"];
  const path = raw["path"];
  const message = raw["message"];
  if (!isLayer(layer)) return null;
  if (typeof code !== "string" || !CODE_PATTERN.test(code)) return null;
  if (node !== null && typeof node !== "string") return null;
  if (typeof path !== "string") return null;
  if (typeof message !== "string") return null;
  return { layer, code, node, path, message };
}

function parseIssues(raw: unknown): IssueView[] | null {
  if (!Array.isArray(raw)) return null;
  const issues: IssueView[] = [];
  for (const item of raw) {
    const issue = parseIssue(item);
    if (issue === null) return null;
    issues.push(issue);
  }
  return issues;
}

function parseLayers(raw: unknown): ("L1" | "L2" | "L3")[] | null {
  if (!Array.isArray(raw)) return null;
  const layers: ("L1" | "L2" | "L3")[] = [];
  for (const item of raw) {
    if (!isLayer(item)) return null;
    layers.push(item);
  }
  return layers;
}

export function parseValidation(raw: unknown): ValidationView | null {
  if (!isRecord(raw)) return null;
  const ok = raw["ok"];
  if (typeof ok !== "boolean") return null;
  const errors = parseIssues(raw["errors"]);
  if (errors === null) return null;
  const warnings = parseIssues(raw["warnings"]);
  if (warnings === null) return null;
  const layersRun = parseLayers(raw["layers_run"]);
  if (layersRun === null) return null;
  return { ok, errors, warnings, layers_run: layersRun };
}

export function diagnosticHref(code: string): string | null {
  if (code === "INTERNAL_ERROR" || HREF_PATTERN.test(code)) {
    return `${REPO_DOCS_BASE}${DIAGNOSTICS_DOC_PATH}#${code.toLowerCase()}`;
  }
  return null;
}

function issueWhere(issue: IssueView): string {
  if (issue.node !== null) {
    return `Node ${issue.node} · ${issue.path}`;
  }
  return issue.path === "" ? "Whole flow" : issue.path;
}

function issueRow(
  issue: IssueView,
  severity: "error" | "warning",
  index: number,
): DiagnosticRow {
  const href = diagnosticHref(issue.code);
  return {
    key: `${severity}:${index}`,
    severity,
    code: issue.code,
    message: clip(issue.message, MAX_MESSAGE_LENGTH),
    where: issueWhere(issue),
    href,
    linkText: href === null ? null : `Guide for ${issue.code} (opens in a new tab)`,
    path: issue.path,
    position: null,
  };
}

export function diagnosticRows(result: ValidationView): DiagnosticRow[] {
  const rows: DiagnosticRow[] = [];
  result.errors.forEach((issue, index) => {
    rows.push(issueRow(issue, "error", index));
  });
  result.warnings.forEach((issue, index) => {
    rows.push(issueRow(issue, "warning", index));
  });
  return rows;
}

function parsePosition(details: Record<string, unknown>): { line: number; column: number } | null {
  const line = details["line"];
  const column = details["column"];
  if (typeof line !== "number" || typeof column !== "number") return null;
  if (!Number.isInteger(line) || !Number.isInteger(column)) return null;
  return { line, column };
}

function reasonMessage(reason: string, flowId: string): string {
  if (reason === "not_object") return NOT_OBJECT_MESSAGE;
  if (reason === "name_mismatch") {
    return `The flow key must be "${flowId}", the name of this flow.`;
  }
  return OTHER_REASON_MESSAGE;
}

export function textProblemRow(error: unknown, flowId: string): DiagnosticRow | null {
  if (!(error instanceof ApiRequestError)) return null;
  if (error.status !== 422 || error.code !== "FLOW_TEXT_INVALID") return null;
  if (!isRecord(error.details)) return null;
  const details = error.details;
  const reason = details["reason"];
  if (typeof reason !== "string") return null;

  if (reason === "parse") {
    const code = typeof details["code"] === "string" ? details["code"] : error.code;
    const rawMessage = details["message"];
    const message =
      typeof rawMessage === "string" && rawMessage !== ""
        ? clip(rawMessage, MAX_MESSAGE_LENGTH)
        : `The flow text is not a readable flow document (${code}).`;
    const position = parsePosition(details);
    return {
      key: "text:0",
      severity: "error",
      code,
      message,
      where: position === null ? "Whole text" : `Line ${position.line}, column ${position.column}`,
      href: null,
      linkText: null,
      path: null,
      position,
    };
  }

  return {
    key: "text:0",
    severity: "error",
    code: "FLOW_TEXT_INVALID",
    message: reasonMessage(reason, flowId),
    where: "Whole text",
    href: null,
    linkText: null,
    path: null,
    position: null,
  };
}

function formatAt(validatedAt: string): string {
  return `${validatedAt.slice(0, 19).replace("T", " ")} UTC`;
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function diagnosticsSummary(result: ValidationView, validatedAt: string | null): string {
  const verdict = result.ok ? "Valid" : "Not valid";
  const errors = plural(result.errors.length, "error");
  const warnings = plural(result.warnings.length, "warning");
  const layers = result.layers_run.join(", ");
  const base = `${verdict}. ${errors}, ${warnings}. Layers run: ${layers}.`;
  return validatedAt === null ? base : `${base} Checked ${formatAt(validatedAt)}.`;
}
